/**
 * Rate Limiting Middleware
 * 
 * Zaštita API-ja od preopterećenja i DDoS napada
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import env from '../config/env';

/**
 * General API rate limiter
 * - Development: 1000 requests per 15 minutes (viši limit za development)
 * - Production: 100 requests per 15 minutes po IP adresi
 * - Preskače subscription rute (imaju svoj limiter)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: env.NODE_ENV === 'development' ? 1000 : 100, // Viši limit u development modu
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Preskoči subscription i auth rute (imaju svoj limiter)
    return req.path.startsWith('/subscription') || req.path.startsWith('/auth');
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60 * 1000;
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
});

/**
 * Subscription rate limiter (blaži limit za subscription endpoint-e)
 * - Development: 500 requests per 15 minutes
 * - Production: 200 requests per 15 minutes
 */
export const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: env.NODE_ENV === 'development' ? 500 : 200, // Blaži limit za subscription endpoint-e
  message: {
    error: 'Too many subscription requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Subscription rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60 * 1000;
    res.status(429).json({
      error: 'Too many subscription requests, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
});

/**
 * Strict rate limiter za auth endpoints
 * - Development: 100 requests per 15 minutes (viši limit za development)
 * - Production: 20 requests per 15 minutes po IP adresi (zaštita od brute force)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: env.NODE_ENV === 'development' ? 100 : 20, // Viši limit u development modu
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Fix za IPv6 problem - koristi ipKeyGenerator helper
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket.remoteAddress || 'unknown'),
  handler: (req: Request, res: Response) => {
    console.log('🔴 AUTH RATE LIMIT HANDLER CALLED', { ip: req.ip, path: req.path });
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60 * 1000;
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
});

/**
 * Webhook rate limiter
 * - 1000 requests per hour (GitHub može da šalje puno webhook-ova)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 sat
  max: 1000, // 1000 webhook-ova po satu
  message: {
    error: 'Too many webhook requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Webhook rate limit exceeded', {
      ip: req.ip,
      event: req.headers['x-github-event'],
    });
    res.status(429).json({
      error: 'Too many webhook requests, please try again later.',
    });
  },
});

/**
 * Documentation generation rate limiter
 * - Development: 200 requests per hour (viši limit za development)
 * - Production: 50 requests per hour po korisniku (resource-intensive operacija)
 * - Primjenjuje se SAMO na /generate endpoint
 * - Koristi memory store (resetuje se pri restartu servera)
 */
export const documentationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 sat
  max: env.NODE_ENV === 'development' ? 200 : 50, // Viši limit u development modu
  message: {
    error: 'Too many documentation generation requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Koristi user ID ako je autentifikovan, inače IP adresu
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const { verifyAccessToken } = require('../services/auth.service');
        const token = authHeader.substring(7);
        const payload = verifyAccessToken(token);
        if (payload) {
          return `doc-gen:user:${payload.userId}`;
        }
      } catch (error) {
        // Fallback na IP ako token nije validan
      }
    }
    // Koristi ipKeyGenerator za IP adresu
    // ipKeyGenerator je funkcija koja prima Request i vraća string
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `doc-gen:ip:${ip}`;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Documentation generation rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60 * 1000;
    res.status(429).json({
      error: 'Too many documentation generation requests, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
});

/**
 * Documentation download rate limiter
 * - 100 requests per 15 minutes (blaži limit za download)
 */
export const documentationDownloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 100, // 100 download-a po 15 minuta
  message: {
    error: 'Too many download requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Documentation download rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60 * 1000;
    res.status(429).json({
      error: 'Too many download requests, please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    });
  },
});
