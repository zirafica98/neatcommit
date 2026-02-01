/**
 * Documentation Service
 * 
 * Upravlja generisanjem i preuzimanjem dokumentacije
 */

import { Injectable } from '@angular/core';
import { Observable, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface Documentation {
  id: string;
  repositoryId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  totalFiles?: number;
  totalLines?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  repository?: {
    id: string;
    name: string;
    fullName: string;
    owner: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class DocumentationService {
  constructor(private apiService: ApiService) {}

  /**
   * Pokreće generisanje dokumentacije za repozitorijum
   */
  generateDocumentation(repositoryId: string): Observable<{ success: boolean; documentationId: string; status: string; message: string }> {
    return this.apiService.post<{ success: boolean; documentationId: string; status: string; message: string }>(
      '/api/documentation/generate',
      { repositoryId }
    );
  }

  /**
   * Dobija status dokumentacije
   */
  getDocumentation(id: string): Observable<Documentation> {
    return this.apiService.get<Documentation>(`/api/documentation/${id}`);
  }

  /**
   * Dobija listu dokumentacija za repozitorijum
   */
  getDocumentations(repositoryId: string): Observable<{ count: number; documentations: Documentation[] }> {
    return this.apiService.get<{ count: number; documentations: Documentation[] }>(
      `/api/documentation/repository/${repositoryId}`
    );
  }

  /**
   * Preuzima .doc fajl sa dokumentacijom
   */
  downloadDocumentation(id: string): Observable<Blob> {
    return this.apiService.getBlob(`/api/documentation/${id}/download`);
  }

  /**
   * Polluje status dokumentacije dok se ne završi
   */
  pollDocumentationStatus(id: string): Observable<Documentation> {
    return interval(2000).pipe(
      switchMap(() => this.getDocumentation(id)),
      takeWhile((doc) => doc.status === 'pending' || doc.status === 'processing', true)
    );
  }
}
