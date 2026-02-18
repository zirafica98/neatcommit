/**
 * Admin Service
 * 
 * Frontend service za admin panel
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AdminStats {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    byPlan: {
      PRO: number;
      ENTERPRISE: number;
    };
  };
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    byPlan: {
      FREE: number;
      PRO: number;
      ENTERPRISE: number;
    };
  };
  subscriptions: {
    total: number;
    active: number;
    expired: number;
    cancelled: number;
    byPlan: {
      FREE: number;
      PRO: number;
      ENTERPRISE: number;
    };
  };
  reviews: {
    total: number;
    thisMonth: number;
    lastMonth: number;
  };
  repositories: {
    total: number;
    active: number;
  };
}

export interface UserListItem {
  id: string;
  githubId: number;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  name: string | null;
  role: string;
  subscription: {
    planType: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    reviewsUsedThisMonth: number;
    repositoriesCount: number;
  } | null;
  reviewsCount: number;
  installationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserDetails {
  id: string;
  githubId: number;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  name: string | null;
  role: string;
  subscription: any;
  installations: any[];
  recentReviews: any[];
  counts: {
    reviews: number;
    installations: number;
    documentations: number;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  constructor(private apiService: ApiService) {}

  /**
   * Dohvata admin statistike
   */
  getStats(): Observable<AdminStats> {
    return this.apiService.get<AdminStats>('/api/admin/stats');
  }

  /**
   * Dohvata listu korisnika
   */
  getUsers(page: number = 1, limit: number = 20): Observable<UsersResponse> {
    return this.apiService.get<UsersResponse>('/api/admin/users', { page, limit });
  }

  /**
   * Dohvata detalje o korisniku
   */
  getUserDetails(userId: string): Observable<UserDetails> {
    return this.apiService.get<UserDetails>(`/api/admin/users/${userId}`);
  }
}
