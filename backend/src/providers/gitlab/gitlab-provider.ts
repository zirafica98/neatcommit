/**
 * GitLab provider – scaffold za Merge Request analizu.
 * TODO: GitLab OAuth/App, webhook za MR, dohvat fajlova, postavljanje komentara (notes) i statusa.
 */

import type { ProviderPRDiff, ProviderPRInfo } from '../types';

export async function getMergeRequestFiles(
  _projectId: string,
  _mrIid: number,
  _ref: string
): Promise<ProviderPRDiff[]> {
  // TODO: GitLab API – GET /projects/:id/merge_requests/:iid/changes
  return [];
}

export async function getFileContent(
  _projectId: string,
  _path: string,
  _ref: string
): Promise<string> {
  // TODO: GitLab API – GET /projects/:id/repository/files/:path?ref=:ref
  return '';
}

export async function postMRComment(
  _projectId: string,
  _mrIid: number,
  _body: string
): Promise<{ id: number }> {
  // TODO: GitLab API – POST /projects/:id/merge_requests/:iid/notes
  return { id: 0 };
}

export async function createCommitStatus(
  _projectId: string,
  _sha: string,
  _state: 'success' | 'failed' | 'pending',
  _description?: string
): Promise<void> {
  // TODO: GitLab API – POST /projects/:id/statuses/:sha
}

export async function getMergeRequest(
  _projectId: string,
  _mrIid: number
): Promise<ProviderPRInfo | null> {
  // TODO: GitLab API – GET /projects/:id/merge_requests/:iid
  return null;
}
