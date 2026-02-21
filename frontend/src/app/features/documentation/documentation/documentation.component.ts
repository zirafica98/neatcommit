import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentationService, Documentation } from '../../../core/services/documentation.service';
import { RepositoryService } from '../../../core/services/repository.service';
import { Repository } from '../../../shared/models';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './documentation.component.html',
  styleUrl: './documentation.component.scss',
})
export class DocumentationComponent implements OnInit {
  repositories: Repository[] = [];
  selectedRepository: Repository | null = null;
  documentations: Documentation[] = [];
  loading = true;
  generating = false;
  error: string | null = null;

  constructor(
    private documentationService: DocumentationService,
    private repositoryService: RepositoryService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRepositories();
    
    // Proveri da li je prosleđen repositoryId u query params
    this.route.queryParams.subscribe((params) => {
      if (params['repositoryId']) {
        this.loadRepositories().then(() => {
          const repo = this.repositories.find((r) => r.id === params['repositoryId']);
          if (repo) {
            this.selectRepository(repo);
          }
        });
      }
    });
  }

  async loadRepositories(): Promise<void> {
    this.loading = true;
    this.error = null;

    this.repositoryService.getRepositories().subscribe({
      next: (response) => {
        this.repositories = response.repositories;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading repositories:', error);
        this.error = 'Failed to load repositories';
        this.loading = false;
      },
    });
  }

  selectRepository(repo: Repository): void {
    console.log('selectRepository called', repo);
    this.selectedRepository = repo;
    this.loadDocumentations(repo.id);
  }

  loadDocumentations(repositoryId: string): void {
    this.documentationService.getDocumentations(repositoryId).subscribe({
      next: (response) => {
        this.documentations = response.documentations;
        console.log('Loaded documentations:', this.documentations);
        // Proveri da li postoji dokumentacija koja je "zaglavljena" u pending statusu (starija od 10 minuta)
        const stuckDocs = this.documentations.filter((doc) => {
          if (doc.status === 'pending' || doc.status === 'processing') {
            const createdAt = new Date(doc.createdAt).getTime();
            const now = Date.now();
            const tenMinutesAgo = now - 10 * 60 * 1000; // 10 minuta
            return createdAt < tenMinutesAgo;
          }
          return false;
        });
        if (stuckDocs.length > 0) {
          console.warn('Found stuck documentations:', stuckDocs);
          // Možemo da prikažemo poruku korisniku ili automatski da obrišemo
        }
      },
      error: (error) => {
        console.error('Error loading documentations:', error);
        this.snackBar.open('Failed to load documentations', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  /**
   * Proverava da li postoji dokumentacija u procesu (pending ili processing)
   */
  get hasDocumentationInProgress(): boolean {
    const inProgress = this.documentations.some(
      (doc) => {
        if (doc.status === 'pending' || doc.status === 'processing') {
          // Proveri da li je "zaglavljena" (starija od 10 minuta)
          const createdAt = new Date(doc.createdAt).getTime();
          const now = Date.now();
          const tenMinutesAgo = now - 10 * 60 * 1000; // 10 minuta
          // Ako je starija od 10 minuta, smatraj je "zaglavljenom" i dozvoli novu generaciju
          return createdAt >= tenMinutesAgo;
        }
        return false;
      }
    );
    console.log('hasDocumentationInProgress:', inProgress, 'documentations:', this.documentations);
    return inProgress;
  }

  generateDocumentation(): void {
    console.log('generateDocumentation called', this.selectedRepository);
    if (!this.selectedRepository) {
      console.warn('No repository selected');
      return;
    }

    this.generating = true;
    this.error = null;

    this.documentationService.generateDocumentation(this.selectedRepository.id).subscribe({
      next: (response) => {
        this.snackBar.open('Documentation generation started', 'Close', {
          duration: 3000,
        });

        // Polluj status dok se ne završi
        this.documentationService.pollDocumentationStatus(response.documentationId).subscribe({
          next: (doc) => {
            if (doc.status === 'completed') {
              this.generating = false;
              this.snackBar.open('Documentation generated successfully!', 'Close', {
                duration: 3000,
              });
              this.loadDocumentations(this.selectedRepository!.id);
            } else if (doc.status === 'failed') {
              this.generating = false;
              this.error = doc.errorMessage || 'Documentation generation failed';
              this.snackBar.open('Documentation generation failed', 'Close', {
                duration: 5000,
              });
              this.loadDocumentations(this.selectedRepository!.id);
            }
          },
          error: (error) => {
            console.error('Error polling documentation status:', error);
            this.generating = false;
          },
        });
      },
      error: (error) => {
        console.error('Error generating documentation:', error);
        console.error('Error details:', {
          status: error.status,
          error: error.error,
          message: error.message,
        });
        this.generating = false;
        
        // Ako već postoji dokumentacija u procesu, prikaži bolju poruku
        if (error.status === 400) {
          const errorMessage = error.error?.error || 'Bad Request';
          if (errorMessage === 'Documentation generation already in progress') {
            this.error = 'Documentation generation is already in progress for this repository';
            this.snackBar.open('Documentation generation is already in progress', 'Close', {
              duration: 5000,
            });
            // Učitaj postojeće dokumentacije da korisnik vidi status
            if (this.selectedRepository) {
              this.loadDocumentations(this.selectedRepository.id);
            }
          } else if (errorMessage === 'Missing repositoryId') {
            this.error = 'Repository ID is missing';
            this.snackBar.open('Repository ID is missing', 'Close', {
              duration: 5000,
            });
          } else {
            this.error = errorMessage;
            this.snackBar.open(errorMessage, 'Close', {
              duration: 5000,
            });
          }
        } else {
          this.error = error.error?.error || 'Failed to start documentation generation';
          this.snackBar.open('Failed to start documentation generation', 'Close', {
            duration: 5000,
          });
        }
      },
    });
  }

  downloadDocumentation(doc: Documentation): void {
    if (!doc.fileUrl) {
      this.snackBar.open('Documentation file not available', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.documentationService.downloadDocumentation(doc.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.fileName || 'documentation.docx';
        link.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Documentation downloaded', 'Close', {
          duration: 3000,
        });
      },
      error: (error) => {
        console.error('Error downloading documentation:', error);
        const isExpired = error.status === 410;
        this.snackBar.open(
          isExpired
            ? 'Download expired or already used. Please generate the documentation again.'
            : 'Failed to download documentation',
          'Close',
          { duration: 5000 }
        );
      },
    });
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'primary';
      case 'processing':
        return 'accent';
      case 'failed':
        return 'warn';
      default:
        return '';
    }
  }
}
