/**
 * Auth Interceptor
 * 
 * Automatski dodaje JWT token u HTTP zahteve
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get token – ne šalji ako je prazan ili string "undefined"/"null" (iz localStorage)
  const token = authService.getToken();
  const hasValidToken = token && token !== 'undefined' && token !== 'null' && token.length > 10;

  if (hasValidToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Handle response
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized, try to refresh token
      if (error.status === 401 && hasValidToken) {
        return authService.refreshToken().pipe(
          switchMap((newToken) => {
            if (newToken) {
              // Retry request with new token
              req = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`,
                },
              });
              return next(req);
            } else {
              // Refresh failed, logout
              authService.logout();
              return throwError(() => error);
            }
          }),
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      // For other errors, just throw
      return throwError(() => error);
    })
  );
};
