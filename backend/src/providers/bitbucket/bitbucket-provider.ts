/**
 * Bitbucket provider – scaffold za Pull Request analizu.
 * TODO: Bitbucket OAuth/App, webhook za PR, dohvat fajlova, postavljanje komentara i statusa.
 */

import type { ProviderPRDiff, ProviderPRInfo } from '../types';

export async function getPullRequestFiles(
  _workspace: string,
  _repoSlug: string,
  _prId: number,
  _ref: string
): Promise<ProviderPRDiff[]> {
  // TODO: Bitbucket API – GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}/diff
  return [];
}

export async function getFileContent(
  _workspace: string,
  _repoSlug: string,
  _path: string,
  _ref: string
): Promise<string> {
  // TODO: Bitbucket API – GET /2.0/repositories/{workspace}/{repo_slug}/src/{ref}/{path}
  return '';
}

export async function postPRComment(
  _workspace: string,
  _repoSlug: string,
  _prId: number,
  _body: string
): Promise<{ id: number }> {
  // TODO: Bitbucket API – POST /2.0/repositories/.../pullrequests/.../comments
  return { id: 0 };
}

export async function createCommitStatus(
  _workspace: string,
  _repoSlug: string,
  _sha: string,
  _state: 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS',
  _description?: string
): Promise<void> {
  // TODO: Bitbucket API – POST /2.0/repositories/.../commit/.../statuses/build
}

export async function getPullRequest(
  _workspace: string,
  _repoSlug: string,
  _prId: number
): Promise<ProviderPRInfo | null> {
  // TODO: Bitbucket API – GET /2.0/repositories/.../pullrequests/{pr_id}
  return null;
}
