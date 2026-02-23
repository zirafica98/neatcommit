/**
 * Bitbucket Cloud provider – Pull Request analysis, file fetch, comments, commit status.
 * Uses Bitbucket REST API 2.0 with username + App Password (Basic auth).
 */

import { logger } from '../../utils/logger';
import type { ProviderPRDiff, ProviderPRInfo } from '../types';

const BITBUCKET_API_BASE = process.env.BITBUCKET_API_URL || 'https://api.bitbucket.org/2.0';

function authHeader(username: string, token: string): string {
  const encoded = Buffer.from(`${username}:${token}`, 'utf8').toString('base64');
  return `Basic ${encoded}`;
}

function headers(username: string, token: string): Record<string, string> {
  return {
    Authorization: authHeader(username, token),
    'Content-Type': 'application/json',
  };
}

export async function getPullRequest(
  username: string,
  token: string,
  workspace: string,
  repoSlug: string,
  prId: number
): Promise<ProviderPRInfo | null> {
  try {
    const w = encodeURIComponent(workspace);
    const r = encodeURIComponent(repoSlug);
    const res = await fetch(
      `${BITBUCKET_API_BASE}/repositories/${w}/${r}/pullrequests/${prId}`,
      { headers: headers(username, token) }
    );
    if (!res.ok) return null;
    const pr = (await res.json()) as {
      id?: number;
      source?: { commit?: { hash?: string; links?: { self?: { href?: string } } } };
      title?: string;
      state?: string;
      links?: { html?: { href?: string } };
    };
    const source = pr.source?.commit?.hash || pr.source?.commit?.links?.self?.href?.split('/').pop();
    return {
      id: String(pr.id ?? ''),
      number: pr.id ?? 0,
      title: pr.title || '',
      state: pr.state || 'OPEN',
      htmlUrl: pr.links?.html?.href || '',
      headSha: source || '',
      owner: workspace,
      repo: repoSlug,
    };
  } catch (e) {
    logger.error('Bitbucket getPullRequest failed', { workspace, repoSlug, prId, error: String(e) });
    return null;
  }
}

/**
 * Get list of changed files from PR diffstat.
 * PR response has links.diffstat.href – we use that, or fallback to diff and parse.
 */
export async function getPullRequestFiles(
  username: string,
  token: string,
  workspace: string,
  repoSlug: string,
  prId: number,
  _ref: string
): Promise<ProviderPRDiff[]> {
  try {
    const w = encodeURIComponent(workspace);
    const r = encodeURIComponent(repoSlug);
    // Get PR to obtain diffstat link
    const prRes = await fetch(
      `${BITBUCKET_API_BASE}/repositories/${w}/${r}/pullrequests/${prId}`,
      { headers: headers(username, token) }
    );
    if (!prRes.ok) return [];
    const pr = (await prRes.json()) as { links?: { diffstat?: { href?: string } } };
    const diffstatHref = pr.links?.diffstat?.href;
    if (!diffstatHref) {
      // Fallback: use diff endpoint and parse filenames from diff (expensive)
      const diffRes = await fetch(
        `${BITBUCKET_API_BASE}/repositories/${w}/${r}/pullrequests/${prId}/diff`,
        { headers: headers(username, token) }
      );
      if (!diffRes.ok) return [];
      const diffText = await diffRes.text();
      const files: ProviderPRDiff[] = [];
      const seen = new Set<string>();
      const re = /^diff --git a\/(.+?) b\/(.+?)(?:\s|$)/gm;
      let m;
      while ((m = re.exec(diffText)) !== null) {
        const path = m[2] || m[1];
        if (!seen.has(path)) {
          seen.add(path);
          const status = diffText.includes(`new file mode`) ? 'added' : diffText.includes(`deleted file mode`) ? 'removed' : 'modified';
          files.push({
            filename: path,
            additions: 0,
            deletions: 0,
            changes: 0,
            patch: '',
            status: status as ProviderPRDiff['status'],
          });
        }
      }
      return files;
    }
    const diffstatRes = await fetch(diffstatHref, { headers: headers(username, token) });
    if (!diffstatRes.ok) return [];
    const diffstat = (await diffstatRes.json()) as { values?: unknown[] } | unknown[];
    const valuesArr = Array.isArray(diffstat) ? diffstat : (diffstat as { values?: unknown[] }).values ?? [];
    const list = Array.isArray(valuesArr) ? valuesArr : [];
    return list.map((d: unknown) => {
      const x = d as { new?: { path?: string }; old?: { path?: string }; file?: string; lines_added?: number; lines_removed?: number };
      return {
      filename: x.new?.path || x.old?.path || x.file || '',
      additions: x.lines_added ?? 0,
      deletions: x.lines_removed ?? 0,
      changes: 0,
      patch: '',
      status: (x.new ? (x.old ? 'modified' : 'added') : 'removed') as ProviderPRDiff['status'],
      };
    }).filter((item): item is ProviderPRDiff => Boolean(item.filename));
  } catch (e) {
    logger.error('Bitbucket getPullRequestFiles failed', { workspace, repoSlug, prId, error: String(e) });
    return [];
  }
}

export async function getFileContent(
  username: string,
  token: string,
  workspace: string,
  repoSlug: string,
  path: string,
  ref: string
): Promise<string> {
  try {
    const w = encodeURIComponent(workspace);
    const r = encodeURIComponent(repoSlug);
    const pathEnc = path.split('/').map(encodeURIComponent).join('/');
    const refEnc = encodeURIComponent(ref);
    const res = await fetch(
      `${BITBUCKET_API_BASE}/repositories/${w}/${r}/src/${refEnc}/${pathEnc}`,
      { headers: headers(username, token) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    logger.error('Bitbucket getFileContent failed', { workspace, repoSlug, path, error: String(e) });
    throw e;
  }
}

export async function postPRComment(
  username: string,
  token: string,
  workspace: string,
  repoSlug: string,
  prId: number,
  body: string
): Promise<{ id: number }> {
  const w = encodeURIComponent(workspace);
  const r = encodeURIComponent(repoSlug);
  const res = await fetch(
    `${BITBUCKET_API_BASE}/repositories/${w}/${r}/pullrequests/${prId}/comments`,
    {
      method: 'POST',
      headers: headers(username, token),
      body: JSON.stringify({ content: { raw: body } }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bitbucket postPRComment failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { id?: number };
  return { id: data.id ?? 0 };
}

export async function createCommitStatus(
  username: string,
  token: string,
  workspace: string,
  repoSlug: string,
  sha: string,
  state: 'SUCCESSFUL' | 'FAILED' | 'INPROGRESS',
  description?: string
): Promise<void> {
  const w = encodeURIComponent(workspace);
  const r = encodeURIComponent(repoSlug);
  const res = await fetch(
    `${BITBUCKET_API_BASE}/repositories/${w}/${r}/commit/${sha}/statuses/build`,
    {
      method: 'POST',
      headers: headers(username, token),
      body: JSON.stringify({
        key: 'neatcommit',
        state,
        name: description || (state === 'SUCCESSFUL' ? 'Quality gate passed' : state === 'FAILED' ? 'Quality gate failed' : 'Analysis'),
        url: process.env.API_URL || process.env.FRONTEND_URL || 'https://neatcommit.com',
      }),
    }
  );
  if (!res.ok) {
    logger.warn('Bitbucket createCommitStatus failed', { workspace, repoSlug, sha, state, status: res.status });
  }
}
