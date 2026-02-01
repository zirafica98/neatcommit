/**
 * Realtime Service
 * 
 * Upravlja real-time osvežavanjem podataka (polling)
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { ReviewService } from './review.service';
import { Review } from '../../shared/models';

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private refreshInterval = 10000; // 10 sekundi
  private subscriptions = new Map<string, Subscription>();
  private pendingReviewsSubject = new BehaviorSubject<Review[]>([]);
  private activelyAnalyzingSubject = new BehaviorSubject<Set<string>>(new Set());
  public pendingReviews$ = this.pendingReviewsSubject.asObservable();
  public activelyAnalyzing$ = this.activelyAnalyzingSubject.asObservable();

  constructor(private reviewService: ReviewService) {}

  /**
   * Startuje polling za pending reviews
   */
  startPollingPendingReviews(): void {
    // Proveri da li već postoji subscription
    if (this.subscriptions.has('pending-reviews')) {
      return;
    }

    const subscription = interval(this.refreshInterval)
      .pipe(
        startWith(0), // Odmah pokreni
        switchMap(() => this.reviewService.getReviews({ limit: 50 }))
      )
      .subscribe({
        next: (response) => {
          const pending = response.reviews.filter((r) => r.status === 'pending');
          this.pendingReviewsSubject.next(pending);
          
          // Identifikuj aktivno analizirane review-e (pending i kreirani u poslednjih 5 minuta)
          const now = new Date().getTime();
          const fiveMinutesAgo = now - 5 * 60 * 1000;
          
          const activelyAnalyzing = pending
            .filter((r) => {
              const createdAt = new Date(r.createdAt).getTime();
              return createdAt > fiveMinutesAgo;
            })
            .map((r) => r.id);
          
          this.activelyAnalyzingSubject.next(new Set(activelyAnalyzing));
        },
        error: (error) => {
          console.error('Polling error:', error);
        },
      });

    this.subscriptions.set('pending-reviews', subscription);
  }

  /**
   * Zaustavlja polling
   */
  stopPollingPendingReviews(): void {
    const subscription = this.subscriptions.get('pending-reviews');
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete('pending-reviews');
    }
  }

  /**
   * Osveži reviews jednom
   */
  refreshReviews(): Observable<{ count: number; reviews: Review[] }> {
    return this.reviewService.getReviews({ limit: 50 });
  }

  /**
   * Osveži dashboard stats
   */
  refreshDashboard(): Observable<any> {
    return this.reviewService.getDashboardStats();
  }

  /**
   * Cleanup - zaustavi sve polling-e
   */
  cleanup(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
  }
}
