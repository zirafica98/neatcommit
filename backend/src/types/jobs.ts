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
