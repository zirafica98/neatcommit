import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const searchRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./search/search.component').then(m => m.SearchComponent),
  },
];
