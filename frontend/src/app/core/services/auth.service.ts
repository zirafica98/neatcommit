/**
 * Auth Service
 * 
 * Upravlja autentifikacijom i GitHub OAuth flow-om
 */

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User } from '../../shared/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {
    // Load user from storage on init
    this.loadUserFromStorage();
  }

  /**
   * Get current user
   */
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return !!this.currentUser && !!this.getToken();
  }

  /**
   * Check if user is admin
   */
  get isAdmin(): boolean {
    return this.currentUser?.role === 'ADMIN';
  }

  /**
   * Get access token from storage
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Login sa username/password-om
   */
  login(username: string, password: string): Observable<{ user: User; accessToken: string; refreshToken: string }> {
    return this.apiService.post<{ user: User; accessToken: string; refreshToken: string }>('/api/auth/login', {
      username,
      password,
    }).pipe(
      tap((response) => {
        // Store tokens
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        
        // Store user
        this.setUser(response.user);
      }),
      catchError((error) => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Register novog korisnika
   */
  register(username: string, email: string, password: string, name?: string): Observable<{ user: User; accessToken: string; refreshToken: string }> {
    return this.apiService.post<{ user: User; accessToken: string; refreshToken: string }>('/api/auth/register', {
      username,
      email,
      password,
      name,
    }).pipe(
      tap((response) => {
        // Store tokens
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        
        // Store user
        this.setUser(response.user);
      }),
      catchError((error) => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Initiate GitHub OAuth login
   * Redirektuje korisnika na backend OAuth endpoint koji će ga redirektovati na GitHub
   */
  loginWithGitHub(): void {
    // Redirektuj direktno na backend OAuth endpoint
    // Backend će proveriti da li korisnik ima installation i redirektovati ga na GitHub OAuth
    window.location.href = `${environment.apiUrl}/api/auth/github`;
  }

  /**
   * Handle OAuth callback
   */
  handleOAuthCallback(code: string): Observable<User> {
    return this.apiService.post<{ user: User; accessToken: string; refreshToken: string }>('/api/auth/github/callback', { code }).pipe(
      tap((response) => {
        // Store tokens
        localStorage.setItem('access_token', response.accessToken);
        localStorage.setItem('refresh_token', response.refreshToken);
        
        // Store user
        this.setUser(response.user);
      }),
      map((response) => response.user),
      catchError((error) => {
        console.error('OAuth callback error:', error);
        return of(null as any);
      })
    );
  }

  /**
   * Get current user from API
   */
  getCurrentUser(): Observable<User> {
    return this.apiService.get<User>('/api/auth/me').pipe(
      tap((user) => this.setUser(user)),
      catchError((error) => {
        console.error('Get current user error:', error);
        this.logout();
        return of(null as any);
      })
    );
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return of(null as any);
    }

    return this.apiService.post<{ accessToken: string }>('/api/auth/refresh', { refreshToken }).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.accessToken);
      }),
      map((response) => response.accessToken),
      catchError((error) => {
        console.error('Refresh token error:', error);
        this.logout();
        return of(null as any);
      })
    );
  }

  /**
   * Logout
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Set current user
   */
  setUser(user: User | null): void {
    this.currentUserSubject.next(user);
    if (user != null) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }

  /**
   * Load user from storage
   */
  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      if (userStr) localStorage.removeItem('user');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      this.currentUserSubject.next(user);
    } catch (error) {
      console.error('Error parsing user from storage:', error);
      localStorage.removeItem('user');
    }
  }
}
