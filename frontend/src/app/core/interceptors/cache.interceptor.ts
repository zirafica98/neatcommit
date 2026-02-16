/**
 * Cache Interceptor
 * 
 * HTTP interceptor za caching API odgovora
 */

import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

interface CacheEntry {
  response: HttpResponse<any>;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuta

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Cache samo GET zahteve
  if (req.method !== 'GET') {
    return next(req);
  }

  // Ne cache-uj auth, export i subscription endpoint-e (za real-time update)
  if (req.url.includes('/auth/') || 
      req.url.includes('/export/') ||
      req.url.includes('/download') ||
      req.url.includes('/subscription')) {
    return next(req);
  }

  const cachedResponse = getCachedResponse(req.url);
  if (cachedResponse) {
    return of(cachedResponse);
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cacheResponse(req.url, event);
      }
    }),
    shareReplay(1)
  );
};

function getCachedResponse(url: string): HttpResponse<any> | null {
  const entry = cache.get(url);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    cache.delete(url);
    return null;
  }

  return entry.response;
}

function cacheResponse(url: string, response: HttpResponse<any>): void {
  cache.set(url, {
    response: response.clone(),
    timestamp: Date.now(),
  });
}

export function clearCache(): void {
  cache.clear();
}
