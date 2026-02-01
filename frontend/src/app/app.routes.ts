import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'repositories',
        loadChildren: () => import('./features/repositories/repositories.routes').then(m => m.repositoriesRoutes),
      },
      {
        path: 'reviews',
        loadChildren: () => import('./features/reviews/reviews.routes').then(m => m.reviewsRoutes),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'documentation',
        loadChildren: () => import('./features/documentation/documentation.routes').then(m => m.documentationRoutes),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
