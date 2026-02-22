import { Worker, Job } from 'bullmq';
import env from '../config/env';
import { logger } from '../utils/logger';
import { AnalyzePRJob, AnalyzeBranchJob } from '../types/jobs';
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

logger.info('Creating analysis worker...');

export const analysisWorker = new Worker(
  'code-analysis',
  async (job: Job<AnalyzePRJob | AnalyzeBranchJob>) => {
    const isBranchJob = job.name === 'analyze-branch';
    const { owner, repo, installationId, sha } = job.data;
    const pullNumber = !isBranchJob ? (job.data as AnalyzePRJob).pullNumber : 0;
    const reviewLookupId = isBranchJob ? (job.data as AnalyzeBranchJob).branchId : (job.data as AnalyzePRJob).prId;

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

      // 4. Analiziraj fajlove
      let analysisResults = await analyzeFiles(validFiles);

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
        const avgScore = analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length;
        const qualityGatePassed = computeQualityGatePassed(repoConfig, criticalCount, avgScore);

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
