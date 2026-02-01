/**
 * Repository Service
 * 
 * Upravlja repository podacima i API pozivima
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Repository } from '../../shared/models';

@Injectable({
  providedIn: 'root',
})
export class RepositoryService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all repositories
   */
  getRepositories(): Observable<{ count: number; repositories: Repository[] }> {
    return this.apiService.get<{ count: number; repositories: Repository[] }>('/api/repositories');
  }

  /**
   * Get repository by ID
   */
  getRepositoryById(id: string): Observable<Repository> {
    return this.apiService.get<Repository>(`/api/repositories/${id}`);
  }

  /**
   * Enable analysis for repository
   */
  enableRepository(id: string): Observable<Repository> {
    return this.apiService.post<Repository>(`/api/repositories/${id}/enable`, {});
  }

  /**
   * Disable analysis for repository
   */
  disableRepository(id: string): Observable<Repository> {
    return this.apiService.post<Repository>(`/api/repositories/${id}/disable`, {});
  }

  /**
   * Get ALL repositories from GitHub (not just those in database)
   * This fetches all repositories where the GitHub App is installed
   */
  getAllRepositoriesFromGitHub(): Observable<{ count: number; repositories: Repository[] }> {
    return this.apiService.get<{ count: number; repositories: Repository[] }>('/api/repositories/all');
  }

  /**
   * Add repository to database (without waiting for PR)
   */
  addRepository(githubRepoId: number): Observable<{ success: boolean; repository: Repository; message: string }> {
    return this.apiService.post<{ success: boolean; repository: Repository; message: string }>(
      '/api/repositories/add',
      { githubRepoId }
    );
  }
}
