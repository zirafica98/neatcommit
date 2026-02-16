import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { ReviewService } from '../../../core/services/review.service';
import { ExportService } from '../../../core/services/export.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { SubscriptionService, SubscriptionInfo } from '../../../core/services/subscription.service';
import { DashboardStats, Review } from '../../../shared/models';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  @ViewChild('scoreTrendChart') scoreTrendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('issuesCategoryChart') issuesCategoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityChart') activityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reposStatusChart') reposStatusChartRef!: ElementRef<HTMLCanvasElement>;

  stats: DashboardStats | null = null;
  loading = true;
  error: string | null = null;
  hasActivelyAnalyzing = false;
  activelyAnalyzingIds = new Set<string>();
  analytics: any = null;
  analyticsLoading = false;
  subscription: SubscriptionInfo | null = null;
  subscriptionLoading = false;
  
  private charts: Chart[] = [];

  constructor(
    private reviewService: ReviewService,
    private exportService: ExportService,
    private subscriptionService: SubscriptionService,
    private realtimeService: RealtimeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
    this.loadAnalytics();
    
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

  ngAfterViewInit(): void {
    // If analytics are already loaded, initialize charts
    if (this.analytics && !this.analyticsLoading) {
      setTimeout(() => {
        this.initCharts();
      }, 500);
    }
  }

  ngAfterViewChecked(): void {
    // Try to initialize charts if analytics are loaded but charts aren't
    if (this.analytics && !this.analyticsLoading && this.charts.length === 0) {
      if (this.scoreTrendChartRef?.nativeElement) {
        setTimeout(() => {
          this.initCharts();
        }, 100);
      }
    }
  }

  ngOnDestroy(): void {
    // Destroy all charts
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
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

  loadAnalytics(): void {
    this.analyticsLoading = true;
    this.reviewService.getAnalytics().subscribe({
      next: (analytics) => {
        console.log('Analytics loaded:', analytics);
        this.analytics = analytics;
        this.analyticsLoading = false;
        this.cdr.detectChanges();
        // Initialize charts after data is loaded and view is ready
        // Use multiple attempts to ensure ViewChild refs are available
        let attempts = 0;
        const tryInitCharts = () => {
          attempts++;
          if (this.scoreTrendChartRef?.nativeElement) {
            console.log('ViewChild refs available, initializing charts...');
            this.initCharts();
          } else if (attempts < 10) {
            console.log(`Waiting for ViewChild refs... attempt ${attempts}`);
            setTimeout(tryInitCharts, 200);
          } else {
            console.warn('ViewChild refs not available after 10 attempts');
          }
        };
        setTimeout(tryInitCharts, 300);
      },
      error: (error) => {
        console.error('Error loading analytics:', error);
        this.analyticsLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  initCharts(): void {
    if (!this.analytics) {
      console.log('Analytics not loaded yet');
      return;
    }
    
    console.log('Initializing charts...', {
      hasScoreTrendRef: !!this.scoreTrendChartRef,
      hasIssuesCategoryRef: !!this.issuesCategoryChartRef,
      hasActivityRef: !!this.activityChartRef,
      hasReposStatusRef: !!this.reposStatusChartRef,
      analytics: this.analytics,
    });
    
    // Destroy existing charts
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];

    // Security Score Trend Chart (Line)
    if (this.scoreTrendChartRef?.nativeElement && this.analytics.scoreTrend) {
      const scoreData = Array.isArray(this.analytics.scoreTrend) && this.analytics.scoreTrend.length > 0
        ? this.analytics.scoreTrend
        : [{ date: new Date().toISOString().split('T')[0], score: 0 }];
      const scoreConfig: ChartConfiguration = {
        type: 'line',
        data: {
          labels: scoreData.map((item: any) => {
            const date = new Date(item.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }),
          datasets: [{
            label: 'Security Score',
            data: scoreData.map((item: any) => item.score),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: false,
              min: 0,
              max: 100,
            },
          },
        },
      };
      const scoreChart = new Chart(this.scoreTrendChartRef.nativeElement, scoreConfig);
      this.charts.push(scoreChart);
    }

    // Issues by Category Chart (Doughnut)
    if (this.issuesCategoryChartRef?.nativeElement && this.analytics.issuesByCategory) {
      const categoryData = Array.isArray(this.analytics.issuesByCategory) && this.analytics.issuesByCategory.length > 0
        ? this.analytics.issuesByCategory
        : [{ category: 'SECURITY', count: 0 }];
      const categoryColors = ['#ff6b6b', '#4facfe', '#43e97b', '#fa709a'];
      const categoryConfig: ChartConfiguration = {
        type: 'doughnut',
        data: {
          labels: categoryData.map((item: any) => item.category),
          datasets: [{
            data: categoryData.map((item: any) => item.count),
            backgroundColor: categoryColors.slice(0, categoryData.length),
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
          },
        },
      };
      const categoryChart = new Chart(this.issuesCategoryChartRef.nativeElement, categoryConfig);
      this.charts.push(categoryChart);
    }

    // Review Activity Chart (Bar)
    if (this.activityChartRef?.nativeElement && this.analytics.activityTrend) {
      const activityData = Array.isArray(this.analytics.activityTrend) && this.analytics.activityTrend.length > 0
        ? this.analytics.activityTrend
        : [{ date: new Date().toISOString().split('T')[0], count: 0 }];
      const activityConfig: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: activityData.map((item: any) => {
            const date = new Date(item.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }),
          datasets: [{
            label: 'Reviews',
            data: activityData.map((item: any) => item.count),
            backgroundColor: 'rgba(102, 126, 234, 0.6)',
            borderColor: '#667eea',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      };
      const activityChart = new Chart(this.activityChartRef.nativeElement, activityConfig);
      this.charts.push(activityChart);
    }

    // Repositories by Status Chart (Pie)
    if (this.reposStatusChartRef?.nativeElement && this.analytics.repositoriesByStatus) {
      const reposData = Array.isArray(this.analytics.repositoriesByStatus) && this.analytics.repositoriesByStatus.length > 0
        ? this.analytics.repositoriesByStatus
        : [{ enabled: true, count: 0 }];
      const reposConfig: ChartConfiguration = {
        type: 'pie',
        data: {
          labels: reposData.map((item: any) => 
            item.enabled ? 'Enabled' : 'Disabled'
          ),
          datasets: [{
            data: reposData.map((item: any) => item.count),
            backgroundColor: ['#43e97b', '#ff6b6b'],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
          },
        },
      };
      const reposChart = new Chart(this.reposStatusChartRef.nativeElement, reposConfig);
      this.charts.push(reposChart);
    }
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

  loadSubscription(): void {
    this.subscriptionLoading = true;
    this.subscriptionService.getSubscription().subscribe({
      next: (subscription) => {
        this.subscription = subscription;
        this.subscriptionLoading = false;
      },
      error: (error) => {
        console.error('Error loading subscription:', error);
        this.subscriptionLoading = false;
      },
    });
  }

  getUsagePercentage(used: number, limit: number | null): number {
    if (limit === null) return 0; // Unlimited
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  }

  exportStatsToExcel(): void {
    this.exportService.exportStatsToExcel();
  }
}
