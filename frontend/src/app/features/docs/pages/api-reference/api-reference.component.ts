import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-docs-api-reference',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-reference.component.html',
})
export class DocsApiReferenceComponent implements OnInit {
  constructor(private title: Title) {}

  ngOnInit(): void {
    this.title.setTitle('API Reference - NeatCommit Docs');
  }
}
