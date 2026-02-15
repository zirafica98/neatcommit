/**
 * Search Service
 * 
 * Provides search functionality for reviews, issues, and repositories
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface SearchOptions {
  query: string;
  type?: 'reviews' | 'issues' | 'repositories' | 'all';
  limit?: number;
  offset?: number;
  userId?: string;
}

export interface SearchResult {
  reviews: any[];
  issues: any[];
  repositories: any[];
  total: number;
}

/**
 * Search across reviews, issues, and repositories
 */
export async function search(options: SearchOptions): Promise<SearchResult> {
  const { query, type = 'all', limit = 20, offset = 0, userId } = options;

  logger.info('Search performed', { query, type, limit, offset });

  const results: SearchResult = {
    reviews: [],
    issues: [],
    repositories: [],
    total: 0,
  };

  try {
    // Build where clause for user filtering
    const userWhere = userId ? { userId } : {};

    // Search reviews
    if (type === 'all' || type === 'reviews') {
      const reviews = await prisma.review.findMany({
        where: {
          ...userWhere,
          OR: [
            { githubPrTitle: { contains: query, mode: 'insensitive' } },
            { githubPrUrl: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          repository: {
            select: {
              id: true,
              name: true,
              fullName: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      results.reviews = reviews.map((r) => ({
        id: r.id,
        prTitle: r.githubPrTitle,
        prUrl: r.githubPrUrl,
        status: r.status,
        securityScore: r.securityScore,
        totalIssues: r.totalIssues,
        createdAt: r.createdAt.toISOString(),
        repository: r.repository,
      }));
    }

    // Search issues
    if (type === 'all' || type === 'issues') {
      const issues = await prisma.issue.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { codeSnippet: { contains: query, mode: 'insensitive' } },
          ],
          review: userId ? { userId } : undefined,
        },
        include: {
          review: {
            select: {
              id: true,
              githubPrTitle: true,
              githubPrUrl: true,
              repository: {
                select: {
                  id: true,
                  name: true,
                  fullName: true,
                },
              },
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      results.issues = issues.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        severity: i.severity,
        category: i.category,
        filePath: i.filePath,
        line: i.line,
        review: i.review,
        createdAt: i.createdAt.toISOString(),
      }));
    }

    // Search repositories
    if (type === 'all' || type === 'repositories') {
      const repositories = await prisma.repository.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
            { owner: { contains: query, mode: 'insensitive' } },
          ],
          installation: userId
            ? {
                userId,
              }
            : undefined,
        },
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      });

      results.repositories = repositories.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.fullName,
        owner: r.owner,
        language: r.language,
        enabled: r.enabled,
        createdAt: r.createdAt.toISOString(),
      }));
    }

    results.total = results.reviews.length + results.issues.length + results.repositories.length;

    return results;
  } catch (error) {
    logger.error('Search failed:', error);
    throw error;
  }
}
