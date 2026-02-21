import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map, takeUntil, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  sidenavOpened = true;
  isMobile = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    public themeService: ThemeService,
    private breakpointObserver: BreakpointObserver,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.breakpointObserver
      .observe('(max-width: 768px)')
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.isMobile = state.matches;
        this.sidenavOpened = !this.isMobile;
      });
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      )
      .subscribe(() => {
        if (this.isMobile) this.sidenavOpened = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentUser$() {
    return this.authService.currentUser$;
  }

  get isAdmin$() {
    return this.authService.currentUser$.pipe(
      map((user) => user?.role === 'ADMIN')
    );
  }

  get isDarkTheme$() {
    return this.themeService.theme$;
  }

  get isDarkTheme(): boolean {
    return this.themeService.getCurrentTheme() === 'dark';
  }

  logout(): void {
    this.authService.logout();
  }

  toggleSidenav(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }

  closeSidenavIfMobile(): void {
    if (this.isMobile) this.sidenavOpened = false;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
