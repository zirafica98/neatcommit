/**
 * Input Validation Middleware
 * Validacija zahteva koristeći Zod schemas. U production ne izlažemo detalje grešaka.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../utils/logger';
import env from '../config/env';

function validationErrorResponse(res: Response, error: ZodError, type: string): void {
  logger.warn(`${type} validation error`, { path: res.req?.path, errors: error.errors });
  const body = env.NODE_ENV === 'production'
    ? { error: 'Validation failed' }
    : { error: 'Validation failed', details: error.errors.map((err) => ({ path: err.path.join('.'), message: err.message })) };
  res.status(400).json(body);
}

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
        validationErrorResponse(res, error, 'Body');
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
        validationErrorResponse(res, error, 'Query');
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
        validationErrorResponse(res, error, 'Params');
        return;
      }
      next(error);
    }
  };
}

/** CUID/ID format (Prisma default id): alfanumerik, 20-30 chars */
export const idSchema = z.string().min(20).max(35).regex(/^[a-z0-9]+$/i);

/**
 * Common validation schemas (maksimalna zaštita: formati i granice)
 */
export const validationSchemas = {
  idParam: z.object({ id: idSchema }),
  repositoryId: z.object({ id: idSchema }),
  repositoryIdParam: z.object({ repositoryId: idSchema }),
  reviewId: z.object({ id: idSchema }),
  generateDocumentation: z.object({
    repositoryId: idSchema,
  }),
  addRepository: z.object({
    githubRepoId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  }),
  pagination: z.object({
    page: z.string().optional().transform((val) => Math.min(Math.max(1, val ? parseInt(val, 10) : 1), 1000)),
    limit: z.string().optional().transform((val) => Math.min(Math.max(1, val ? parseInt(val, 10) : 20), 100)),
  }),
  adminPagination: z.object({
    page: z.preprocess((v) => (v === undefined || v === '' ? 1 : Number(v)), z.number().int().min(1).max(500)),
    limit: z.preprocess((v) => (v === undefined || v === '' ? 20 : Number(v)), z.number().int().min(1).max(100)),
  }),
  exportIssuesQuery: z.object({
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'all']).optional(),
    reviewId: idSchema.optional(),
  }),
  subscriptionSelectPlan: z.object({
    planType: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
    isDemo: z.boolean().optional(),
  }),
  subscriptionUpgrade: z.object({
    planType: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
    paymentData: z.record(z.unknown()).optional(),
    isDemo: z.boolean().optional(),
    promoCode: z.string().max(50).optional(),
  }),
  promoCodeBody: z.object({ code: z.string().min(1).max(50).trim() }),
};
