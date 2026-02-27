import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

const ERROR_MESSAGES: Record<string, string> = {
  sign_in_with_github_first: 'Please sign in with GitHub first to complete setup, then install the app.',
  user_not_linked: 'Your account is not linked. Please sign in with GitHub.',
  installation_not_found: 'Installation not found. Try signing in with GitHub again.',
  auth_failed: 'Authentication failed. Please try again.',
  oauth_not_configured: 'GitHub login is not configured.',
  gitlab_oauth_not_configured: 'GitLab login is not configured on the server.',
  gitlab_token_exchange_failed: 'GitLab authentication failed. Please try again.',
  gitlab_no_token: 'GitLab did not return a token. Please try again.',
  gitlab_user_fetch_failed: 'Could not load your GitLab profile. Please try again.',
  gitlab_auth_failed: 'GitLab authentication failed. Please try again.',
  gitlab_missing_code: 'GitLab did not return an authorization code. Please try again.',
  bitbucket_oauth_not_configured: 'Bitbucket login is not configured on the server.',
  bitbucket_missing_code: 'Bitbucket did not return an authorization code. Please try again.',
  bitbucket_token_exchange_failed: 'Bitbucket authentication failed. Please try again.',
  bitbucket_no_token: 'Bitbucket did not return a token. Please try again.',
  bitbucket_user_fetch_failed: 'Could not load your Bitbucket profile. Please try again.',
  bitbucket_auth_failed: 'Bitbucket authentication failed. Please try again.',
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  showAdminLogin = false;
  loading = false;
  loginError: string | null = null;
  showHowItWorks = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const error = params['error'];
      if (error) {
        this.loginError = ERROR_MESSAGES[error] || error;
      }
    });
  }

  private get returnUrl(): string {
    const url = this.route.snapshot.queryParams['returnUrl'];
    if (url && typeof url === 'string' && url.startsWith('/app')) return url;
    return '';
  }

  toggleAdminLogin(): void {
    this.showAdminLogin = !this.showAdminLogin;
    this.loginError = null;
  }

  toggleHowItWorks(): void {
    this.showHowItWorks = !this.showHowItWorks;
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.loginError = null;

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: (response) => {
        this.loading = false;
        const url = this.returnUrl || (response.user?.role === 'ADMIN' ? '/app/admin' : '/app/dashboard');
        this.router.navigate([url]);
      },
      error: (error) => {
        this.loading = false;
        this.loginError = error.error?.error || 'Login failed. Please try again.';
      },
    });
  }

  loginWithGitHub(): void {
    this.authService.loginWithGitHub();
  }

  loginWithGitLab(): void {
    this.authService.loginWithGitLab();
  }

  loginWithBitbucket(): void {
    this.authService.loginWithBitbucket();
  }
}
