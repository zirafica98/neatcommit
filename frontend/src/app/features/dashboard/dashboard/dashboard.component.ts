import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { ReviewService } from '../../../core/services/review.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { DashboardStats, Review } from '../../../shared/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  loading = true;
  error: string | null = null;
  hasActivelyAnalyzing = false;
  activelyAnalyzingIds = new Set<string>();

  constructor(
    private reviewService: ReviewService,
    private realtimeService: RealtimeService
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
    
    // Startuj real-time polling
    this.realtimeService.startPollingPendingReviews();
    
    // Subscribe na aktivno analizirane review-e
    this.realtimeService.activelyAnalyzing$.subscribe((analyzingIds) => {
      this.hasActivelyAnalyzing = analyzingIds.size > 0;
      this.activelyAnalyzingIds = analyzingIds;
      
      // Osveži dashboard ako ima aktivno analiziranih review-a
      if (analyzingIds.size > 0) {
        this.loadDashboardStats();
      }
    });
    
    // Takođe subscribe na pending reviews za refresh kada se završi
    this.realtimeService.pendingReviews$.subscribe((pending) => {
      const hasCompleted = pending.length === 0 && this.hasActivelyAnalyzing;
      if (hasCompleted) {
        this.loadDashboardStats();
      }
    });
  }

  ngOnDestroy(): void {
    // Service je singleton, ne treba cleanup
  }

  loadDashboardStats(): void {
    this.loading = true;
    this.error = null;

    this.reviewService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.error = 'Failed to load dashboard statistics';
        this.loading = false;
      },
    });
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '#f44336';
      case 'HIGH':
        return '#ff9800';
      case 'MEDIUM':
        return '#ffc107';
      case 'LOW':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#43e97b'; // Success green
    if (score >= 60) return '#fa709a'; // Warning pink
    if (score >= 40) return '#ff9800'; // Orange
    return '#ff6b6b'; // Danger red
  }
  
  getScoreGradient(score: number): string {
    if (score >= 80) return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
    if (score >= 60) return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    if (score >= 40) return 'linear-gradient(135deg, #ff9800 0%, #fb8c00 100%)';
    return 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)';
  }

  isAnalyzing(reviewId: string): boolean {
    return this.activelyAnalyzingIds.has(reviewId);
  }
}
