/**
 * Admin Guard
 * 
 * Zaštita admin ruta - zahteva admin role
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser;

  if (!user) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (user.role !== 'ADMIN') {
    router.navigate(['/app/dashboard']);
    return false;
  }

  return true;
};
