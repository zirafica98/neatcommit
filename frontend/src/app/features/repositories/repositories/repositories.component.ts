import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RepositoryService } from '../../../core/services/repository.service';
import { Repository } from '../../../shared/models';

@Component({
  selector: 'app-repositories',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './repositories.component.html',
  styleUrl: './repositories.component.scss',
})
export class RepositoriesComponent implements OnInit {
  repositories: Repository[] = [];
  loading = true;
  error: string | null = null;
  showAllRepos = false; // Toggle za prikaz svih repozitorijuma sa GitHub-a

  constructor(
    private repositoryService: RepositoryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRepositories();
  }

  loadRepositories(): void {
    this.loading = true;
    this.error = null;

    const request = this.showAllRepos
      ? this.repositoryService.getAllRepositoriesFromGitHub()
      : this.repositoryService.getRepositories();

    request.subscribe({
      next: (response) => {
        this.repositories = response.repositories;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading repositories:', error);
        this.error = 'Failed to load repositories';
        this.loading = false;
        this.snackBar.open('Failed to load repositories', 'Close', {
          duration: 5000,
        });
      },
    });
  }

  toggleView(): void {
    this.showAllRepos = !this.showAllRepos;
    this.loadRepositories();
  }

  addRepositoryToDatabase(repo: Repository): void {
    if (!repo.githubRepoId) {
      this.snackBar.open('Invalid repository', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.repositoryService.addRepository(repo.githubRepoId).subscribe({
      next: (response) => {
        this.snackBar.open('Repository added to database successfully!', 'Close', {
          duration: 3000,
        });
        // Ažuriraj repozitorijum sa novim podacima
        repo.id = response.repository.id;
        repo.enabled = response.repository.enabled;
        // Reload repozitorijume da se osveži lista
        this.loadRepositories();
      },
      error: (error) => {
        console.error('Error adding repository:', error);
        this.snackBar.open(
          error.error?.error || 'Failed to add repository to database',
          'Close',
          {
            duration: 5000,
          }
        );
      },
    });
  }

  toggleRepository(repo: Repository): void {
    // Proveri da li je repozitorijum u bazi (ima pravi ID, ne GitHub ID kao string)
    // Ako nije u bazi, ne možemo ga enable/disable
    if (!repo.id || repo.id === repo.githubRepoId.toString()) {
      // Umesto poruke, ponudi da se doda u bazu
      this.addRepositoryToDatabase(repo);
      return;
    }

    if (repo.enabled) {
      this.repositoryService.disableRepository(repo.id).subscribe({
        next: (updatedRepo) => {
          repo.enabled = updatedRepo.enabled;
          this.snackBar.open('Repository analysis disabled', 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          console.error('Error disabling repository:', error);
          repo.enabled = !repo.enabled; // Revert toggle on error
          this.snackBar.open('Failed to disable repository', 'Close', {
            duration: 5000,
          });
        },
      });
    } else {
      this.repositoryService.enableRepository(repo.id).subscribe({
        next: (updatedRepo) => {
          repo.enabled = updatedRepo.enabled;
          this.snackBar.open('Repository analysis enabled', 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          console.error('Error enabling repository:', error);
          repo.enabled = !repo.enabled; // Revert toggle on error
          this.snackBar.open('Failed to enable repository', 'Close', {
            duration: 5000,
          });
        },
      });
    }
  }

  getLanguageColor(language: string | undefined): string {
    if (!language) return '#9e9e9e';
    
    const colors: Record<string, string> = {
      JavaScript: '#f7df1e',
      TypeScript: '#3178c6',
      Java: '#ed8b00',
      Python: '#3776ab',
      PHP: '#777bb4',
      'C#': '#239120',
      SQL: '#336791',
      Go: '#00add8',
      Ruby: '#cc342d',
    };
    
    return colors[language] || '#9e9e9e';
  }
}
