import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubscriptionService, Plan } from '../../../core/services/subscription.service';
import { PaymentFormComponent } from '../payment-form/payment-form.component';

export interface PlanSelectionModalData {
  isFirstLogin?: boolean;
  isExpired?: boolean;
  hasUsedFreePlan?: boolean;
}

@Component({
  selector: 'app-plan-selection-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PaymentFormComponent,
  ],
  templateUrl: './plan-selection-modal.component.html',
  styleUrl: './plan-selection-modal.component.scss',
})
export class PlanSelectionModalComponent implements OnInit {
  plans: Plan[] = [];
  selectedPlan: Plan | null = null;
  loading = true;
  showPaymentForm = false;
  creating = false;
  error: string | null = null;
  hasUsedFreePlan = false;
  hasHadPaidPlan = false;
  canUseFreePlan = true;

  constructor(
    public dialogRef: MatDialogRef<PlanSelectionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PlanSelectionModalData,
    private subscriptionService: SubscriptionService
  ) {
    this.hasUsedFreePlan = data.hasUsedFreePlan || false;
  }

  ngOnInit(): void {
    this.loadPlans();
    this.checkFreePlanUsage();
  }

  loadPlans(): void {
    this.loading = true;
    this.subscriptionService.getPlans().subscribe({
      next: (response) => {
        this.plans = response.plans;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading plans:', error);
        this.error = 'Failed to load plans';
        this.loading = false;
      },
    });
  }

  checkFreePlanUsage(): void {
    this.subscriptionService.checkFreePlanUsage().subscribe({
      next: (response) => {
        this.hasUsedFreePlan = response.hasUsedFreePlan;
        this.hasHadPaidPlan = response.hasHadPaidPlan;
        this.canUseFreePlan = response.canUseFreePlan;
      },
      error: (error) => {
        console.error('Error checking free plan usage:', error);
      },
    });
  }

  selectPlan(plan: Plan): void {
    console.log('selectPlan called:', plan.id, { creating: this.creating, canUseFreePlan: this.canUseFreePlan });
    
    // Ako je FREE plan i ne može da se koristi, ne dozvoli
    if (plan.id === 'FREE' && !this.canUseFreePlan) {
      this.error = 'You cannot select the FREE plan. You have already used it or had a paid plan. Please select PRO or ENTERPRISE.';
      return;
    }

    // Ako je već u procesu kreiranja, ne dozvoli
    if (this.creating) {
      console.log('Already creating, ignoring click');
      return;
    }

    this.selectedPlan = plan;
    this.error = null;

    // Ako je FREE plan, direktno kreiraj (bez payment forme)
    if (plan.id === 'FREE') {
      console.log('Creating FREE subscription');
      this.createSubscription(plan.id, true);
    } else {
      // Za PRO i ENTERPRISE, prikaži payment formu
      console.log('Showing payment form for:', plan.id);
      this.showPaymentForm = true;
    }
  }

  createSubscription(planType: 'FREE' | 'PRO' | 'ENTERPRISE', isDemo: boolean = false, paymentData?: any): void {
    if (this.creating) {
      console.log('Already creating subscription, ignoring');
      return;
    }

    console.log('createSubscription called:', { planType, isDemo, paymentData });
    this.creating = true;
    this.error = null;

    if (planType === 'FREE') {
      console.log('Calling createSubscription API for FREE plan');
      this.subscriptionService.createSubscription(planType, isDemo).subscribe({
        next: (response) => {
          console.log('Subscription created successfully:', response);
          this.creating = false;
          this.dialogRef.close({ success: true, planType });
        },
        error: (error) => {
          console.error('Error creating subscription:', error);
          this.error = error.error?.error || 'Failed to create subscription';
          this.creating = false;
        },
      });
    } else {
      console.log('Calling upgradePlan API for', planType);
      this.subscriptionService.upgradePlan(planType, paymentData, isDemo).subscribe({
        next: (response) => {
          console.log('Subscription upgraded successfully:', response);
          this.creating = false;
          // Ažuriraj canUseFreePlan nakon upgrade-a na paid plan
          if (planType === 'PRO' || planType === 'ENTERPRISE') {
            this.checkFreePlanUsage();
          }
          this.dialogRef.close({ success: true, planType });
        },
        error: (error) => {
          console.error('Error upgrading subscription:', error);
          this.error = error.error?.error || 'Failed to upgrade subscription';
          this.creating = false;
        },
      });
    }
  }

  onPaymentSubmit(paymentData: any): void {
    if (!this.selectedPlan) return;
    this.createSubscription(this.selectedPlan.id as 'FREE' | 'PRO' | 'ENTERPRISE', true, paymentData);
  }

  onPaymentCancel(): void {
    this.showPaymentForm = false;
    this.selectedPlan = null;
  }

  close(): void {
    // Ne dozvoli zatvaranje ako je obavezno (prvi login ili istekao plan)
    if (this.data.isFirstLogin || this.data.isExpired) {
      return;
    }
    this.dialogRef.close();
  }

  canSelectPlan(plan: Plan): boolean {
    // Ako je već u procesu kreiranja, ne dozvoli
    if (this.creating) {
      return false;
    }
    
    // Ako je FREE plan i ne može da se koristi, ne dozvoli
    if (plan.id === 'FREE' && !this.canUseFreePlan) {
      return false;
    }
    
    return true;
  }
}
