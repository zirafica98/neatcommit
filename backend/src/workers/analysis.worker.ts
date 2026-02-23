import { Worker, Job } from 'bullmq';
import env from '../config/env';
import { logger } from '../utils/logger';
import { AnalyzePRJob, AnalyzeBranchJob, AnalyzeGitLabMRJob, AnalyzeBitbucketPRJob } from '../types/jobs';
import {
  getPullRequestFiles,
  getCompareFiles,
  getFileContent,
  createCommitStatus,
} from '../services/github.service';
import type { PRDiff } from '../services/github.service';
import { analyzeFiles } from '../services/analysis.service';
import { postAnalysisComments } from '../services/github-comment.service';
import prisma from '../config/database';
import { isLanguageSupported } from '../utils/language-detector';
import {
  sendReviewCompletedNotification,
  sendQualityGateFailedNotification,
} from '../services/notification.service';
import {
  parseRepoConfig,
  isPathIgnored,
  filterIssuesByCategories,
  applyRulesConfig,
  computeQualityGatePassed,
  RepoConfig,
} from '../config/repo-config';
import {
  computeRemediationMinutes,
  computeMaintainabilityGrade,
} from '../services/maintainability.service';
import * as gitlab from '../providers/gitlab/gitlab-provider';
import * as bitbucket from '../providers/bitbucket/bitbucket-provider';
import { formatSummaryComment } from '../utils/comment-formatter';

logger.info('Creating analysis worker...');

async function processGitLabMRJob(job: Job<AnalyzeGitLabMRJob>) {
  const { installationId, repositoryId, projectId, mrIid, sha, branchId } = job.data;

  const installation = await prisma.installation.findUnique({
    where: { id: installationId },
  });
  if (!installation?.gitlabAccessToken) {
    throw new Error(`GitLab installation or token not found: ${installationId}`);
  }

  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
  });
  if (!repository) {
    throw new Error(`Repository not found: ${repositoryId}`);
  }

  const token = installation.gitlabAccessToken;

  let repoConfig: RepoConfig = parseRepoConfig(null);
  try {
    const configRaw = await gitlab.getFileContent(token, projectId, '.neatcommit.yml', sha);
    repoConfig = parseRepoConfig(configRaw);
  } catch {
    // no config
  }

  const prFiles = await gitlab.getMergeRequestFiles(token, projectId, mrIid, sha);
  const supportedFiles = prFiles.filter((file) => {
    if (file.status === 'removed') return false;
    if (isPathIgnored(file.filename, repoConfig)) return false;
    return isLanguageSupported(file.filename);
  });

  if (supportedFiles.length === 0) {
    const emptyReview = await prisma.review.findUnique({ where: { githubPrId: branchId } });
    if (emptyReview) {
      await prisma.review.update({
        where: { id: emptyReview.id },
        data: {
          status: 'completed',
          securityScore: 100,
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          completedAt: new Date(),
          qualityGatePassed: true,
          maintainabilityGrade: 'A',
          remediationMinutes: 0,
        },
      });
    }
    await gitlab.createCommitStatus(token, projectId, sha, 'success', 'Quality gate passed');
    return { success: true, analyzedFiles: 0 };
  }

  const filesToAnalyze = await Promise.all(
    supportedFiles.map(async (file) => {
      try {
        const content = await gitlab.getFileContent(token, projectId, file.filename, sha);
        return { code: content, filename: file.filename };
      } catch {
        return null;
      }
    })
  );
  const validFiles = filesToAnalyze.filter(
    (f): f is { code: string; filename: string } => f !== null
  );
  if (validFiles.length === 0) {
    return { success: true, analyzedFiles: 0 };
  }

  let analysisResults = await analyzeFiles(validFiles, { repoConfig });
  analysisResults = analysisResults.map((result) => {
    let issues = filterIssuesByCategories(result.allIssues, repoConfig);
    issues = applyRulesConfig(issues, repoConfig);
    return { ...result, allIssues: issues };
  });

  const review = await prisma.review.findUnique({ where: { githubPrId: branchId } });
  if (!review) {
    throw new Error(`Review not found: ${branchId}`);
  }

  const allIssues = analysisResults.flatMap((r) => r.allIssues);
  const criticalCount = allIssues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = allIssues.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = allIssues.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = allIssues.filter((i) => i.severity === 'LOW').length;
  const infoCount = allIssues.filter((i) => i.severity === 'INFO').length;
  const avgScore = analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length;
  const qualityGatePassed = computeQualityGatePassed(repoConfig, criticalCount, avgScore);
  const remediationMinutes = computeRemediationMinutes({
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    info: infoCount,
  });
  const maintainabilityGrade = computeMaintainabilityGrade(remediationMinutes);

  await prisma.review.update({
    where: { id: review.id },
    data: {
      status: 'completed',
      securityScore: Math.round(avgScore),
      totalIssues: allIssues.length,
      criticalIssues: criticalCount,
      highIssues: highCount,
      mediumIssues: mediumCount,
      lowIssues: lowCount,
      completedAt: new Date(),
      qualityGatePassed,
      maintainabilityGrade,
      remediationMinutes,
    },
  });

  for (const result of analysisResults) {
    for (const issue of result.allIssues) {
      await prisma.issue.create({
        data: {
          reviewId: review.id,
          filePath: result.filename,
          line: issue.line,
          column: issue.column,
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          suggestedFix: issue.suggestedFix,
          codeSnippet: issue.codeSnippet,
          cweId: issue.cweId,
          owaspCategory: issue.owaspCategory,
        },
      });
    }
  }

  if (review.userId) {
    try {
      const user = await prisma.user.findUnique({ where: { id: review.userId } });
      if (user?.email) {
        await sendReviewCompletedNotification(user.email, {
          repositoryName: repository.fullName,
          prTitle: review.githubPrTitle,
          prUrl: review.githubPrUrl,
          securityScore: Math.round(avgScore),
          totalIssues: allIssues.length,
          criticalIssues: criticalCount,
          highIssues: highCount,
        });
        if (!qualityGatePassed) {
          await sendQualityGateFailedNotification(user.email, {
            repositoryName: repository.fullName,
            prTitle: review.githubPrTitle,
            prUrl: review.githubPrUrl,
            securityScore: Math.round(avgScore),
            criticalIssues: criticalCount,
            message: criticalCount > 0 ? 'Critical issues must be resolved before merge.' : 'Minimum score threshold not met.',
          });
        }
      }
    } catch (notificationError) {
      logger.error('GitLab MR notification failed', { reviewId: review.id, error: notificationError });
    }
  }

  const summaryBody = formatSummaryComment(analysisResults, mrIid, { qualityGatePassed });
  await gitlab.postMRComment(token, projectId, mrIid, summaryBody);
  await gitlab.createCommitStatus(
    token,
    projectId,
    sha,
    qualityGatePassed ? 'success' : 'failed',
    qualityGatePassed ? 'Quality gate passed' : 'Quality gate failed'
  );

  logger.info('GitLab MR analysis completed', { reviewId: review.id, mrIid });
  return {
    success: true,
    analyzedFiles: analysisResults.length,
    totalIssues: allIssues.length,
  };
}

async function processGitLabMRJobSafe(job: Job<AnalyzeGitLabMRJob>) {
  try {
    return await processGitLabMRJob(job);
  } catch (error) {
    const { installationId, projectId, sha, branchId } = job.data;
    try {
      const review = await prisma.review.findUnique({ where: { githubPrId: branchId } });
      if (review) {
        await prisma.review.update({
          where: { id: review.id },
          data: { status: 'failed' },
        });
      }
      const installation = await prisma.installation.findUnique({
        where: { id: installationId },
      });
      if (installation?.gitlabAccessToken) {
        await gitlab.createCommitStatus(
          installation.gitlabAccessToken,
          projectId,
          sha,
          'failed',
          'Analysis failed'
        );
      }
    } catch (dbError) {
      logger.error('Failed to update GitLab review status on error', { error: dbError });
    }
    throw error;
  }
}

async function processBitbucketPRJob(job: Job<AnalyzeBitbucketPRJob>) {
  const { installationId, repositoryId, workspace, repoSlug, prId, sha, branchId } = job.data;

  const installation = await prisma.installation.findUnique({
    where: { id: installationId },
  });
  if (!installation?.bitbucketAccessToken) {
    throw new Error(`Bitbucket installation or token not found: ${installationId}`);
  }
  const username = installation.bitbucketUsername || installation.accountLogin || '';

  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
  });
  if (!repository) {
    throw new Error(`Repository not found: ${repositoryId}`);
  }

  const token = installation.bitbucketAccessToken;

  let repoConfig: RepoConfig = parseRepoConfig(null);
  try {
    const configRaw = await bitbucket.getFileContent(username, token, workspace, repoSlug, '.neatcommit.yml', sha);
    repoConfig = parseRepoConfig(configRaw);
  } catch {
    // no config
  }

  const prFiles = await bitbucket.getPullRequestFiles(username, token, workspace, repoSlug, prId, sha);
  const supportedFiles = prFiles.filter((file) => {
    if (file.status === 'removed') return false;
    if (isPathIgnored(file.filename, repoConfig)) return false;
    return isLanguageSupported(file.filename);
  });

  if (supportedFiles.length === 0) {
    const emptyReview = await prisma.review.findUnique({ where: { githubPrId: branchId } });
    if (emptyReview) {
      await prisma.review.update({
        where: { id: emptyReview.id },
        data: {
          status: 'completed',
          securityScore: 100,
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          completedAt: new Date(),
          qualityGatePassed: true,
          maintainabilityGrade: 'A',
          remediationMinutes: 0,
        },
      });
    }
    await bitbucket.createCommitStatus(username, token, workspace, repoSlug, sha, 'SUCCESSFUL', 'Quality gate passed');
    return { success: true, analyzedFiles: 0 };
  }

  const filesToAnalyze = await Promise.all(
    supportedFiles.map(async (file) => {
      try {
        const content = await bitbucket.getFileContent(username, token, workspace, repoSlug, file.filename, sha);
        return { code: content, filename: file.filename };
      } catch {
        return null;
      }
    })
  );
  const validFiles = filesToAnalyze.filter(
    (f): f is { code: string; filename: string } => f !== null
  );
  if (validFiles.length === 0) {
    return { success: true, analyzedFiles: 0 };
  }

  let analysisResults = await analyzeFiles(validFiles, { repoConfig });
  analysisResults = analysisResults.map((result) => {
    let issues = filterIssuesByCategories(result.allIssues, repoConfig);
    issues = applyRulesConfig(issues, repoConfig);
    return { ...result, allIssues: issues };
  });

  const review = await prisma.review.findUnique({ where: { githubPrId: branchId } });
  if (!review) {
    throw new Error(`Review not found: ${branchId}`);
  }

  const allIssues = analysisResults.flatMap((r) => r.allIssues);
  const criticalCount = allIssues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = allIssues.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = allIssues.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = allIssues.filter((i) => i.severity === 'LOW').length;
  const infoCount = allIssues.filter((i) => i.severity === 'INFO').length;
  const avgScore = analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length;
  const qualityGatePassed = computeQualityGatePassed(repoConfig, criticalCount, avgScore);
  const remediationMinutes = computeRemediationMinutes({
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    info: infoCount,
  });
  const maintainabilityGrade = computeMaintainabilityGrade(remediationMinutes);

  await prisma.review.update({
    where: { id: review.id },
    data: {
      status: 'completed',
      securityScore: Math.round(avgScore),
      totalIssues: allIssues.length,
      criticalIssues: criticalCount,
      highIssues: highCount,
      mediumIssues: mediumCount,
      lowIssues: lowCount,
      completedAt: new Date(),
      qualityGatePassed,
      maintainabilityGrade,
      remediationMinutes,
    },
  });

  for (const result of analysisResults) {
    for (const issue of result.allIssues) {
      await prisma.issue.create({
        data: {
          reviewId: review.id,
          filePath: result.filename,
          line: issue.line,
          column: issue.column,
          severity: issue.severity,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          suggestedFix: issue.suggestedFix,
          codeSnippet: issue.codeSnippet,
          cweId: issue.cweId,
          owaspCategory: issue.owaspCategory,
        },
      });
    }
  }

  if (review.userId) {
    try {
      const user = await prisma.user.findUnique({ where: { id: review.userId } });
      if (user?.email) {
        await sendReviewCompletedNotification(user.email, {
          repositoryName: repository.fullName,
          prTitle: review.githubPrTitle,
          prUrl: review.githubPrUrl,
          securityScore: Math.round(avgScore),
          totalIssues: allIssues.length,
          criticalIssues: criticalCount,
          highIssues: highCount,
        });
        if (!qualityGatePassed) {
          await sendQualityGateFailedNotification(user.email, {
            repositoryName: repository.fullName,
            prTitle: review.githubPrTitle,
            prUrl: review.githubPrUrl,
            securityScore: Math.round(avgScore),
            criticalIssues: criticalCount,
            message: criticalCount > 0 ? 'Critical issues must be resolved before merge.' : 'Minimum score threshold not met.',
          });
        }
      }
    } catch (notificationError) {
      logger.error('Bitbucket PR notification failed', { reviewId: review.id, error: notificationError });
    }
  }

  const summaryBody = formatSummaryComment(analysisResults, prId, { qualityGatePassed });
  await bitbucket.postPRComment(username, token, workspace, repoSlug, prId, summaryBody);
  await bitbucket.createCommitStatus(
    username,
    token,
    workspace,
    repoSlug,
    sha,
    qualityGatePassed ? 'SUCCESSFUL' : 'FAILED',
    qualityGatePassed ? 'Quality gate passed' : 'Quality gate failed'
  );

  logger.info('Bitbucket PR analysis completed', { reviewId: review.id, prId });
  return {
    success: true,
    analyzedFiles: analysisResults.length,
    totalIssues: allIssues.length,
  };
}

async function processBitbucketPRJobSafe(job: Job<AnalyzeBitbucketPRJob>) {
  try {
    return await processBitbucketPRJob(job);
  } catch (error) {
    const { installationId, workspace, repoSlug, sha, branchId } = job.data;
    try {
      const review = await prisma.review.findUnique({ where: { githubPrId: branchId } });
      if (review) {
        await prisma.review.update({
          where: { id: review.id },
          data: { status: 'failed' },
        });
      }
      const installation = await prisma.installation.findUnique({
        where: { id: installationId },
      });
      if (installation?.bitbucketAccessToken && installation?.bitbucketUsername) {
        await bitbucket.createCommitStatus(
          installation.bitbucketUsername,
          installation.bitbucketAccessToken,
          workspace,
          repoSlug,
          sha,
          'FAILED',
          'Analysis failed'
        );
      }
    } catch (dbError) {
      logger.error('Failed to update Bitbucket review status on error', { error: dbError });
    }
    throw error;
  }
}

export const analysisWorker = new Worker(
  'code-analysis',
  async (job: Job<AnalyzePRJob | AnalyzeBranchJob | AnalyzeGitLabMRJob | AnalyzeBitbucketPRJob>) => {
    if (job.name === 'analyze-gitlab-mr') {
      return processGitLabMRJobSafe(job as Job<AnalyzeGitLabMRJob>);
    }
    if (job.name === 'analyze-bitbucket-pr') {
      return processBitbucketPRJobSafe(job as Job<AnalyzeBitbucketPRJob>);
    }

    const isBranchJob = job.name === 'analyze-branch';
    const data = job.data as AnalyzePRJob | AnalyzeBranchJob;
    const { owner, repo, installationId, sha } = data;
    const pullNumber = !isBranchJob ? (data as AnalyzePRJob).pullNumber : 0;
    const reviewLookupId = isBranchJob ? (data as AnalyzeBranchJob).branchId : (data as AnalyzePRJob).prId;

    logger.info(
      isBranchJob
        ? `Processing branch analysis for ${(job.data as AnalyzeBranchJob).ref} in ${owner}/${repo}`
        : `Processing analysis job for PR #${pullNumber} in ${owner}/${repo}`,
      { jobId: job.id, attempt: job.attemptsMade + 1 }
    );

    try {
      logger.info('Starting analysis', {
        owner,
        repo,
        ...(isBranchJob ? { ref: (job.data as AnalyzeBranchJob).ref } : { pullNumber }),
        installationId,
      });

      // 0. Repo config (.neatcommit.yml)
      let repoConfig: RepoConfig = parseRepoConfig(null);
      try {
        const configRaw = await getFileContent(
          installationId,
          owner,
          repo,
          '.neatcommit.yml',
          sha
        );
        repoConfig = parseRepoConfig(configRaw);
        logger.debug('Repo config loaded from .neatcommit.yml');
      } catch {
        // No file or error – use default
      }

      // 1. Get file list (PR or branch diff)
      let prFiles: PRDiff[];
      if (isBranchJob) {
        const { ref, baseRef } = job.data as AnalyzeBranchJob;
        const basehead = `${baseRef}...${ref}`;
        prFiles = await getCompareFiles(installationId, owner, repo, basehead);
      } else {
        prFiles = await getPullRequestFiles(installationId, owner, repo, (job.data as AnalyzePRJob).pullNumber);
      }

      logger.debug('PR files retrieved', {
        fileCount: prFiles.length,
      });

      // 2. Filtriraj po ignore paths i podržane jezike
      const supportedFiles = prFiles.filter((file) => {
        if (file.status === 'removed') return false;
        if (isPathIgnored(file.filename, repoConfig)) return false;
        return isLanguageSupported(file.filename);
      });

      if (supportedFiles.length === 0) {
        logger.info('No supported language files to analyze', {
          totalFiles: prFiles.length,
          supportedExtensions: prFiles.map(f => {
            const ext = f.filename.substring(f.filename.lastIndexOf('.'));
            return ext;
          }),
        });
        const emptyReview = await prisma.review.findUnique({
          where: { githubPrId: reviewLookupId },
        });
        if (emptyReview) {
          await prisma.review.update({
            where: { id: emptyReview.id },
            data: {
              status: 'completed',
              securityScore: 100,
              totalIssues: 0,
              criticalIssues: 0,
              highIssues: 0,
              mediumIssues: 0,
              lowIssues: 0,
              completedAt: new Date(),
              qualityGatePassed: true,
              maintainabilityGrade: 'A',
              remediationMinutes: 0,
            },
          });
        }
        return { success: true, analyzedFiles: 0 };
      }

      logger.info('Analyzing files', {
        totalFiles: prFiles.length,
        supportedFiles: supportedFiles.length,
        fileTypes: supportedFiles.map(f => {
          const ext = f.filename.substring(f.filename.lastIndexOf('.'));
          return ext;
        }),
      });

      // 3. Dohvati sadržaj fajlova i analiziraj
      const filesToAnalyze = await Promise.all(
        supportedFiles.map(async (file) => {
          try {
            // Dohvati fajl sa GitHub-a
            const content = await getFileContent(
              installationId,
              owner,
              repo,
              file.filename,
              sha
            );
            return {
              code: content,
              filename: file.filename,
            };
          } catch (error) {
            logger.warn('Failed to fetch file content', {
              filename: file.filename,
              error: error instanceof Error ? error.message : String(error),
            });
            return null;
          }
        })
      );

      // Filtriraj null vrednosti
      const validFiles = filesToAnalyze.filter(
        (file): file is { code: string; filename: string } => file !== null
      );

      if (validFiles.length === 0) {
        logger.warn('No valid files to analyze after fetching content');
        return { success: true, analyzedFiles: 0 };
      }

      // 4. Analiziraj fajlove (pass repoConfig for duplication settings)
      let analysisResults = await analyzeFiles(validFiles, { repoConfig });

      // 4b. Filtriraj issue-e po kategorijama i primeni rules (disable / severityOverrides)
      analysisResults = analysisResults.map((result) => {
        let issues = filterIssuesByCategories(result.allIssues, repoConfig);
        issues = applyRulesConfig(issues, repoConfig);
        return { ...result, allIssues: issues };
      });

      // 5. Save results to DB
      const review = await prisma.review.findUnique({
        where: {
          githubPrId: reviewLookupId,
        },
      });

      if (review) {
        // Agregiraj issue-e
        const allIssues = analysisResults.flatMap((result) => result.allIssues);
        const criticalCount = allIssues.filter((i) => i.severity === 'CRITICAL').length;
        const highCount = allIssues.filter((i) => i.severity === 'HIGH').length;
        const mediumCount = allIssues.filter((i) => i.severity === 'MEDIUM').length;
        const lowCount = allIssues.filter((i) => i.severity === 'LOW').length;
        const infoCount = allIssues.filter((i) => i.severity === 'INFO').length;
        const avgScore = analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length;
        const qualityGatePassed = computeQualityGatePassed(repoConfig, criticalCount, avgScore);
        const remediationMinutes = computeRemediationMinutes({
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
          info: infoCount,
        });
        const maintainabilityGrade = computeMaintainabilityGrade(remediationMinutes);

        // Ažuriraj review
        await prisma.review.update({
          where: { id: review.id },
          data: {
            status: 'completed',
            securityScore: Math.round(avgScore),
            totalIssues: allIssues.length,
            criticalIssues: criticalCount,
            highIssues: highCount,
            mediumIssues: mediumCount,
            lowIssues: lowCount,
            completedAt: new Date(),
            qualityGatePassed,
            maintainabilityGrade,
            remediationMinutes,
          },
        });

        // Sačuvaj issue-e u bazu
        for (const result of analysisResults) {
          for (const issue of result.allIssues) {
            await prisma.issue.create({
              data: {
                reviewId: review.id,
                filePath: result.filename,
                line: issue.line,
                column: issue.column,
                severity: issue.severity,
                category: issue.category,
                title: issue.title,
                description: issue.description,
                suggestedFix: issue.suggestedFix,
                codeSnippet: issue.codeSnippet,
                cweId: issue.cweId,
                owaspCategory: issue.owaspCategory,
              },
            });
          }
        }

        logger.info('Analysis results saved to database', {
          reviewId: review.id,
          totalIssues: allIssues.length,
          score: Math.round(avgScore),
        });

        // 6. Pošalji email notifikaciju ako postoji korisnik
        if (review.userId) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: review.userId },
            });
            const repository = await prisma.repository.findUnique({
              where: { id: review.repositoryId },
            });

            if (user?.email && repository) {
              await sendReviewCompletedNotification(user.email, {
                repositoryName: repository.fullName,
                prTitle: review.githubPrTitle,
                prUrl: review.githubPrUrl,
                securityScore: Math.round(avgScore),
                totalIssues: allIssues.length,
                criticalIssues: criticalCount,
              });
              if (!qualityGatePassed) {
                await sendQualityGateFailedNotification(user.email, {
                  repositoryName: repository.fullName,
                  prTitle: review.githubPrTitle,
                  prUrl: review.githubPrUrl,
                  securityScore: Math.round(avgScore),
                  criticalIssues: criticalCount,
                  message: criticalCount > 0 ? 'Critical issues must be resolved before merge.' : 'Minimum score threshold not met.',
                });
              }
            }
          } catch (notificationError) {
            logger.error('Failed to send notification', {
              reviewId: review.id,
              error: notificationError,
            });
            // Ne prekidaj proces ako notifikacija ne uspe
          }
        }

        // 7. For PR jobs: post comments and commit status. For branch jobs: commit status only.
        if (!isBranchJob && pullNumber) {
          try {
            const fileContentByPath = Object.fromEntries(
              validFiles.map((f) => [f.filename, f.code])
            );
            const commentResult = await postAnalysisComments(
              installationId,
              owner,
              repo,
              pullNumber,
              sha,
              analysisResults,
              review.id,
              { qualityGatePassed, fileContentByPath }
            );
            logger.info('Comments posted to PR', {
              summaryComment: commentResult.summaryCommentId ? 1 : 0,
              inlineComments: commentResult.inlineCommentsCount,
              total: commentResult.totalComments,
            });
          } catch (commentError) {
            logger.error('Failed to post comments to PR', {
              error: commentError instanceof Error ? commentError.message : String(commentError),
            });
          }
        }
        // 8. Set GitHub commit status (quality gate) for both PR and branch
        try {
          await createCommitStatus(
            installationId,
            owner,
            repo,
            sha,
            qualityGatePassed ? 'success' : 'failure',
            qualityGatePassed ? 'Quality gate passed' : 'Quality gate failed'
          );
        } catch (statusError) {
          logger.warn('Failed to create commit status', {
            error: statusError instanceof Error ? statusError.message : String(statusError),
          });
        }
      }

      logger.info(
        isBranchJob
          ? `Branch analysis completed for ${(job.data as AnalyzeBranchJob).ref}`
          : `Analysis job completed for PR #${pullNumber}`,
        { jobId: job.id, analyzedFiles: analysisResults.length }
      );

      return {
        success: true,
        analyzedFiles: analysisResults.length,
        totalIssues: analysisResults.reduce((sum, r) => sum + r.allIssues.length, 0),
      };
    } catch (error) {
      logger.error(
        isBranchJob ? 'Branch analysis job failed' : `Analysis job failed for PR #${pullNumber}`,
        error
      );
      try {
        const review = await prisma.review.findUnique({
          where: { githubPrId: reviewLookupId },
        });

        if (review) {
          await prisma.review.update({
            where: { id: review.id },
            data: {
              status: 'failed',
            },
          });
        }
      } catch (dbError) {
        logger.error('Failed to update review status', { error: dbError });
      }

      throw error;
    }
  },
  {
    connection: {
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT, 10),
      password: env.REDIS_PASSWORD || undefined,
    },
    concurrency: 5, // Process 5 PRs simultaneously
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute
    },
  }
);

analysisWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

analysisWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

analysisWorker.on('error', (err) => {
  logger.error('Worker error:', err);
});

// Log when worker is ready
analysisWorker.on('ready', () => {
  logger.info('✅ Analysis worker ready and listening for jobs');
});
