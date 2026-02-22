/**
 * Shared Models/Interfaces
 * 
 * Tipovi koji se koriste kroz aplikaciju
 */

export interface User {
  id: string;
  githubId: number;
  username: string;
  email?: string;
  avatarUrl?: string;
  name?: string;
  role?: string; // USER, ADMIN
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  githubPrNumber: number;
  githubPrId: string;
  githubPrUrl: string;
  githubPrTitle: string;
  githubPrState: string;
  githubSha: string;
  status: 'pending' | 'completed' | 'failed';
  securityScore: number;
  qualityGatePassed?: boolean | null;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  createdAt: string;
  completedAt?: string;
  repository?: Repository;
  issues?: Issue[];
}

export interface Issue {
  id: string;
  filePath: string;
  line?: number;
  column?: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'SECURITY' | 'PERFORMANCE' | 'QUALITY' | 'BEST_PRACTICE';
  title: string;
  description: string;
  codeSnippet?: string;
  suggestedFix?: string;
  cweId?: string;
  owaspCategory?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalReviews: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  averageScore: number;
  recentReviews: Review[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
