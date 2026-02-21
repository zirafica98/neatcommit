import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

export interface SeoOptions {
  title: string;
  description?: string;
  /** Keywords comma-separated (optional, many crawlers ignore). */
  keywords?: string;
  /** Canonical URL (optional). */
  canonical?: string;
  /** Open Graph image URL (optional). */
  ogImage?: string;
}

const DEFAULT_TITLE = 'NeatCommit - AI-Powered Security Code Review for GitHub';
const DEFAULT_DESCRIPTION = 'NeatCommit analyzes every pull request for security issues and best practices. Install the GitHub App, open a PR, get AI-powered code review and security scores in minutes. Free tier available.';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  constructor(
    private title: Title,
    private meta: Meta
  ) {}

  /**
   * Set title and meta tags for the current page.
   * Call from route components (e.g. in ngOnInit).
   */
  setPage(options: SeoOptions): void {
    this.title.setTitle(options.title);
    const desc = options.description ?? DEFAULT_DESCRIPTION;
    this.meta.updateTag({ name: 'description', content: desc });

    if (options.keywords) {
      this.meta.updateTag({ name: 'keywords', content: options.keywords });
    }

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: options.title });
    this.meta.updateTag({ property: 'og:description', content: desc });
    if (options.canonical) {
      this.meta.updateTag({ property: 'og:url', content: options.canonical });
    }
    if (options.ogImage) {
      this.meta.updateTag({ property: 'og:image', content: options.ogImage });
    }

    // Twitter
    this.meta.updateTag({ name: 'twitter:title', content: options.title });
    this.meta.updateTag({ name: 'twitter:description', content: desc });
  }

  /**
   * Reset to default home meta (e.g. when navigating back to landing).
   */
  setDefaults(): void {
    this.title.setTitle(DEFAULT_TITLE);
    this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
    this.meta.updateTag({ property: 'og:title', content: DEFAULT_TITLE });
    this.meta.updateTag({ property: 'og:description', content: DEFAULT_DESCRIPTION });
    this.meta.updateTag({ name: 'twitter:title', content: DEFAULT_TITLE });
    this.meta.updateTag({ name: 'twitter:description', content: DEFAULT_DESCRIPTION });
  }
}
