import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { take } from 'rxjs/operators';

/**
 * Preusmerava korisnika na početnu stranicu u zavisnosti od uloge:
 * Admin -> /admin, običan korisnik -> /dashboard
 */
@Component({
  selector: 'app-home-redirect',
  standalone: true,
  template: `<div class="redirecting">Redirecting...</div>`,
  styles: [`.redirecting { padding: 2rem; text-align: center; color: var(--text-secondary, #666); }`],
})
export class HomeRedirectComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().pipe(take(1)).subscribe({
      next: (user) => {
        if (user?.role === 'ADMIN') {
          this.router.navigate(['/app/admin'], { replaceUrl: true });
        } else {
          this.router.navigate(['/app/dashboard'], { replaceUrl: true });
        }
      },
      error: () => this.router.navigate(['/app/dashboard'], { replaceUrl: true }),
    });
  }
}
