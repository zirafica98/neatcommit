import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../../core/services/review.service';
import { ExportService } from '../../../core/services/export.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { Review } from '../../../shared/models';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
  ],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit, OnDestroy {
  reviews: Review[] = [];
  loading = true;
  error: string | null = null;
  filterSeverity: string = 'all';
  activelyAnalyzingIds = new Set<string>();

  constructor(
    private reviewService: ReviewService,
    private exportService: ExportService,
    private realtimeService: RealtimeService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
    
    // Startuj real-time polling za pending reviews
    this.realtimeService.startPollingPendingReviews();
    
    // Subscribe na aktivno analizirane review-e
    this.realtimeService.activelyAnalyzing$.subscribe((analyzingIds) => {
      this.activelyAnalyzingIds = analyzingIds;
      
      // Osveži listu ako ima aktivno analiziranih review-a
      if (analyzingIds.size > 0) {
        this.loadReviews();
      }
    });
    
    // Takođe subscribe na pending reviews za general refresh
    this.realtimeService.pendingReviews$.subscribe((pending) => {
      // Osveži listu kada se review završi (nema više pending)
      const hasCompleted = pending.length === 0 && this.activelyAnalyzingIds.size > 0;
      if (hasCompleted) {
        this.loadReviews();
      }
    });
  }

  ngOnDestroy(): void {
    // Service je singleton, ne treba cleanup
  }

  loadReviews(): void {
    this.loading = true;
    this.error = null;

    const params: any = {};
    if (this.filterSeverity !== 'all') {
      params.severity = this.filterSeverity;
    }

    this.reviewService.getReviews(params).subscribe({
      next: (response) => {
        this.reviews = response.reviews;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.error = 'Failed to load reviews';
        this.loading = false;
      },
    });
  }

  onFilterChange(value: string): void {
    this.filterSeverity = value;
    this.loadReviews();
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ffc107';
    if (score >= 40) return '#ff9800';
    return '#f44336';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'pending':
        return '#ff9800';
      case 'failed':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }

  exportIssuesToCSV(): void {
    this.exportService.exportIssuesToCSV(this.filterSeverity !== 'all' ? this.filterSeverity : undefined);
  }
}
