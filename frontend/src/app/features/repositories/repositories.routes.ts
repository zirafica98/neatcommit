import { Routes } from '@angular/router';

export const repositoriesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./repositories/repositories.component').then(m => m.RepositoriesComponent),
  },
];
