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
    // Jednom pri startu: obriši nevažeće vrednosti (string "undefined"/"null") iz localStorage
    this.clearInvalidStorage();
    this.loadUserFromStorage();
  }

  /**
   * Uklanja nevažeće vrednosti iz localStorage da loadUserFromStorage nikad ne dobije "undefined".
   */
  private clearInvalidStorage(): void {
    ['access_token', 'refresh_token'].forEach((key) => {
      const v = localStorage.getItem(key);
      if (v === 'undefined' || v === 'null' || (v != null && v.trim() === '')) {
        localStorage.removeItem(key);
      }
    });
    const userStr = localStorage.getItem('user');
    if (
      userStr === 'undefined' ||
      userStr === 'null' ||
      (userStr != null && (userStr.trim() === '' || !userStr.trim().startsWith('{')))
    ) {
      localStorage.removeItem('user');
    }
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
   * Vraća vrednost iz storage samo ako je validna (ne "undefined"/"null" string).
   * Ako je nevalidna, briše je i vraća null.
   */
  private getValidStorage(key: string): string | null {
    const value = localStorage.getItem(key);
    if (value == null || value === 'undefined' || value === 'null' || value.length < 10) {
      if (value != null) localStorage.removeItem(key);
      return null;
    }
    return value;
  }

  /**
   * Get access token from storage
   */
  getToken(): string | null {
    return this.getValidStorage('access_token');
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken(): string | null {
    return this.getValidStorage('refresh_token');
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
        if (response.accessToken) localStorage.setItem('access_token', response.accessToken);
        if (response.refreshToken) localStorage.setItem('refresh_token', response.refreshToken);
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
        if (response.accessToken) localStorage.setItem('access_token', response.accessToken);
        if (response.refreshToken) localStorage.setItem('refresh_token', response.refreshToken);
        
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
        if (response?.accessToken) localStorage.setItem('access_token', response.accessToken);
        if (response?.refreshToken) localStorage.setItem('refresh_token', response.refreshToken);
        this.setUser(response?.user ?? null);
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
        if (response?.accessToken) localStorage.setItem('access_token', response.accessToken);
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
   * Disconnect GitHub account from NeatCommit.
   * Calls API then logs out and redirects to login.
   */
  disconnectGitHub(): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>('/api/auth/disconnect', {}).pipe(
      tap(() => {
        this.logout();
      }),
      catchError((error) => {
        console.error('Disconnect error:', error);
        return throwError(() => error);
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
   * Load user from storage. Parsira samo validan JSON objekat; nikad ne parsira "undefined"/"null".
   */
  private loadUserFromStorage(): void {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr == null || typeof userStr !== 'string') return;
      const trimmed = userStr.trim();
      if (
        trimmed.length === 0 ||
        trimmed === 'undefined' ||
        trimmed === 'null' ||
        !trimmed.startsWith('{') ||
        !trimmed.endsWith('}')
      ) {
        localStorage.removeItem('user');
        return;
      }
      const user = JSON.parse(userStr);
      if (user && typeof user === 'object') {
        this.currentUserSubject.next(user);
      } else {
        localStorage.removeItem('user');
      }
    } catch {
      localStorage.removeItem('user');
    }
  }
}
