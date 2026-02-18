import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Plan, SubscriptionService } from '../../../core/services/subscription.service';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.scss',
})
export class PaymentFormComponent implements OnChanges {
  @Input() plan!: Plan;
  @Input() isDemo: boolean = false;
  @Output() submit = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  paymentForm: FormGroup;
  promoCode: string = '';
  promoCodeValidating: boolean = false;
  promoCodeValid: boolean = false;
  promoCodeDiscount: number = 0;
  promoCodeError: string | null = null;
  finalPrice: number = 0;

  constructor(
    private fb: FormBuilder,
    private subscriptionService: SubscriptionService,
    private snackBar: MatSnackBar
  ) {
    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      expiryDate: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
      cardholderName: ['', [Validators.required]],
      billingAddress: ['', [Validators.required]],
      city: ['', [Validators.required]],
      zipCode: ['', [Validators.required]],
      country: ['', [Validators.required]],
    });

    this.finalPrice = this.plan?.price || 0;
  }

  ngOnChanges(): void {
    if (this.plan) {
      this.calculateFinalPrice();
    }
  }

  validatePromoCode(): void {
    if (!this.promoCode || this.promoCode.trim() === '') {
      this.promoCodeValid = false;
      this.promoCodeDiscount = 0;
      this.promoCodeError = null;
      this.calculateFinalPrice();
      return;
    }

    this.promoCodeValidating = true;
    this.promoCodeError = null;

    this.subscriptionService.validatePromoCode(this.promoCode.toUpperCase()).subscribe({
      next: (response) => {
        this.promoCodeValidating = false;
        if (response.valid) {
          this.promoCodeValid = true;
          this.promoCodeDiscount = response.discountPercentage || 0;
          this.calculateFinalPrice();
          this.snackBar.open(`Promo code applied! ${this.promoCodeDiscount}% discount`, 'Close', {
            duration: 3000,
          });
        } else {
          this.promoCodeValid = false;
          this.promoCodeDiscount = 0;
          this.promoCodeError = response.error || 'Invalid promo code';
          this.calculateFinalPrice();
        }
      },
      error: (error) => {
        this.promoCodeValidating = false;
        this.promoCodeValid = false;
        this.promoCodeDiscount = 0;
        this.promoCodeError = error.error?.error || 'Failed to validate promo code';
        this.calculateFinalPrice();
      },
    });
  }

  calculateFinalPrice(): void {
    const originalPrice = this.plan?.price || 0;
    if (this.promoCodeDiscount > 0) {
      const discountAmount = (originalPrice * this.promoCodeDiscount) / 100;
      this.finalPrice = Math.max(0, originalPrice - discountAmount);
    } else {
      this.finalPrice = originalPrice;
    }
  }

  onSubmit(): void {
    console.log('Payment form onSubmit called:', { isDemo: this.isDemo, formValid: this.paymentForm.valid });
    
    // Za demo verziju, uvek dozvoli submit bez validacije
    if (this.isDemo) {
      const paymentData = {
        demo: true,
        planId: this.plan.id,
        promoCode: this.promoCode && this.promoCodeValid ? this.promoCode.toUpperCase() : null,
      };
      console.log('Emitting payment data (demo):', paymentData);
      this.submit.emit(paymentData);
    } else if (this.paymentForm.valid) {
      // Za real payment, proveri validnost
      const paymentData = {
        ...this.paymentForm.value,
        promoCode: this.promoCode && this.promoCodeValid ? this.promoCode.toUpperCase() : null,
      };
      console.log('Emitting payment data (real):', paymentData);
      this.submit.emit(paymentData);
    } else {
      console.log('Form is not valid, cannot submit');
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\s/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    value = value.replace(/(.{4})/g, '$1 ').trim();
    event.target.value = value;
    this.paymentForm.patchValue({ cardNumber: value.replace(/\s/g, '') });
  }

  formatExpiryDate(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    event.target.value = value;
    this.paymentForm.patchValue({ expiryDate: value });
  }
}
