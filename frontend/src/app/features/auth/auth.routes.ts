import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'install',
    loadComponent: () => import('./install/install.component').then(m => m.InstallComponent),
  },
  {
    path: 'installation-wait',
    loadComponent: () => import('./installation-wait/installation-wait.component').then(m => m.InstallationWaitComponent),
  },
  {
    path: 'callback',
    loadComponent: () => import('./callback/callback.component').then(m => m.CallbackComponent),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
