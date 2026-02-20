import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';

const WAIT_SECONDS = 10;

/**
 * Prikazuje se kada backend nije još primio webhook (installation nije u bazi).
 * Čeka WAIT_SECONDS pa šalje korisnika nazad na backend callback – do tada webhook
 * obično upiše instalaciju i callback ga uloguje.
 */
@Component({
  selector: 'app-installation-wait',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './installation-wait.component.html',
  styleUrl: './installation-wait.component.scss',
})
export class InstallationWaitComponent implements OnInit {
  countdown = WAIT_SECONDS;
  installationId: string | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.installationId = params['installation_id'] || null;
      if (!this.installationId) {
        this.router.navigate(['/auth/login'], { queryParams: { error: 'missing_installation_id' } });
        return;
      }
      this.startCountdown();
    });
  }

  private startCountdown(): void {
    this.countdown = WAIT_SECONDS;
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0 && this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        this.redirectToCallback();
      }
    }, 1000);
  }

  private redirectToCallback(): void {
    const url = `${environment.apiUrl}/api/auth/github/callback?installation_id=${this.installationId}`;
    window.location.href = url;
  }

  retryNow(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.redirectToCallback();
  }
}
