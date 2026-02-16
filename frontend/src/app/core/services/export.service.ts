/**
 * Export Service
 * 
 * Frontend servis za export podataka
 */

import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  constructor(private apiService: ApiService) {}

  /**
   * Export review u PDF
   */
  exportReviewToPDF(reviewId: string): void {
    const url = `/api/export/review/${reviewId}/pdf`;
    this.downloadFile(url, `review-${reviewId}.pdf`);
  }

  /**
   * Export issues u CSV
   */
  exportIssuesToCSV(severity?: string, reviewId?: string): void {
    const params: any = {};
    if (severity) params.severity = severity;
    if (reviewId) params.reviewId = reviewId;

    const queryString = new URLSearchParams(params).toString();
    const url = `/api/export/issues/csv${queryString ? '?' + queryString : ''}`;
    this.downloadFile(url, 'issues.csv');
  }

  /**
   * Export statistika u Excel
   */
  exportStatsToExcel(): void {
    const url = '/api/export/stats/excel';
    this.downloadFile(url, 'statistics.xlsx');
  }

  /**
   * Helper metoda za download fajlova
   */
  private downloadFile(url: string, filename: string): void {
    this.apiService.getBlob(url).subscribe({
      next: (blob) => {
        console.log('Blob received:', {
          size: blob.size,
          type: blob.type,
          filename,
        });

        if (blob.size === 0) {
          console.error('Received empty blob');
          alert('The exported file is empty. Please check if you have data to export.');
          return;
        }

        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      },
      error: (error) => {
        console.error('Export error:', error);
        alert('Failed to export file. Please try again.');
      },
    });
  }
}
