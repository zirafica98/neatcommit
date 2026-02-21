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
}
