/**
 * Welcome Tour Component
 * 
 * Step-by-step tour za nove korisnike
 */

import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { TourService, TourStep } from '../../../core/services/tour.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-welcome-tour',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './welcome-tour.component.html',
  styleUrl: './welcome-tour.component.scss',
})
export class WelcomeTourComponent implements OnInit, OnDestroy {
  @ViewChild('tourOverlay') tourOverlay!: ElementRef<HTMLDivElement>;
  @ViewChild('tourTooltip') tourTooltip!: ElementRef<HTMLDivElement>;

  tourActive = false;
  currentStepIndex = 0;
  currentStep: TourStep | null = null;
  targetElement: HTMLElement | null = null;
  /** Tour se ne prikazuje na auth stranicama (login, install, callback, installation-wait). */
  isOnAuthRoute = false;

  /** Tour se prikazuje samo unutar app-a (/app/...), nikad na sajtu (/, /docs, /news). */
  isOnAppRoute = false;

  /** Da li smo već pokrenuli auto-tour u ovoj sesiji (samo prvi put kad uđe u app). */
  private hasAutoStartedThisSession = false;

  private subscriptions = new Subscription();

  constructor(
    public tourService: TourService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.updateRouteFlags(this.router.url);

    this.subscriptions.add(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd)
      ).subscribe((e) => {
        this.updateRouteFlags(e.urlAfterRedirects);
        if ((this.isOnAuthRoute || !this.isOnAppRoute) && this.tourActive) {
          this.tourService.skipTour();
        }
        // Auto-start tour prvi put kad korisnik uđe u /app (npr. posle logina)
        if (
          !this.hasAutoStartedThisSession &&
          this.isOnAppRoute &&
          !this.isOnAuthRoute &&
          this.tourService.shouldShowTour()
        ) {
          this.hasAutoStartedThisSession = true;
          setTimeout(() => this.tourService.startTour(), 1000);
        }
      })
    );

    // Subscribe na tour status
    this.subscriptions.add(
      this.tourService.tourActive.subscribe((active) => {
        this.tourActive = active;
        if (active) {
          setTimeout(() => this.updateTourStep(), 100);
        }
      })
    );

    this.subscriptions.add(
      this.tourService.currentStepIndex.subscribe((index) => {
        this.currentStepIndex = index;
        this.updateTourStep();
      })
    );

    // Auto-start tour ako je već na /app pri učitavanju (inace se pokreće u router subscription)
    if (
      !this.hasAutoStartedThisSession &&
      this.tourService.shouldShowTour() &&
      this.isOnAppRoute &&
      !this.isOnAuthRoute
    ) {
      this.hasAutoStartedThisSession = true;
      setTimeout(() => this.tourService.startTour(), 1000);
    }
  }

  private updateRouteFlags(url: string): void {
    this.isOnAuthRoute = url.startsWith('/auth');
    this.isOnAppRoute = url.startsWith('/app');
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  updateTourStep(): void {
    if (!this.tourActive) {
      this.currentStep = null;
      this.targetElement = null;
      return;
    }

    const steps = this.tourService.steps;
    if (this.currentStepIndex >= 0 && this.currentStepIndex < steps.length) {
      this.currentStep = steps[this.currentStepIndex];
      
      // Pronađi target element
      setTimeout(() => {
        const element = document.querySelector(this.currentStep!.target) as HTMLElement;
        if (element) {
          this.targetElement = element;
          this.positionTooltip();
        }
      }, 100);
    }
  }

  positionTooltip(): void {
    if (!this.targetElement || !this.tourTooltip) return;

    const rect = this.targetElement.getBoundingClientRect();
    const tooltip = this.tourTooltip.nativeElement;
    const position = this.currentStep?.position || 'right';

    let top = 0;
    let left = 0;

    switch (position) {
      case 'right':
        top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2;
        left = rect.right + 20;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2;
        left = rect.left - tooltip.offsetWidth - 20;
        break;
      case 'top':
        top = rect.top - tooltip.offsetHeight - 20;
        left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 20) left = 20;
    if (left + tooltip.offsetWidth > viewportWidth - 20) {
      left = viewportWidth - tooltip.offsetWidth - 20;
    }
    if (top < 20) top = 20;
    if (top + tooltip.offsetHeight > viewportHeight - 20) {
      top = viewportHeight - tooltip.offsetHeight - 20;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  nextStep(): void {
    this.tourService.nextStep();
  }

  previousStep(): void {
    this.tourService.previousStep();
  }

  skipTour(): void {
    this.tourService.skipTour();
  }

  get progress(): number {
    const steps = this.tourService.steps;
    return steps.length > 0 ? ((this.currentStepIndex + 1) / steps.length) * 100 : 0;
  }

  get isFirstStep(): boolean {
    return this.currentStepIndex === 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.tourService.steps.length - 1;
  }

  getHighlightStyle(): string {
    if (!this.targetElement) return '';
    
    const rect = this.targetElement.getBoundingClientRect();
    return `
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
    `;
  }
}
