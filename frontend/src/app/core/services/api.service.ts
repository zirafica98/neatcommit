/**
 * API Service
 * 
 * Centralizovani HTTP service za komunikaciju sa backend-om
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * GET request
   */
  get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http
      .get<T>(`${this.apiUrl}${endpoint}`, { params: httpParams })
      .pipe(
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: any): Observable<T> {
    return this.http
      .post<T>(`${this.apiUrl}${endpoint}`, body, this.getHeaders())
      .pipe(
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: any): Observable<T> {
    return this.http
      .put<T>(`${this.apiUrl}${endpoint}`, body, this.getHeaders())
      .pipe(
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http
      .delete<T>(`${this.apiUrl}${endpoint}`, this.getHeaders())
      .pipe(
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * GET request for binary data (blob)
   */
  getBlob(endpoint: string): Observable<Blob> {
    const token = localStorage.getItem('access_token');
    const hasValidToken = token && token !== 'undefined' && token !== 'null' && token.length > 10;
    const headers = new HttpHeaders({
      ...(hasValidToken ? { Authorization: `Bearer ${token}` } : {}),
    });

    return this.http
      .get(`${this.apiUrl}${endpoint}`, {
        headers,
        responseType: 'blob',
      })
      .pipe(
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Build HTTP params from object
   */
  private buildParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return httpParams;
  }

  /**
   * Get HTTP headers
   */
  private getHeaders(): { headers: HttpHeaders } {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // Add auth token if available (ne šalji "undefined"/"null" string iz localStorage)
    const token = localStorage.getItem('access_token');
    const hasValidToken = token && token !== 'undefined' && token !== 'null' && token.length > 10;
    if (hasValidToken) {
      return {
        headers: headers.set('Authorization', `Bearer ${token}`),
      };
    }

    return { headers };
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.error?.error) {
        errorMessage = error.error.error;
      }
    }

    console.error('API Error:', errorMessage);
    // Sačuvaj originalni error objekat da bi status i error bili dostupni
    const customError: any = new Error(errorMessage);
    customError.status = error.status;
    customError.error = error.error;
    customError.message = errorMessage;
    return throwError(() => customError);
  }
}
