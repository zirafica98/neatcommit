/**
 * Search Service
 * 
 * Frontend service for search functionality
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SearchResult {
  reviews: any[];
  issues: any[];
  repositories: any[];
  total: number;
}

export interface SearchOptions {
  q: string;
  type?: 'reviews' | 'issues' | 'repositories' | 'all';
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  constructor(private apiService: ApiService) {}

  /**
   * Search across reviews, issues, and repositories
   */
  search(options: SearchOptions): Observable<SearchResult> {
    const params: Record<string, any> = {
      q: options.q,
    };

    if (options.type) {
      params['type'] = options.type;
    }
    if (options.limit) {
      params['limit'] = options.limit.toString();
    }
    if (options.offset) {
      params['offset'] = options.offset.toString();
    }

    return this.apiService.get<SearchResult>('/api/search', params);
  }
}
