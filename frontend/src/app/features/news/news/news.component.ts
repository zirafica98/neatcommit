import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

export interface NewsItem {
  date: string;
  title: string;
  body: string;
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss',
})
export class NewsComponent {
  /** Ažuriraj ovu listu kada objavljuješ novosti. */
  newsItems: NewsItem[] = [
    {
      date: '2025-02-20',
      title: 'Welcome to NeatCommit',
      body: 'We\'re building NeatCommit to make security-focused code review simple for every team. In the coming weeks we\'ll focus on stability, more languages, and a smoother onboarding flow.',
    },
    {
      date: '2025-02-20',
      title: 'Roadmap preview',
      body: 'Planned for the next period: improved AI documentation export, more granular repository settings, email digest for weekly security summaries, and better handling of large monorepos.',
    },
  ];
}
