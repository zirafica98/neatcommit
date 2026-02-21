import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  currentYear = new Date().getFullYear();
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
}
