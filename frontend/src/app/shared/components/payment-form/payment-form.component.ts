import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Plan } from '../../../core/services/subscription.service';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.scss',
})
export class PaymentFormComponent {
  @Input() plan!: Plan;
  @Input() isDemo: boolean = false;
  @Output() submit = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  paymentForm: FormGroup;

  constructor(private fb: FormBuilder) {
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
  }

  onSubmit(): void {
    console.log('Payment form onSubmit called:', { isDemo: this.isDemo, formValid: this.paymentForm.valid });
    
    // Za demo verziju, uvek dozvoli submit bez validacije
    if (this.isDemo) {
      const paymentData = { demo: true, planId: this.plan.id };
      console.log('Emitting payment data (demo):', paymentData);
      this.submit.emit(paymentData);
    } else if (this.paymentForm.valid) {
      // Za real payment, proveri validnost
      console.log('Emitting payment data (real):', this.paymentForm.value);
      this.submit.emit(this.paymentForm.value);
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
