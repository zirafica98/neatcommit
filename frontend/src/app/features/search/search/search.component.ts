/**
 * Search Component
 * 
 * Global search functionality
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SearchService, SearchResult } from '../../../core/services/search.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    RouterModule,
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent implements OnInit {
  searchControl = new FormControl('');
  results: SearchResult | null = null;
  loading = false;
  searchType: 'all' | 'reviews' | 'issues' | 'repositories' = 'all';
  selectedTabIndex = 0;

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {
    // Debounce search input
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query || query.trim().length === 0) {
            this.results = null;
            return [];
          }
          this.loading = true;
          return this.searchService.search({
            q: query,
            type: this.searchType,
            limit: 20,
          });
        })
      )
      .subscribe({
        next: (results) => {
          this.results = results;
          this.loading = false;
        },
        error: (error) => {
          console.error('Search error:', error);
          this.loading = false;
        },
      });
  }

  onSearchTypeChange(index: number): void {
    this.selectedTabIndex = index;
    const types: ('all' | 'reviews' | 'issues' | 'repositories')[] = ['all', 'reviews', 'issues', 'repositories'];
    this.searchType = types[index] || 'all';
    const query = this.searchControl.value;
    if (query && query.trim().length > 0) {
      this.loading = true;
      this.searchService
        .search({
          q: query,
          type: this.searchType,
          limit: 20,
        })
        .subscribe({
          next: (results) => {
            this.results = results;
            this.loading = false;
          },
          error: (error) => {
            console.error('Search error:', error);
            this.loading = false;
          },
        });
    }
  }
}
