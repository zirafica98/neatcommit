import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SubscriptionService, Plan } from '../../../core/services/subscription.service';
import { SeoService } from '../../../core/services/seo.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  /** Planovi učitani iz API-ja – isti izvor kao u app-u (/api/subscription/plans). */
  plans: Plan[] = [];
  plansLoading = true;
  plansError: string | null = null;
  /** Otvoren mobilni meni (hamburger). */
  mobileMenuOpen = false;
  private faqScriptEl: HTMLScriptElement | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private seo: SeoService,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  ngOnInit(): void {
    this.seo.setDefaults();
    this.injectFaqSchema();
    this.subscriptionService.getPlans().subscribe({
      next: (res) => {
        this.plans = res.plans;
        this.plansLoading = false;
      },
      error: () => {
        this.plansError = 'Pricing unavailable. Please try again later.';
        this.plansLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    if (this.faqScriptEl?.parentNode) {
      this.faqScriptEl.parentNode.removeChild(this.faqScriptEl);
    }
  }

  private injectFaqSchema(): void {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: this.faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    };
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(faqSchema);
    this.doc.body.appendChild(script);
    this.faqScriptEl = script;
  }

  getPlanPriceDisplay(plan: Plan): string {
    return plan.price === 0 ? '$0' : `$${plan.price}`;
  }

  getPlanIntervalDisplay(plan: Plan): string {
    return `/${plan.interval}`;
  }

  features = [
    {
      icon: 'security',
      title: 'Security-first code review',
      description: 'Automated analysis of every pull request. Catch vulnerabilities and improve code quality before merge.',
    },
    {
      icon: 'insights',
      title: 'Actionable insights',
      description: 'Clear severity levels, file locations, and suggested fixes. No noise—only what matters.',
    },
    {
      icon: 'speed',
      title: 'Fast & integrated',
      description: 'Runs on your existing GitHub workflow. Install the app, open a PR, get results in minutes.',
    },
    {
      icon: 'description',
      title: 'AI documentation',
      description: 'Generate project documentation from your codebase. One click, one .docx file.',
    },
  ];

  faqItems = [
    {
      question: 'How do I connect a repository?',
      answer: 'Sign in with GitHub, then install the NeatCommit GitHub App. Choose which repositories to enable. Once connected, we analyze every new pull request automatically.',
      open: false,
    },
    {
      question: 'What is a Security Score?',
      answer: 'The Security Score (0–100) reflects the overall security quality of the code in a pull request. It’s based on the number and severity of issues we find. Higher is better.',
      open: false,
    },
    {
      question: 'What kinds of issues are detected?',
      answer: 'We look for security vulnerabilities (e.g. SQL injection, XSS), performance issues, and common best-practice violations. The analysis adapts to the language of your repo.',
      open: false,
    },
    {
      question: 'Can I try NeatCommit for free?',
      answer: 'Yes. The FREE plan lets you run a limited number of reviews per month with one repository. No credit card required to start.',
      open: false,
    },
    {
      question: 'How does the GitHub integration work?',
      answer: 'NeatCommit runs as a GitHub App. When you open a pull request in a connected repo, we analyze the diff and report results in your NeatCommit dashboard. No code changes or CI config required.',
      open: false,
    },
  ];

  toggleFaq(item: { open: boolean }): void {
    item.open = !item.open;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
}
