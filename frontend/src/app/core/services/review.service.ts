/**
 * Review Service
 * 
 * Upravlja review podacima i API pozivima
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Review, Issue, DashboardStats } from '../../shared/models';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all reviews
   */
  getReviews(params?: { limit?: number; offset?: number; provider?: 'github' | 'gitlab' | 'bitbucket' }): Observable<{ count: number; reviews: Review[] }> {
    return this.apiService.get<{ count: number; reviews: Review[] }>('/api/reviews', params);
  }

  /**
   * Get review by ID
   */
  getReviewById(id: string): Observable<Review> {
    return this.apiService.get<Review>(`/api/reviews/${id}`);
  }

  /**
   * Get issues
   */
  getIssues(params?: { severity?: string; limit?: number }): Observable<{ count: number; issues: Issue[] }> {
    return this.apiService.get<{ count: number; issues: Issue[] }>('/api/issues', params);
  }

  /**
   * Get dashboard statistics
   */
  getDashboardStats(): Observable<DashboardStats> {
    // This endpoint will be created in backend
    return this.apiService.get<DashboardStats>('/api/dashboard/stats');
  }

  /**
   * Get analytics data for charts
   */
  getAnalytics(): Observable<{
    scoreTrend: { date: string; score: number }[];
    issuesByCategory: { category: string; count: number }[];
    activityTrend: { date: string; count: number }[];
    repositoriesByStatus: { enabled: boolean; count: number }[];
  }> {
    return this.apiService.get('/api/dashboard/analytics');
  }
}
