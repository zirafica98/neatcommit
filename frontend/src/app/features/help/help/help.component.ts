/**
 * Help Component
 * 
 * Help sekcija sa FAQ, tutorials i dokumentacijom
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TourService } from '../../../core/services/tour.service';
import { VideoModalComponent } from '../../../shared/components/video-modal/video-modal.component';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatExpansionModule,
    MatButtonModule,
    MatTabsModule,
    MatChipsModule,
    MatDialogModule,
  ],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss',
})
export class HelpComponent implements OnInit {
  faqItems = [
    {
      question: 'How do I connect a repository?',
      answer: 'Go to the Repositories page and click "Add Repository". You can connect repositories where the GitHub App is installed. Once connected, the app will automatically analyze pull requests.',
    },
    {
      question: 'What is a Security Score?',
      answer: 'The Security Score (0-100) measures the overall security quality of your code. Higher scores indicate better security practices. The score is calculated based on the number and severity of security issues found.',
    },
    {
      question: 'How does code analysis work?',
      answer: 'When a pull request is opened, NeatCommit automatically analyzes the code for security vulnerabilities, performance issues, and best practices. The analysis uses both pattern matching and AI-powered code review.',
    },
    {
      question: 'What types of issues are detected?',
      answer: 'NeatCommit detects security vulnerabilities (SQL injection, XSS, etc.), performance issues (N+1 queries, memory leaks), code quality issues, and best practice violations.',
    },
    {
      question: 'Can I generate documentation for my repository?',
      answer: 'Yes! Go to the Documentation page, select a repository, and click "Generate Documentation". The AI will analyze your codebase and create comprehensive documentation in .docx format.',
    },
    {
      question: 'How do I enable/disable analysis for a repository?',
      answer: 'On the Repositories page, use the toggle switch next to each repository to enable or disable automatic code analysis.',
    },
    {
      question: 'What languages are supported?',
      answer: 'NeatCommit supports JavaScript, TypeScript, Java, Python, PHP, C#, SQL, Go, Ruby, and more. The analysis adapts to the detected programming language.',
    },
    {
      question: 'How do I view review details?',
      answer: 'Click on any review card in the Reviews or Dashboard page to see detailed information about issues, code snippets, and suggested fixes.',
    },
  ];

  quickStartSteps = [
    {
      icon: 'account_circle',
      title: 'Sign in with GitHub',
      description: 'Authenticate using your GitHub account to get started.',
    },
    {
      icon: 'folder',
      title: 'Connect Repositories',
      description: 'Install the GitHub App and connect your repositories from the Repositories page.',
    },
    {
      icon: 'code',
      title: 'Open a Pull Request',
      description: 'Create a pull request in your connected repository. NeatCommit will automatically analyze it.',
    },
    {
      icon: 'security',
      title: 'Review Results',
      description: 'Check the Dashboard or Reviews page to see security scores, issues, and recommendations.',
    },
  ];

  videoTutorials = [
    {
      title: 'Getting Started with NeatCommit',
      description: 'Learn how to set up and use NeatCommit for the first time.',
      duration: '5 min',
      category: 'Basics',
      videoUrl: '', // Dodaj YouTube URL ili ostavi prazno za placeholder
      videoType: 'youtube' as 'youtube' | 'vimeo' | 'external',
    },
    {
      title: 'Understanding Security Scores',
      description: 'Learn how security scores are calculated and how to improve them.',
      duration: '8 min',
      category: 'Security',
      videoUrl: '',
      videoType: 'youtube' as 'youtube' | 'vimeo' | 'external',
    },
    {
      title: 'Generating Documentation',
      description: 'Step-by-step guide to generating AI-powered documentation for your projects.',
      duration: '6 min',
      category: 'Documentation',
      videoUrl: '',
      videoType: 'youtube' as 'youtube' | 'vimeo' | 'external',
    },
    {
      title: 'Managing Repositories',
      description: 'How to connect, enable, and manage multiple repositories.',
      duration: '4 min',
      category: 'Management',
      videoUrl: '',
      videoType: 'youtube' as 'youtube' | 'vimeo' | 'external',
    },
  ];

  constructor(
    private tourService: TourService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {}

  startTour(): void {
    this.tourService.resetTour();
    this.tourService.startTour();
  }

  openVideo(tutorial: any): void {
    if (tutorial.videoUrl) {
      // Otvori modal sa video playerom
      this.dialog.open(VideoModalComponent, {
        width: '90%',
        maxWidth: '900px',
        data: {
          title: tutorial.title,
          videoUrl: tutorial.videoUrl,
          videoType: tutorial.videoType,
        },
      });
    } else {
      // Ako nema video URL-a, prikaži poruku
      alert('Video tutorial is coming soon! Check back later for this tutorial.');
    }
  }
}
