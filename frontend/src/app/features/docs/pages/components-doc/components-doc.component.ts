import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-docs-components',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './components-doc.component.html',
})
export class DocsComponentsDocComponent implements OnInit {
  constructor(private title: Title) {}

  ngOnInit(): void {
    this.title.setTitle('Components - NeatCommit Docs');
  }
}
