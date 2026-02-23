/**
 * GitLab provider – Merge Request analysis, file fetch, comments, commit status.
 * Uses GitLab REST API v4 with Personal/Project Access Token.
 */

import { logger } from '../../utils/logger';
import type { ProviderPRDiff, ProviderPRInfo } from '../types';

const GITLAB_API_BASE = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';

function headers(token: string): Record<string, string> {
  return {
    'PRIVATE-TOKEN': token,
    'Content-Type': 'application/json',
  };
}

function projectPath(projectId: string): string {
  return encodeURIComponent(projectId);
}

export async function getMergeRequest(
  token: string,
  projectId: string,
  mrIid: number
): Promise<ProviderPRInfo | null> {
  try {
    const res = await fetch(
      `${GITLAB_API_BASE}/projects/${projectPath(projectId)}/merge_requests/${mrIid}`,
      { headers: headers(token) }
    );
    if (!res.ok) return null;
    const mr = (await res.json()) as {
      id?: number;
      iid?: number;
      source_branch?: string;
      target_project?: { path?: string; namespace?: { full_path?: string } };
      source_project?: { namespace?: { full_path?: string } };
      title?: string;
      state?: string;
      web_url?: string;
      sha?: string;
      diff_refs?: { head_sha?: string };
    };
    const pathParts = (mr.source_branch || '').split('/');
    const repo = pathParts[0] || mr.target_project?.path || 'repo';
    return {
      id: String(mr.id ?? ''),
      number: mr.iid ?? 0,
      title: mr.title || '',
      state: mr.state || 'opened',
      htmlUrl: mr.web_url || '',
      headSha: mr.sha || mr.diff_refs?.head_sha || '',
      owner: mr.target_project?.namespace?.full_path || mr.source_project?.namespace?.full_path || 'unknown',
      repo: mr.target_project?.path || repo,
    };
  } catch (e) {
    logger.error('GitLab getMergeRequest failed', { projectId, mrIid, error: String(e) });
    return null;
  }
}

export async function getMergeRequestFiles(
  token: string,
  projectId: string,
  mrIid: number,
  _ref: string
): Promise<ProviderPRDiff[]> {
  try {
    const res = await fetch(
      `${GITLAB_API_BASE}/projects/${projectPath(projectId)}/merge_requests/${mrIid}/changes`,
      { headers: headers(token) }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { changes?: Array<{ new_path?: string; old_path?: string; new_file?: boolean; deleted_file?: boolean; diff?: string }> };
    const changes = data.changes || [];
    return changes.map((c: any) => ({
      filename: c.new_path || c.old_path || '',
      additions: c.diff?.split('\n').filter((l: string) => l.startsWith('+') && !l.startsWith('+++')).length ?? 0,
      deletions: c.diff?.split('\n').filter((l: string) => l.startsWith('-') && !l.startsWith('---')).length ?? 0,
      changes: 0,
      patch: c.diff || '',
      status: (c.new_file ? 'added' : c.deleted_file ? 'removed' : 'modified') as ProviderPRDiff['status'],
    }));
  } catch (e) {
    logger.error('GitLab getMergeRequestFiles failed', { projectId, mrIid, error: String(e) });
    return [];
  }
}

export async function getFileContent(
  token: string,
  projectId: string,
  path: string,
  ref: string
): Promise<string> {
  try {
    const pathEnc = encodeURIComponent(path);
    const res = await fetch(
      `${GITLAB_API_BASE}/projects/${projectPath(projectId)}/repository/files/${pathEnc}/raw?ref=${encodeURIComponent(ref)}`,
      { headers: headers(token) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    logger.error('GitLab getFileContent failed', { projectId, path, error: String(e) });
    throw e;
  }
}

export async function postMRComment(
  token: string,
  projectId: string,
  mrIid: number,
  body: string
): Promise<{ id: number }> {
  const res = await fetch(
    `${GITLAB_API_BASE}/projects/${projectPath(projectId)}/merge_requests/${mrIid}/notes`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ body }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitLab postMRComment failed: ${res.status} ${err}`);
  }
  const note = (await res.json()) as { id?: number };
  return { id: note.id ?? 0 };
}

export async function createCommitStatus(
  token: string,
  projectId: string,
  sha: string,
  state: 'success' | 'failed' | 'pending',
  description?: string
): Promise<void> {
  const res = await fetch(
    `${GITLAB_API_BASE}/projects/${projectPath(projectId)}/statuses/${sha}`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        state: state === 'failed' ? 'failed' : state === 'success' ? 'success' : 'pending',
        description: description || (state === 'success' ? 'Quality gate passed' : state === 'failed' ? 'Quality gate failed' : 'Analysis running'),
      }),
    }
  );
  if (!res.ok) {
    logger.warn('GitLab createCommitStatus failed', { projectId, sha, state, status: res.status });
  }
}
