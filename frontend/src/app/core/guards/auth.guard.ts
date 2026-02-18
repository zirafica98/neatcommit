/**
 * Auth Guard
 * 
 * Zaštita ruta - zahteva autentifikaciju i validan subscription
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { SubscriptionService } from '../services/subscription.service';
import { PlanSelectionModalComponent } from '../../shared/components/plan-selection-modal/plan-selection-modal.component';
import { firstValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const subscriptionService = inject(SubscriptionService);
  const router = inject(Router);
  const dialog = inject(MatDialog);

  // Proveri autentifikaciju
  if (!authService.isAuthenticated) {
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Proveri da li je korisnik admin - ako jeste, preskoči subscription check
  const currentUser = await firstValueFrom(authService.currentUser$);
  if (currentUser?.role === 'ADMIN') {
    return true;
  }

  // Proveri subscription status
  try {
    const loginCheck = await firstValueFrom(subscriptionService.checkLogin());
    
    if (!loginCheck.allowed) {
      // Ako plan istekne ili nema subscription, otvori modal
      if (loginCheck.needsPlanSelection) {
        const subscriptionInfo = await firstValueFrom(subscriptionService.getSubscription());
        const isExpired = subscriptionInfo.warnings?.isExpired || false;
        const hasUsedFreePlan = subscriptionInfo.subscription?.planType === 'FREE' && isExpired;
        
        const dialogRef = dialog.open(PlanSelectionModalComponent, {
          width: '90vw',
          maxWidth: '1200px',
          disableClose: true,
          data: {
            isFirstLogin: !subscriptionInfo.subscription,
            isExpired: isExpired,
            hasUsedFreePlan: hasUsedFreePlan,
          },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result?.success) {
            router.navigate([state.url]);
          } else {
            // Ako je obavezno, ne dozvoli pristup
            router.navigate(['/auth/login']);
          }
        });

        return false;
      } else {
        // Ako ne može da se loguje iz drugog razloga, redirect na login
        router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking subscription in guard:', error);
    // U slučaju greške, dozvoli pristup (ne blokiraj korisnika)
    return true;
  }
};
