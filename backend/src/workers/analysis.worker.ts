import { Worker, Job } from 'bullmq';
import env from '../config/env';
import { logger } from '../utils/logger';
import { AnalyzePRJob } from '../types/jobs';
import { getPullRequestFiles, getFileContent } from '../services/github.service';
import { analyzeFiles } from '../services/analysis.service';
import { postAnalysisComments } from '../services/github-comment.service';
import prisma from '../config/database';
import { isLanguageSupported } from '../utils/language-detector';
import { sendReviewCompletedNotification } from '../services/notification.service';

logger.info('Creating analysis worker...');

export const analysisWorker = new Worker(
  'code-analysis',
  async (job: Job<AnalyzePRJob>) => {
    const { owner, repo, pullNumber } = job.data;

    logger.info(`Processing analysis job for PR #${pullNumber} in ${owner}/${repo}`, {
      jobId: job.id,
      attempt: job.attemptsMade + 1,
    });

    try {
      const { installationId, sha } = job.data;

      logger.info('Starting PR analysis', {
        owner,
        repo,
        pullNumber,
        installationId,
      });

      // 1. Dohvati PR fajlove sa GitHub-a
      const prFiles = await getPullRequestFiles(installationId, owner, repo, pullNumber);
      
      logger.debug('PR files retrieved', {
        fileCount: prFiles.length,
      });

      // 2. Filtriraj samo podržane jezike (koristi Language Detector)
      const supportedFiles = prFiles.filter((file) => {
        // Preskoči deleted fajlove
        if (file.status === 'removed') {
          return false;
        }
        // Proveri da li je jezik podržan
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
      const analysisResults = await analyzeFiles(validFiles);

      // 5. Sačuvaj rezultate u bazu
      const review = await prisma.review.findUnique({
        where: {
          githubPrId: job.data.prId,
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
            }
          } catch (notificationError) {
            logger.error('Failed to send notification', {
              reviewId: review.id,
              error: notificationError,
            });
            // Ne prekidaj proces ako notifikacija ne uspe
          }
        }

        // 7. Postavi komentare na GitHub PR
        try {
          const commentResult = await postAnalysisComments(
            installationId,
            owner,
            repo,
            pullNumber,
            sha,
            analysisResults,
            review.id
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
          // Ne bacaj grešku - analiza je završena, komentari su opcioni
        }
      }

      logger.info(`Analysis job completed for PR #${pullNumber}`, {
        jobId: job.id,
        analyzedFiles: analysisResults.length,
      });

      return {
        success: true,
        analyzedFiles: analysisResults.length,
        totalIssues: analysisResults.reduce((sum, r) => sum + r.allIssues.length, 0),
      };
    } catch (error) {
      logger.error(`Analysis job failed for PR #${pullNumber}:`, error);
      
      // Ažuriraj review status na failed
      try {
        const review = await prisma.review.findUnique({
          where: {
            githubPrId: job.data.prId,
          },
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
