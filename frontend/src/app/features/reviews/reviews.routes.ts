import { Routes } from '@angular/router';

export const reviewsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./reviews/reviews.component').then(m => m.ReviewsComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./review-detail/review-detail.component').then(m => m.ReviewDetailComponent),
  },
];
