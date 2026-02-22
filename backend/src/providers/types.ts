/**
 * Provider types – zajednički interfejsi za GitHub, GitLab, Bitbucket.
 * Analiza je ista; samo fetch PR/MR i post comment/status su provider-specifični.
 */

export type ProviderType = 'github' | 'gitlab' | 'bitbucket';

export interface ProviderPRDiff {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
}

export interface ProviderPRInfo {
  id: string;
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  headSha: string;
  owner: string;
  repo: string;
}

export interface ProviderConfig {
  installationId?: number; // GitHub
  projectId?: string;     // GitLab
  workspaceRepoSlug?: string; // Bitbucket
}
