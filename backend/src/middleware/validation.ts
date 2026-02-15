/**
 * Input Validation Middleware
 * 
 * Validacija zahteva koristeći Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Validacija request body-ja
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error', {
          path: req.path,
          errors: error.errors,
        });
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validacija request query parametara
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Query validation error', {
          path: req.path,
          errors: error.errors,
        });
        res.status(400).json({
          error: 'Query validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Validacija request params
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Params validation error', {
          path: req.path,
          errors: error.errors,
        });
        res.status(400).json({
          error: 'Params validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Common validation schemas
 */
export const validationSchemas = {
  // Repository ID
  repositoryId: z.object({
    id: z.string().min(1, 'Repository ID is required'),
  }),

  // Review ID
  reviewId: z.object({
    id: z.string().min(1, 'Review ID is required'),
  }),

  // Documentation generation
  generateDocumentation: z.object({
    repositoryId: z.string().min(1, 'Repository ID is required'),
  }),

  // Add repository
  addRepository: z.object({
    githubRepoId: z.number().int().positive('GitHub repository ID must be a positive integer'),
  }),

  // Pagination
  pagination: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  }),
};
