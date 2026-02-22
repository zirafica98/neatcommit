export interface AnalyzePRJob {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  sha: string;
  prId: string;
  prUrl: string;
  prTitle: string;
}

export interface AnalyzeBranchJob {
  installationId: number;
  owner: string;
  repo: string;
  ref: string;
  baseRef: string;
  sha: string;
  branchId: string;
}
