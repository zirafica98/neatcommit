import { getInstallationOctokit } from './github-app.service';
import { logger } from '../utils/logger';

/**
 * GitHub Service
 * 
 * Šta radi:
 * - Komunikacija sa GitHub API-jem
 * - Dobijanje PR podataka, diff-a, fajlova
 * - Postavljanje komentara na PR-ove
 * 
 * Kako funkcioniše:
 * - Koristi installation token za pristup GitHub API-ju
 * - Wrapper oko Octokit API-ja za jednostavnije korišćenje
 */

export interface PRDiff {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
}

export interface PRFile {
  filename: string;
  content: string;
  language: string;
}

/**
 * Dobija podatke o Pull Request-u
 * 
 * @param installationId - GitHub installation ID
 * @param owner - Repo owner
 * @param repo - Repo name
 * @param pullNumber - PR number
 */
export async function getPullRequest(
  installationId: number,
  owner: string,
  repo: string,
  pullNumber: number
) {
  try {
    const octokit = await getInstallationOctokit(installationId);

    if (!octokit.rest) {
      throw new Error('Octokit instance does not have rest property');
    }

    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    logger.debug('PR data retrieved', {
      owner,
      repo,
      pullNumber,
      title: pr.title,
      state: pr.state,
    });

    return pr;
  } catch (error) {
    logger.error('Failed to get pull request:', error);
    throw error;
  }
}

/**
 * Dobija listu fajlova u PR-u sa diff podacima
 * 
 * @param installationId - GitHub installation ID
 * @param owner - Repo owner
 * @param repo - Repo name
 * @param pullNumber - PR number
 */
export async function getPullRequestFiles(
  installationId: number,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PRDiff[]> {
  try {
    const octokit = await getInstallationOctokit(installationId);

    // Proveri da li octokit ima rest property
    if (!octokit || typeof (octokit as any).rest === 'undefined') {
      logger.error('❌ Octokit does not have rest property', {
        installationId,
        owner,
        repo,
        pullNumber,
        octokitType: typeof octokit,
        octokitKeys: octokit ? Object.keys(octokit) : [],
      });
      throw new Error('Octokit instance does not have rest property');
    }

    const { data: files } = await (octokit as any).rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });

    logger.debug('PR files retrieved', {
      owner,
      repo,
      pullNumber,
      fileCount: files.length,
    });

    return files.map((file: any) => ({
      filename: file.filename,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch || '',
      status: file.status as PRDiff['status'],
    }));
  } catch (error) {
    logger.error('Failed to get PR files:', error);
    throw error;
  }
}

/**
 * Dobija sadržaj fajla sa GitHub-a
 * 
 * @param installationId - GitHub installation ID
 * @param owner - Repo owner
 * @param repo - Repo name
 * @param path - File path
 * @param ref - Git reference (branch, commit SHA)
 */
export async function getFileContent(
  installationId: number,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string> {
  try {
    const octokit = await getInstallationOctokit(installationId);

    if (!octokit.rest) {
      throw new Error('Octokit instance does not have rest property');
    }

    const { data: file } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(file) || file.type !== 'file') {
      throw new Error(`Path ${path} is not a file`);
    }

    // Decode base64 content
    const content = Buffer.from(file.content, 'base64').toString('utf-8');

    logger.debug('File content retrieved', {
      owner,
      repo,
      path,
      size: content.length,
    });

    return content;
  } catch (error) {
    logger.error('Failed to get file content:', error);
    throw error;
  }
}

/**
 * Postavlja komentar na PR
 * 
 * @param installationId - GitHub installation ID
 * @param owner - Repo owner
 * @param repo - Repo name
 * @param pullNumber - PR number
 * @param body - Comment body (Markdown)
 */
export async function createPRComment(
  installationId: number,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
) {
  try {
    const octokit = await getInstallationOctokit(installationId);

    if (!octokit.rest) {
      throw new Error('Octokit instance does not have rest property');
    }

    const { data: comment } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body,
    });

    logger.info('PR comment created', {
      owner,
      repo,
      pullNumber,
      commentId: comment.id,
    });

    return comment;
  } catch (error) {
    logger.error('Failed to create PR comment:', error);
    throw error;
  }
}

/**
 * Postavlja review komentar na određenu liniju koda
 * 
 * @param installationId - GitHub installation ID
 * @param owner - Repo owner
 * @param repo - Repo name
 * @param pullNumber - PR number
 * @param commitId - Commit SHA
 * @param body - Comment body
 * @param path - File path
 * @param line - Line number
 */
export async function createReviewComment(
  installationId: number,
  owner: string,
  repo: string,
  pullNumber: number,
  commitId: string,
  body: string,
  path: string,
  line: number
) {
  try {
    const octokit = await getInstallationOctokit(installationId);

    if (!octokit.rest) {
      throw new Error('Octokit instance does not have rest property');
    }

    // Pokušaj da postaviš komentar sa 'RIGHT' side (new line number)
    // GitHub koristi 'RIGHT' za linije u novoj verziji fajla
    const { data: comment } = await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: commitId,
      body,
      path,
      line,
      side: 'RIGHT', // RIGHT = new line number (after changes)
    });

    logger.info('Review comment created', {
      owner,
      repo,
      pullNumber,
      path,
      line,
      commentId: comment.id,
    });

    return comment;
  } catch (error: any) {
    // Ako je greška "could not be resolved", linija verovatno nije u diff-u
    // Ovo je NORMALNO ponašanje - neke linije jednostavno nisu promenjene u PR-u
    if (error?.status === 422 && error?.message?.includes('could not be resolved')) {
      logger.debug('ℹ️ Skipping inline comment - line not in PR diff (this is normal)', {
        owner,
        repo,
        pullNumber,
        path,
        line,
        reason: 'Line was not changed in this PR, so GitHub cannot attach a comment to it',
      });
    } else {
      logger.error('❌ Failed to create review comment:', error);
    }
    throw error;
  }
}

/**
 * Dobija listu repozitorijuma za instalaciju
 * 
 * @param installationId - GitHub installation ID
 */
export async function getInstallationRepositories(installationId: number) {
  try {
    const octokit = await getInstallationOctokit(installationId);

    if (!octokit.rest) {
      throw new Error('Octokit instance does not have rest property');
    }

    const { data } = await octokit.rest.apps.listInstallationReposForAuthenticatedUser({
      installation_id: installationId,
    });

    logger.debug('Installation repositories retrieved', {
      installationId,
      repoCount: data.repositories.length,
    });

    return data.repositories;
  } catch (error) {
    logger.error('Failed to get installation repositories:', error);
    throw error;
  }
}
