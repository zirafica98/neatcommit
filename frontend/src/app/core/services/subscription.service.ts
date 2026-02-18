/**
 * Subscription Service
 * 
 * Frontend servis za subscription management
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Subscription {
  id: string;
  planType: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIALING';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  reviewsUsedThisMonth: number;
  repositoriesCount: number;
}

export interface PlanLimits {
  reviewsPerMonth: number | null;
  repositories: number | null;
  llmModel: string;
  advancedSecurity: boolean;
  analytics: boolean;
  emailNotifications: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
}

export interface SubscriptionInfo {
  subscription: Subscription | null;
  limits: (PlanLimits & {
    planType: 'FREE' | 'PRO' | 'ENTERPRISE';
    usage: {
      reviewsUsed: number;
      repositoriesUsed: number;
    };
  }) | null;
  warnings?: {
    isExpired: boolean;
    isExpiringSoon: boolean;
    daysUntilExpiry: number;
  };
  needsPlanSelection?: boolean;
}

export interface LoginCheck {
  allowed: boolean;
  reason?: string;
  needsPlanSelection?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  limits: PlanLimits;
  features: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  constructor(private apiService: ApiService) {}

  /**
   * Dohvata subscription informacije za ulogovanog korisnika
   */
  getSubscription(): Observable<SubscriptionInfo> {
    return this.apiService.get<SubscriptionInfo>('/api/subscription');
  }

  /**
   * Dohvata sve dostupne planove
   */
  getPlans(): Observable<{ plans: Plan[] }> {
    return this.apiService.get<{ plans: Plan[] }>('/api/subscription/plans');
  }

  /**
   * Validira promo code
   */
  validatePromoCode(code: string): Observable<{ valid: boolean; code?: string; discountPercentage?: number; error?: string }> {
    return this.apiService.post('/api/subscription/validate-promo-code', { code });
  }

  /**
   * Upgrade subscription plan
   */
  upgradePlan(planType: 'FREE' | 'PRO' | 'ENTERPRISE', paymentData?: any, isDemo: boolean = false, promoCode?: string | null): Observable<any> {
    return this.apiService.post('/api/subscription/upgrade', { planType, paymentData, isDemo, promoCode });
  }

  /**
   * Kreira novi subscription (za prvi login)
   */
  createSubscription(planType: 'FREE' | 'PRO' | 'ENTERPRISE', isDemo: boolean = false): Observable<any> {
    return this.apiService.post('/api/subscription/create', { planType, isDemo });
  }

  /**
   * Proverava da li korisnik može da se loguje
   */
  checkLogin(): Observable<LoginCheck> {
    return this.apiService.get<LoginCheck>('/api/subscription/check-login');
  }

  /**
   * Proverava da li je korisnik već koristio FREE plan ili imao paid plan
   */
  checkFreePlanUsage(): Observable<{ hasUsedFreePlan: boolean; hasHadPaidPlan: boolean; canUseFreePlan: boolean }> {
    return this.apiService.get<{ hasUsedFreePlan: boolean; hasHadPaidPlan: boolean; canUseFreePlan: boolean }>('/api/subscription/check-free-plan');
  }
}
