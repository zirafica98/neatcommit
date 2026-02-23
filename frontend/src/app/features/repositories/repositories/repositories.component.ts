import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RepositoryService } from '../../../core/services/repository.service';
import { AuthService } from '../../../core/services/auth.service';
import { Repository } from '../../../shared/models';

@Component({
  selector: 'app-repositories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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

  // GitLab
  gitlabToken = '';
  gitlabProjectId = '';
  gitlabFullName = '';
  gitlabName = '';
  gitlabDefaultBranch = 'main';
  gitlabConnecting = false;
  gitlabAdding = false;
  showGitLabForm = false;
  bitbucketUsername = '';
  bitbucketToken = '';
  bitbucketWorkspace = '';
  bitbucketRepoSlug = '';
  bitbucketFullName = '';
  bitbucketName = '';
  bitbucketDefaultBranch = 'main';
  bitbucketConnecting = false;
  bitbucketAdding = false;
  showBitbucketForm = false;

  constructor(
    private repositoryService: RepositoryService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  get currentProvider(): 'github' | 'gitlab' | 'bitbucket' {
    return this.authService.currentProvider;
  }

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
        this.error = error.error?.error || 'Failed to load repositories';
        this.loading = false;
        this.snackBar.open(this.error || 'Failed to load repositories', 'Close', {
          duration: 7000,
        });
      },
    });
  }

  toggleView(): void {
    this.showAllRepos = !this.showAllRepos;
    this.loadRepositories();
  }

  addRepositoryToDatabase(repo: Repository): void {
    if (repo.provider === 'gitlab') {
      this.snackBar.open('GitLab projects are added via the Add GitLab project form below.', 'Close', {
        duration: 4000,
      });
      return;
    }
    if (repo.provider === 'bitbucket') {
      this.snackBar.open('Bitbucket repos are added via the Add Bitbucket repository form below.', 'Close', {
        duration: 4000,
      });
      return;
    }
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
    const isGitHubIdAsString = repo.provider !== 'gitlab' && repo.provider !== 'bitbucket' && repo.id === repo.githubRepoId?.toString();
    if (!repo.id || isGitHubIdAsString) {
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

  connectGitLab(): void {
    if (!this.gitlabToken.trim()) {
      this.snackBar.open('Enter your GitLab access token', 'Close', { duration: 3000 });
      return;
    }
    this.gitlabConnecting = true;
    this.repositoryService.connectGitLab(this.gitlabToken.trim()).subscribe({
      next: () => {
        this.gitlabConnecting = false;
        this.snackBar.open('GitLab connected. You can now add projects below.', 'Close', {
          duration: 4000,
        });
        this.loadRepositories();
      },
      error: (err) => {
        this.gitlabConnecting = false;
        this.snackBar.open(err.error?.error || err.error?.message || 'Failed to connect GitLab', 'Close', {
          duration: 5000,
        });
      },
    });
  }

  connectBitbucket(): void {
    if (!this.bitbucketToken.trim()) {
      this.snackBar.open('Enter your Bitbucket app password', 'Close', { duration: 3000 });
      return;
    }
    this.bitbucketConnecting = true;
    this.repositoryService.connectBitbucket(this.bitbucketUsername.trim() || 'x-token-auth', this.bitbucketToken.trim()).subscribe({
      next: () => {
        this.bitbucketConnecting = false;
        this.snackBar.open('Bitbucket connected. You can now add repositories below.', 'Close', {
          duration: 4000,
        });
        this.loadRepositories();
      },
      error: (err) => {
        this.bitbucketConnecting = false;
        this.snackBar.open(err.error?.error || err.error?.message || 'Failed to connect Bitbucket', 'Close', {
          duration: 5000,
        });
      },
    });
  }

  addBitbucketProject(): void {
    const workspace = this.bitbucketWorkspace.trim();
    const repoSlug = this.bitbucketRepoSlug.trim();
    const fullName = this.bitbucketFullName.trim();
    const name = this.bitbucketName.trim();
    if (!workspace || !repoSlug || !fullName || !name) {
      this.snackBar.open('Fill workspace, repo slug, full path (e.g. workspace/repo), and name', 'Close', {
        duration: 4000,
      });
      return;
    }
    this.bitbucketAdding = true;
    this.repositoryService.addBitbucketRepository(workspace, repoSlug, fullName, name, this.bitbucketDefaultBranch || undefined).subscribe({
      next: () => {
        this.bitbucketAdding = false;
        this.bitbucketWorkspace = '';
        this.bitbucketRepoSlug = '';
        this.bitbucketFullName = '';
        this.bitbucketName = '';
        this.snackBar.open('Bitbucket repository added. Configure the PR webhook to receive analysis.', 'Close', {
          duration: 5000,
        });
        this.loadRepositories();
      },
      error: (err) => {
        this.bitbucketAdding = false;
        this.snackBar.open(err.error?.error || err.error?.message || 'Failed to add Bitbucket repository', 'Close', {
          duration: 5000,
        });
      },
    });
  }

  addGitLabProject(): void {
    const projectId = this.gitlabProjectId.trim();
    const fullName = this.gitlabFullName.trim();
    const name = this.gitlabName.trim();
    if (!projectId || !fullName || !name) {
      this.snackBar.open('Fill project ID, full path (e.g. group/project), and name', 'Close', {
        duration: 4000,
      });
      return;
    }
    this.gitlabAdding = true;
    this.repositoryService.addGitLabRepository(projectId, fullName, name, this.gitlabDefaultBranch || undefined).subscribe({
      next: () => {
        this.gitlabAdding = false;
        this.gitlabProjectId = '';
        this.gitlabFullName = '';
        this.gitlabName = '';
        this.snackBar.open('GitLab project added. Configure the MR webhook in GitLab to receive analysis.', 'Close', {
          duration: 5000,
        });
        this.loadRepositories();
      },
      error: (err) => {
        this.gitlabAdding = false;
        this.snackBar.open(err.error?.error || err.error?.message || 'Failed to add GitLab project', 'Close', {
          duration: 5000,
        });
      },
    });
  }

  repoExternalUrl(repo: Repository): string {
    if (repo.provider === 'gitlab') return `https://gitlab.com/${repo.fullName}`;
    if (repo.provider === 'bitbucket') return `https://bitbucket.org/${repo.fullName}`;
    return `https://github.com/${repo.fullName}`;
  }

  repoExternalLabel(repo: Repository): string {
    if (repo.provider === 'gitlab') return 'View on GitLab';
    if (repo.provider === 'bitbucket') return 'View on Bitbucket';
    return 'View on GitHub';
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
