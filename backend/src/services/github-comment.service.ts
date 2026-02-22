/**
 * GitHub Comment Service
 * 
 * Šta radi:
 * - Postavlja komentare na GitHub PR
 * - Postavlja summary komentar
 * - Postavlja inline komentare na specifične linije
 * - Upravlja komentarima (update, delete)
 * 
 * Kako funkcioniše:
 * 1. Formatira komentare (koristi comment-formatter)
 * 2. Postavlja komentare na GitHub PR
 * 3. Čuva reference u bazi
 */

import { createPRComment, createReviewComment } from './github.service';
import {
  formatSummaryComment,
  formatInlineCommentWithSuggestion,
  getReplacementLineForIssue,
  formatFileComment,
} from '../utils/comment-formatter';
import { AnalysisResult } from './analysis.service';
import { logger } from '../utils/logger';
import prisma from '../config/database';

export interface CommentPostResult {
  summaryCommentId?: number;
  inlineCommentsCount: number;
  totalComments: number;
}

export interface PostAnalysisCommentsOptions {
  qualityGatePassed?: boolean;
  fileContentByPath?: FileContentMap;
}

/**
 * Map filename -> file content (za izračunavanje replacement linije za suggestion block).
 */
export type FileContentMap = Record<string, string>;

/**
 * Postavlja sve komentare na PR
 *
 * @param installationId - GitHub installation ID
 * @param owner - Repo owner
 * @param repo - Repo name
 * @param pullNumber - PR number
 * @param commitId - Commit SHA
 * @param results - Rezultati analize
 * @param reviewId - Review ID iz baze
 * @param options - qualityGatePassed i fileContentByPath (za GitHub Apply suggestion)
 * @returns Rezultat postavljanja komentara
 */
export async function postAnalysisComments(
  installationId: number,
  owner: string,
  repo: string,
  pullNumber: number,
  commitId: string,
  results: AnalysisResult[],
  reviewId: string,
  options?: PostAnalysisCommentsOptions
): Promise<CommentPostResult> {
  logger.info('Posting analysis comments to PR', {
    owner,
    repo,
    pullNumber,
    fileCount: results.length,
  });

  const commentResult: CommentPostResult = {
    inlineCommentsCount: 0,
    totalComments: 0,
  };

  try {
    // 1. Postavi summary komentar
    const summaryComment = formatSummaryComment(results, pullNumber, {
      qualityGatePassed: options?.qualityGatePassed,
    });
    const summaryCommentResponse = await createPRComment(
      installationId,
      owner,
      repo,
      pullNumber,
      summaryComment
    );

    commentResult.summaryCommentId = summaryCommentResponse.id;
    commentResult.totalComments = 1;

    // Sačuvaj summary komentar u bazi
    await prisma.reviewComment.create({
      data: {
        reviewId,
        githubCommentId: summaryCommentResponse.id.toString(),
        filePath: 'summary',
        body: summaryComment,
      },
    });

    logger.debug('Summary comment posted', {
      commentId: summaryCommentResponse.id,
    });

    // 2. Postavi inline komentare za kritične issue-e
    // Postavi samo CRITICAL i HIGH issue-e kao inline komentare
    const criticalAndHighIssues = results.flatMap((result) =>
      result.allIssues
        .filter((issue) => issue.severity === 'CRITICAL' || issue.severity === 'HIGH')
        .filter((issue) => issue.line !== undefined) // Samo issue-e sa linijom
        .map((issue) => ({
          ...issue,
          filename: result.filename,
        }))
    );

    // Ograniči na prvih 20 inline komentara (GitHub limit)
    const issuesToComment = criticalAndHighIssues.slice(0, 20);

    const fileContentByPath: FileContentMap = options?.fileContentByPath ?? {};

    for (const issue of issuesToComment) {
      try {
        let replacementLine: string | undefined;
        const content = fileContentByPath[issue.filename];
        if (content && issue.line) {
          const lines = content.split(/\r?\n/);
          const lineContent = lines[issue.line - 1];
          if (lineContent !== undefined) {
            replacementLine = getReplacementLineForIssue(issue.title, lineContent);
          }
        }
        const inlineComment = formatInlineCommentWithSuggestion(
          issue,
          issue.codeSnippet,
          replacementLine
        );

        const reviewCommentResponse = await createReviewComment(
          installationId,
          owner,
          repo,
          pullNumber,
          commitId,
          inlineComment,
          issue.filename,
          issue.line!
        );

        commentResult.inlineCommentsCount++;
        commentResult.totalComments++;

        // Sačuvaj inline komentar u bazi
        await prisma.reviewComment.create({
          data: {
            reviewId,
            githubCommentId: reviewCommentResponse.id.toString(),
            filePath: issue.filename,
            line: issue.line,
            body: inlineComment,
          },
        });

        logger.debug('Inline comment posted', {
          filename: issue.filename,
          line: issue.line,
          commentId: reviewCommentResponse.id,
        });

        // Mali delay između komentara da ne preopteretimo GitHub API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        // Ako je greška "could not be resolved", to je normalno - linija nije u diff-u
        const isLineNotInDiff = error?.status === 422 && 
          error?.message?.includes('could not be resolved');
        
        if (isLineNotInDiff) {
          // Ovo je normalno ponašanje - ne logujemo kao grešku
          logger.debug('ℹ️ Skipping inline comment - line not in PR diff', {
            filename: issue.filename,
            line: issue.line,
            reason: 'Line was not changed in this PR',
          });
        } else {
          // Prava greška - logujemo kao warning
          logger.warn('⚠️ Failed to post inline comment', {
            filename: issue.filename,
            line: issue.line,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        // Nastavi sa sledećim komentarom
      }
    }

    logger.info('All comments posted successfully', {
      summaryComment: 1,
      inlineComments: commentResult.inlineCommentsCount,
      total: commentResult.totalComments,
    });

    return commentResult;
  } catch (error) {
    logger.error('Failed to post comments', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Postavlja komentar za specifičan fajl
 * 
 * @param installationId - GitHub installation ID
 * @param owner - Repo owner
 * @param repo - Repo name
 * @param pullNumber - PR number
 * @param filename - Ime fajla
 * @param issues - Issue-i za taj fajl
 * @param reviewId - Review ID iz baze
 */
export async function postFileComment(
  installationId: number,
  owner: string,
  repo: string,
  pullNumber: number,
  filename: string,
  issues: AnalysisResult['allIssues'],
  reviewId: string
): Promise<void> {
  if (issues.length === 0) {
    return;
  }

  try {
    const fileComment = formatFileComment(filename, issues);

    const commentResponse = await createPRComment(
      installationId,
      owner,
      repo,
      pullNumber,
      fileComment
    );

    // Sačuvaj komentar u bazi
    await prisma.reviewComment.create({
      data: {
        reviewId,
        githubCommentId: commentResponse.id.toString(),
        filePath: filename,
        body: fileComment,
      },
    });

    logger.debug('File comment posted', {
      filename,
      commentId: commentResponse.id,
    });
  } catch (error) {
    logger.error('Failed to post file comment', {
      filename,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
