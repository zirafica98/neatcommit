import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AdminService, AdminStats, UserListItem } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatChipsModule,
    MatPaginatorModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  stats: AdminStats | null = null;
  users: UserListItem[] = [];
  loading = true;
  usersLoading = false;
  
  // Pagination
  page = 1;
  limit = 20;
  totalUsers = 0;
  totalPages = 0;

  displayedColumns: string[] = ['username', 'email', 'role', 'plan', 'status', 'reviews', 'createdAt', 'actions'];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadUsers();
  }

  loadStats(): void {
    this.adminService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading admin stats:', error);
        this.loading = false;
      },
    });
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.adminService.getUsers(this.page, this.limit).subscribe({
      next: (response) => {
        this.users = response.users;
        this.totalUsers = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.usersLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.usersLoading = false;
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.loadUsers();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  getPlanColor(plan: string): string {
    switch (plan) {
      case 'FREE':
        return 'grey';
      case 'PRO':
        return 'primary';
      case 'ENTERPRISE':
        return 'accent';
      default:
        return 'grey';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'primary';
      case 'EXPIRED':
        return 'warn';
      case 'CANCELLED':
        return 'accent';
      default:
        return 'grey';
    }
  }
}
