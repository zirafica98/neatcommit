import { Routes } from '@angular/router';
import { DocsLayoutComponent } from './docs-layout/docs-layout.component';

export const docsRoutes: Routes = [
  {
    path: '',
    component: DocsLayoutComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/overview.component').then(m => m.DocsOverviewComponent),
      },
      {
        path: 'how-it-works',
        loadComponent: () =>
          import('./pages/how-it-works/how-it-works.component').then(m => m.DocsHowItWorksComponent),
      },
      {
        path: 'tech-stack',
        loadComponent: () =>
          import('./pages/tech-stack/tech-stack.component').then(m => m.DocsTechStackComponent),
      },
      {
        path: 'api',
        loadComponent: () =>
          import('./pages/api-reference/api-reference.component').then(m => m.DocsApiReferenceComponent),
      },
      {
        path: 'components',
        loadComponent: () =>
          import('./pages/components-doc/components-doc.component').then(m => m.DocsComponentsDocComponent),
      },
      { path: '**', redirectTo: 'overview', pathMatch: 'full' },
    ],
  },
];
