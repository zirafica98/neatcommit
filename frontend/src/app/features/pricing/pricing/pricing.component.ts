import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { SubscriptionService, Plan, SubscriptionInfo } from '../../../core/services/subscription.service';
import { PaymentFormComponent } from '../../../shared/components/payment-form/payment-form.component';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    RouterModule,
    PaymentFormComponent,
  ],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
})
export class PricingComponent implements OnInit {
  plans: Plan[] = [];
  currentSubscription: SubscriptionInfo | null = null;
  loading = true;
  upgrading = false;
  error: string | null = null;
  selectedPlan: Plan | null = null;
  showPaymentForm = false;
  canUseFreePlan = false; // Inicijalno false dok se ne proveri

  constructor(
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    // Prvo proveri da li može da koristi FREE plan
    this.checkFreePlanAvailability();

    // Load plans and subscription in parallel
    this.subscriptionService.getPlans().subscribe({
      next: (response) => {
        this.plans = response.plans;
        this.loadSubscription();
      },
      error: (error) => {
        console.error('Error loading plans:', error);
        this.error = 'Failed to load pricing plans';
        this.loading = false;
      },
    });
  }

  loadSubscription(): void {
    this.subscriptionService.getSubscription().subscribe({
      next: (subscription) => {
        this.currentSubscription = subscription;
        this.loading = false;
        // Proveri da li može da koristi FREE plan
        this.checkFreePlanAvailability();
      },
      error: (error) => {
        console.error('Error loading subscription:', error);
        this.error = 'Failed to load subscription information';
        this.loading = false;
      },
    });
  }

  checkFreePlanAvailability(): void {
    this.subscriptionService.checkFreePlanUsage().subscribe({
      next: (response) => {
        this.canUseFreePlan = response.canUseFreePlan;
      },
      error: (error) => {
        console.error('Error checking free plan availability:', error);
      },
    });
  }

  upgradePlan(planId: string): void {
    if (this.upgrading) return;

    const currentPlan = this.currentSubscription?.subscription?.planType;
    if (currentPlan === planId) {
      return; // Already on this plan
    }

    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      this.error = 'Plan not found';
      return;
    }

    // Ako je FREE plan i već je koristio ili imao paid plan, ne dozvoli
    if (planId === 'FREE') {
      if (!this.canUseFreePlan) {
        this.error = 'You cannot select the FREE plan. You have already used it or had a paid plan. Please select PRO or ENTERPRISE.';
        return;
      }
      this.proceedWithUpgrade(planId);
    } else {
      // Za PRO i ENTERPRISE, prikaži payment formu na stranici
      this.selectedPlan = plan;
      this.showPaymentForm = true;
      this.error = null;
    }
  }

  onPaymentSubmit(paymentData: any): void {
    if (!this.selectedPlan) return;
    const promoCode = paymentData?.promoCode || null;
    this.proceedWithUpgrade(this.selectedPlan.id, true, paymentData, promoCode);
  }

  onPaymentCancel(): void {
    this.showPaymentForm = false;
    this.selectedPlan = null;
  }

  private proceedWithUpgrade(planId: string, isDemo: boolean = true, paymentData?: any, promoCode?: string | null): void {
    this.upgrading = true;
    this.error = null;

    this.subscriptionService.upgradePlan(planId as 'FREE' | 'PRO' | 'ENTERPRISE', paymentData, isDemo, promoCode).subscribe({
      next: () => {
        this.upgrading = false;
        this.showPaymentForm = false;
        this.selectedPlan = null;
        
        // Real-time update - osveži sve podatke odmah bez loading indikatora
        // Osveži subscription i plans paralelno
        this.subscriptionService.getSubscription().subscribe({
          next: (subscription) => {
            this.currentSubscription = subscription;
          },
          error: (error) => {
            console.error('Error reloading subscription:', error);
          },
        });

        this.subscriptionService.getPlans().subscribe({
          next: (response) => {
            this.plans = response.plans;
          },
          error: (error) => {
            console.error('Error reloading plans:', error);
          },
        });

        // Proveri free plan availability
        this.checkFreePlanAvailability();
      },
      error: (error) => {
        console.error('Error upgrading plan:', error);
        this.error = error.error?.error || 'Failed to upgrade plan. Please try again.';
        this.upgrading = false;
      },
    });
  }

  isCurrentPlan(planId: string): boolean {
    return this.currentSubscription?.subscription?.planType === planId;
  }

  getPlanColor(planId: string): string {
    switch (planId) {
      case 'FREE':
        return '#9e9e9e';
      case 'PRO':
        return '#667eea';
      case 'ENTERPRISE':
        return '#f59e0b';
      default:
        return '#9e9e9e';
    }
  }

  getUsagePercentage(used: number, limit: number | null): number {
    if (limit === null) return 0; // Unlimited
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  }
}
