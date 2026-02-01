import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

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
    private authService: AuthService
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

      // If we have tokens from redirect, store them and get user
      if (accessToken && refreshToken) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        
        // Get user info
        this.authService.getCurrentUser().subscribe({
          next: (user) => {
            if (user) {
              const returnUrl = params['returnUrl'] || '/dashboard';
              this.router.navigate([returnUrl]);
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
                const returnUrl = params['returnUrl'] || '/dashboard';
                this.router.navigate([returnUrl]);
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
}
