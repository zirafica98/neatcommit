/**
 * Promo Code Service
 * 
 * Upravlja promo code validacijom i primenom popusta
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface PromoCodeValidationResult {
  valid: boolean;
  code?: string;
  discountPercentage?: number;
  error?: string;
}

/**
 * Validira promo code i vraća informacije o popustu
 */
export async function validatePromoCode(code: string): Promise<PromoCodeValidationResult> {
  try {
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promoCode) {
      return {
        valid: false,
        error: 'Promo code not found',
      };
    }

    if (!promoCode.isActive) {
      return {
        valid: false,
        error: 'Promo code is not active',
      };
    }

    // Proveri validUntil
    if (promoCode.validUntil && promoCode.validUntil < new Date()) {
      return {
        valid: false,
        error: 'Promo code has expired',
      };
    }

    // Proveri validFrom
    if (promoCode.validFrom && promoCode.validFrom > new Date()) {
      return {
        valid: false,
        error: 'Promo code is not yet valid',
      };
    }

    // Proveri maxUses
    if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
      return {
        valid: false,
        error: 'Promo code has reached maximum uses',
      };
    }

    return {
      valid: true,
      code: promoCode.code,
      discountPercentage: promoCode.discountPercentage,
    };
  } catch (error) {
    logger.error('Failed to validate promo code:', error);
    return {
      valid: false,
      error: 'Failed to validate promo code',
    };
  }
}

/**
 * Povećava broj korišćenja promo code-a
 */
export async function incrementPromoCodeUsage(code: string): Promise<void> {
  try {
    await prisma.promoCode.update({
      where: { code: code.toUpperCase() },
      data: {
        currentUses: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to increment promo code usage:', error);
    throw error;
  }
}

/**
 * Izračunava finalnu cenu sa popustom
 */
export function calculateDiscountedPrice(originalPrice: number, discountPercentage: number): number {
  const discountAmount = (originalPrice * discountPercentage) / 100;
  return Math.max(0, originalPrice - discountAmount);
}
