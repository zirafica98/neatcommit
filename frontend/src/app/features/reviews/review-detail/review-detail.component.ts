import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { ReviewService } from '../../../core/services/review.service';
import { Review, Issue } from '../../../shared/models';

@Component({
  selector: 'app-review-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatExpansionModule,
    MatTabsModule,
  ],
  templateUrl: './review-detail.component.html',
  styleUrl: './review-detail.component.scss',
})
export class ReviewDetailComponent implements OnInit {
  review: Review | null = null;
  loading = true;
  error: string | null = null;
  selectedSeverity: string = 'all';

  constructor(
    private route: ActivatedRoute,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    const reviewId = this.route.snapshot.paramMap.get('id');
    if (reviewId) {
      this.loadReview(reviewId);
    }
  }

  loadReview(id: string): void {
    this.loading = true;
    this.error = null;

    this.reviewService.getReviewById(id).subscribe({
      next: (review) => {
        this.review = review;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading review:', error);
        this.error = 'Failed to load review';
        this.loading = false;
      },
    });
  }

  getFilteredIssues(): Issue[] {
    if (!this.review?.issues) return [];
    if (this.selectedSeverity === 'all') return this.review.issues;
    return this.review.issues.filter((issue) => issue.severity === this.selectedSeverity);
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ffc107';
    if (score >= 40) return '#ff9800';
    return '#f44336';
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
}
