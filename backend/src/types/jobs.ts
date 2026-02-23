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

export interface AnalyzeGitLabMRJob {
  installationId: string; // DB Installation.id (cuid)
  repositoryId: string;
  projectId: string;
  mrIid: number;
  sha: string;
  branchId: string; // same as review.githubPrId for lookup
}

export interface AnalyzeBitbucketPRJob {
  installationId: string;
  repositoryId: string;
  workspace: string;
  repoSlug: string;
  prId: number;
  sha: string;
  branchId: string; // review.githubPrId for lookup
}
