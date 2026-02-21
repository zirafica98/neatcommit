import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService } from '../../../core/services/review.service';
import { RepositoryService } from '../../../core/services/repository.service';
import { SubscriptionService, SubscriptionInfo } from '../../../core/services/subscription.service';
import { User } from '../../../shared/models';
import { RouterModule } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    RouterModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  user: User | null = null;
  isDarkTheme = false;
  emailNotifications = true;
  autoRefresh = true;
  
  totalReviews = 0;
  totalRepositories = 0;
  totalIssues = 0;
  averageScore = 0;
  subscription: SubscriptionInfo | null = null;
  subscriptionLoading = false;

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private reviewService: ReviewService,
    private repositoryService: RepositoryService,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });

    // Load theme preference
    this.isDarkTheme = this.themeService.getCurrentTheme() === 'dark';

    // Load user preferences from localStorage
    this.loadPreferences();

    // Load statistics
    this.loadStatistics();
    
    // Load subscription
    this.loadSubscription();
  }

  loadPreferences(): void {
    const emailPref = localStorage.getItem('neatcommit_email_notifications');
    const refreshPref = localStorage.getItem('neatcommit_auto_refresh');
    
    if (emailPref !== null) {
      this.emailNotifications = emailPref === 'true';
    }
    if (refreshPref !== null) {
      this.autoRefresh = refreshPref === 'true';
    }
  }

  loadStatistics(): void {
    // Load review statistics
    this.reviewService.getReviews({ limit: 1 }).subscribe({
      next: (response) => {
        this.totalReviews = response.count;
      },
    });

    // Load repository count
    this.repositoryService.getRepositories().subscribe({
      next: (response) => {
        this.totalRepositories = response.count;
      },
    });

    // Load dashboard stats for issues and score
    this.reviewService.getDashboardStats().subscribe({
      next: (stats) => {
        this.totalIssues = stats.totalIssues;
        this.averageScore = stats.averageScore;
      },
    });
  }

  toggleTheme(checked: boolean): void {
    this.isDarkTheme = checked;
    if (checked) {
      this.themeService.setTheme('dark');
    } else {
      this.themeService.setTheme('light');
    }
  }

  toggleEmailNotifications(checked: boolean): void {
    this.emailNotifications = checked;
    localStorage.setItem('neatcommit_email_notifications', checked.toString());
  }

  toggleAutoRefresh(checked: boolean): void {
    this.autoRefresh = checked;
    localStorage.setItem('neatcommit_auto_refresh', checked.toString());
  }

  clearCache(): void {
    if (confirm('Are you sure you want to clear all cached data? This will refresh your session.')) {
      localStorage.removeItem('neatcommit_email_notifications');
      localStorage.removeItem('neatcommit_auto_refresh');
      localStorage.removeItem('neatcommit_tour_completed');
      // Reload page to clear all cache
      window.location.reload();
    }
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

  disconnectAccount(): void {
    if (
      !confirm(
        'Are you sure you want to disconnect your GitHub account? You will be logged out and will need to sign in with GitHub again to reconnect.'
      )
    ) {
      return;
    }
    this.authService.disconnectGitHub().subscribe({
      next: () => {
        // logout() is called inside disconnectGitHub(), redirect happens automatically
      },
      error: (err) => {
        const message =
          err?.error?.message ||
          err?.error?.error ||
          'Failed to disconnect account. Please try again.';
        alert(message);
      },
    });
  }
}
