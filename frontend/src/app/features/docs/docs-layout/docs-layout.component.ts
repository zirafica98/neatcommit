import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../../core/services/seo.service';

export interface DocNavItem {
  path: string;
  label: string;
  icon: string;
  fragment?: string;
}

@Component({
  selector: 'app-docs-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './docs-layout.component.html',
  styleUrl: './docs-layout.component.scss',
})
export class DocsLayoutComponent implements OnInit {
  navItems: DocNavItem[] = [
    { path: '/docs/overview', label: 'Overview', icon: 'info' },
    { path: '/docs/how-it-works', label: 'How it works', icon: 'play_circle' },
    { path: '/docs/tech-stack', label: 'Tech stack', icon: 'code' },
    { path: '/docs/api', label: 'API Reference', icon: 'api' },
    { path: '/docs/components', label: 'Components', icon: 'widgets' },
  ];

  apiSections: { fragment: string; label: string }[] = [
    { fragment: 'health', label: 'Health' },
    { fragment: 'auth', label: 'Auth' },
    { fragment: 'documentation', label: 'Documentation' },
    { fragment: 'export', label: 'Export' },
    { fragment: 'search', label: 'Search' },
    { fragment: 'subscription', label: 'Subscription' },
    { fragment: 'admin', label: 'Admin' },
    { fragment: 'webhook', label: 'Webhook' },
  ];

  get isOnApiPage(): boolean {
    return this.router.url.startsWith('/docs/api');
  }

  mobileSidebarOpen = false;

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  constructor(
    public router: Router,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Documentation - NeatCommit',
      description: 'NeatCommit documentation: overview, how it works, tech stack, full API reference, and frontend components for developers.',
      keywords: 'NeatCommit, documentation, API, code review, GitHub, security',
    });
  }
}
