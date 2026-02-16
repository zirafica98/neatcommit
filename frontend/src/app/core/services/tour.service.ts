/**
 * Tour Service
 * 
 * Upravlja Welcome Tour funkcionalnošću
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
}

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private tourSteps: TourStep[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'View your security scores, statistics, and recent reviews at a glance. Charts show trends over the last 30 days.',
      target: 'a[routerLink="/dashboard"]',
      position: 'right',
    },
    {
      id: 'repositories',
      title: 'Repositories',
      description: 'Manage your connected repositories. Enable or disable code analysis for each repository.',
      target: 'a[routerLink="/repositories"]',
      position: 'right',
    },
    {
      id: 'reviews',
      title: 'Reviews',
      description: 'Browse all code reviews and see detailed analysis results, issues, and security scores.',
      target: 'a[routerLink="/reviews"]',
      position: 'right',
    },
    {
      id: 'documentation',
      title: 'Documentation',
      description: 'Generate AI-powered documentation for your repositories. Get comprehensive project documentation in .docx format.',
      target: 'a[routerLink="/documentation"]',
      position: 'right',
    },
  ];

  private tourActive$ = new BehaviorSubject<boolean>(false);
  private currentStepIndex$ = new BehaviorSubject<number>(0);
  private tourCompleted$ = new BehaviorSubject<boolean>(this.hasCompletedTour());

  constructor() {}

  get tourActive(): Observable<boolean> {
    return this.tourActive$.asObservable();
  }

  get currentStepIndex(): Observable<number> {
    return this.currentStepIndex$.asObservable();
  }

  get tourCompleted(): Observable<boolean> {
    return this.tourCompleted$.asObservable();
  }

  get steps(): TourStep[] {
    return this.tourSteps;
  }

  startTour(): void {
    this.tourActive$.next(true);
    this.currentStepIndex$.next(0);
  }

  nextStep(): void {
    const currentIndex = this.currentStepIndex$.value;
    if (currentIndex < this.tourSteps.length - 1) {
      this.currentStepIndex$.next(currentIndex + 1);
    } else {
      this.completeTour();
    }
  }

  previousStep(): void {
    const currentIndex = this.currentStepIndex$.value;
    if (currentIndex > 0) {
      this.currentStepIndex$.next(currentIndex - 1);
    }
  }

  skipTour(): void {
    this.completeTour();
  }

  completeTour(): void {
    this.tourActive$.next(false);
    this.tourCompleted$.next(true);
    localStorage.setItem('neatcommit_tour_completed', 'true');
  }

  resetTour(): void {
    localStorage.removeItem('neatcommit_tour_completed');
    this.tourCompleted$.next(false);
  }

  private hasCompletedTour(): boolean {
    return localStorage.getItem('neatcommit_tour_completed') === 'true';
  }

  shouldShowTour(): boolean {
    return !this.hasCompletedTour();
  }
}
