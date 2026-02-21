import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { PlanSelectionModalComponent } from '../../../shared/components/plan-selection-modal/plan-selection-modal.component';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.scss',
})
export class CallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Check for tokens in query params (from backend redirect)
    this.route.queryParams.subscribe((params) => {
      const accessToken = params['access_token'];
      const refreshToken = params['refresh_token'];
      const error = params['error'];

      if (error) {
        console.error('OAuth error:', error);
        this.router.navigate(['/auth/login'], { queryParams: { error } });
        return;
      }

      // If we have tokens from redirect, store them and get user (ignore "undefined" string)
      const validToken = (t: string) => t && t !== 'undefined' && t !== 'null' && t.length > 10;
      if (validToken(accessToken) && validToken(refreshToken)) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        
        // Get user info
        this.authService.getCurrentUser().subscribe({
          next: (user) => {
            if (user) {
              this.checkSubscriptionAndNavigate(params);
            } else {
              this.router.navigate(['/auth/login'], { queryParams: { error: 'auth_failed' } });
            }
          },
          error: (error) => {
            console.error('Get user error:', error);
            this.router.navigate(['/auth/login'], { queryParams: { error: 'auth_failed' } });
          },
        });
      } else {
        // Fallback: check for code (if backend redirects differently)
        const code = params['code'];
        if (code) {
          this.authService.handleOAuthCallback(code).subscribe({
            next: (user) => {
              if (user) {
                this.checkSubscriptionAndNavigate(params);
              } else {
                this.router.navigate(['/auth/login'], { queryParams: { error: 'auth_failed' } });
              }
            },
            error: (error) => {
              console.error('Callback error:', error);
              this.router.navigate(['/auth/login'], { queryParams: { error: 'auth_failed' } });
            },
          });
        } else {
          this.router.navigate(['/auth/login']);
        }
      }
    });
  }

  checkSubscriptionAndNavigate(params: any): void {
    // Proveri da li je korisnik admin
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        // Admin ide na admin panel po defaultu
        if (user?.role === 'ADMIN') {
          const returnUrl = params['returnUrl'] || '/app/admin';
          this.router.navigate([returnUrl]);
          return;
        }

        // Za obične korisnike, proveri subscription status
        this.checkSubscriptionForUser(params);
      },
      error: (error) => {
        console.error('Error getting user:', error);
        // Ako ne može da dobije user-a, proveri subscription (fallback)
        this.checkSubscriptionForUser(params);
      },
    });
  }

  private checkSubscriptionForUser(params: any): void {
    this.subscriptionService.getSubscription().subscribe({
      next: (subscriptionInfo) => {
        const returnUrl = params['returnUrl'] || '/app/dashboard';

        // Ako nema subscription ili je istekao, otvori modal za izbor plana
        if (!subscriptionInfo.subscription || subscriptionInfo.needsPlanSelection) {
          const isExpired = subscriptionInfo.warnings?.isExpired || false;
          const hasUsedFreePlan = subscriptionInfo.subscription?.planType === 'FREE' && isExpired;
          
          const dialogRef = this.dialog.open(PlanSelectionModalComponent, {
            width: '90vw',
            maxWidth: '1200px',
            disableClose: true,
            data: {
              isFirstLogin: !subscriptionInfo.subscription,
              isExpired: isExpired,
              hasUsedFreePlan: hasUsedFreePlan,
            },
          });

          dialogRef.afterClosed().subscribe((result) => {
            if (result?.success) {
              this.router.navigate([returnUrl]);
            } else {
              // Ako je obavezno, ne dozvoli zatvaranje
              if (!subscriptionInfo.subscription || isExpired) {
                this.checkSubscriptionForUser(params);
              }
            }
          });
        } else {
          // Ako ima validan subscription, navigiraj
          this.router.navigate([returnUrl]);
        }
      },
      error: (error) => {
        console.error('Error checking subscription:', error);
        // Ako ne može da proveri, otvori modal za izbor plana
        const dialogRef = this.dialog.open(PlanSelectionModalComponent, {
          width: '90vw',
          maxWidth: '1200px',
          disableClose: true,
          data: {
            isFirstLogin: true,
            isExpired: false,
            hasUsedFreePlan: false,
          },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result?.success) {
            const returnUrl = params['returnUrl'] || '/app/dashboard';
            this.router.navigate([returnUrl]);
          }
        });
      },
    });
  }
}
