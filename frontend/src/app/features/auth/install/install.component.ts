import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-install',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './install.component.html',
  styleUrl: './install.component.scss',
})
export class InstallComponent implements OnInit, OnDestroy {
  checking = false;
  installationOpened = false;
  userId: string | null = null;
  username: string | null = null;
  checkingInterval: any;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Proveri da li imamo userId i username iz query params
    this.route.queryParams.subscribe((params) => {
      this.userId = params['userId'] || null;
      this.username = params['username'] || null;

      if (this.userId && this.username) {
        // Automatski otvori GitHub App installation page
        this.openInstallationPage();
        // Počni automatski polling da proveri da li je instalacija završena
        this.startPolling();
      } else {
        // Ako nema userId, korisnik nije prošao kroz OAuth flow
        this.snackBar.open('Please login with GitHub first', 'Close', {
          duration: 5000,
        });
        this.router.navigate(['/auth/login']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.checkingInterval) {
      clearInterval(this.checkingInterval);
    }
  }

  openInstallationPage(): void {
    // Otvori u ISTOJ tabu da nakon instalacije GitHub redirektuje na backend,
    // a backend na FRONTEND_URL/auth/callback – korisnik završi u aplikaciji
    const appName = environment.githubAppName || 'neatcommit';
    const installUrl = `https://github.com/apps/${appName}/installations/new`;
    window.location.href = installUrl;
    this.installationOpened = true;
  }

  startPolling(): void {
    // Proveri svakih 3 sekunde da li je instalacija završena
    this.checkingInterval = setInterval(() => {
      if (!this.checking) {
        this.checkInstallation();
      }
    }, 3000);

    // Takođe proveri odmah
    this.checkInstallation();
  }

  checkInstallation(): void {
    if (!this.userId) {
      return;
    }

    this.checking = true;

    // Proveri da li korisnik sada ima instalaciju
    this.apiService.get<any>('/api/repositories').subscribe({
      next: (response) => {
        this.checking = false;
        
        // Zaustavi polling
        if (this.checkingInterval) {
          clearInterval(this.checkingInterval);
        }

        // Sačuvaj tokene
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        
        // Sačuvaj user-a
        this.authService.setUser(response.user);
        
        // Redirektuj na dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.checking = false;
        
        // Ako installation nije pronađena, nastavi sa polling-om
        if (error.error?.error === 'No installation found for this user' || 
            error.error?.error === 'User not found or not linked to GitHub') {
          // Nastavi sa polling-om - installation možda još nije obradjen
          return;
        }
        
        // Za druge greške, možda treba da se ponovo loguje
        if (error.status === 401 || error.status === 404) {
          // Zaustavi polling
          if (this.checkingInterval) {
            clearInterval(this.checkingInterval);
          }
          this.snackBar.open('Please login again to complete installation', 'Close', {
            duration: 5000,
          });
          this.router.navigate(['/auth/login']);
        }
      },
    });
  }

  manualCheck(): void {
    if (this.checkingInterval) {
      clearInterval(this.checkingInterval);
    }
    this.checkInstallation();
  }
}
