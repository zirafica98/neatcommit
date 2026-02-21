/**
 * Subscription Routes
 * 
 * API rute za subscription management
 */

import { Router, Request, Response } from 'express';
import { verifyAccessToken } from '../../services/auth.service';
import {
  getUserLimits,
  updateSubscription,
  createSubscription,
  getSubscription,
  getSubscriptionWithWarnings,
  canUserLogin,
  hasUsedFreePlan,
  hasHadPaidPlan,
  PLAN_LIMITS,
  PlanType,
} from '../../services/subscription.service';
import {
  validatePromoCode,
  incrementPromoCodeUsage,
} from '../../services/promo-code.service';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';
import { validateBody, validationSchemas } from '../../middleware/validation';

const router = Router();

/**
 * GET /api/subscription
 * Dohvata subscription informacije za ulogovanog korisnika sa upozorenjima
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const subscriptionWithWarnings = await getSubscriptionWithWarnings(payload.userId);
    
    if (!subscriptionWithWarnings) {
      return res.json({
        subscription: null,
        limits: null,
        needsPlanSelection: true,
      });
    }

    const limits = await getUserLimits(payload.userId);

    return res.json({
      subscription: {
        id: subscriptionWithWarnings.id,
        planType: subscriptionWithWarnings.planType,
        status: subscriptionWithWarnings.status,
        currentPeriodStart: subscriptionWithWarnings.currentPeriodStart,
        currentPeriodEnd: subscriptionWithWarnings.currentPeriodEnd,
        reviewsUsedThisMonth: subscriptionWithWarnings.reviewsUsedThisMonth,
        repositoriesCount: subscriptionWithWarnings.repositoriesCount,
      },
      limits,
      warnings: subscriptionWithWarnings.warnings,
    });
  } catch (error) {
    logger.error('Failed to fetch subscription:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * GET /api/subscription/check-login
 * Proverava da li korisnik može da se loguje
 */
router.get('/check-login', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const check = await canUserLogin(payload.userId);
    return res.json(check);
  } catch (error) {
    logger.error('Failed to check login status:', error);
    return res.status(500).json({ error: 'Failed to check login status' });
  }
});

/**
 * GET /api/subscription/check-free-plan
 * Proverava da li je korisnik već koristio FREE plan ili imao paid plan
 */
router.get('/check-free-plan', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const hasUsed = await hasUsedFreePlan(payload.userId);
    const hasHadPaid = await hasHadPaidPlan(payload.userId);
    
    return res.json({ 
      hasUsedFreePlan: hasUsed,
      hasHadPaidPlan: hasHadPaid,
      canUseFreePlan: !hasUsed && !hasHadPaid,
    });
  } catch (error) {
    logger.error('Failed to check free plan usage:', error);
    return res.status(500).json({ error: 'Failed to check free plan usage' });
  }
});

/**
 * GET /api/subscription/plans
 * Dohvata sve dostupne planove
 */
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = [
      {
        id: 'FREE',
        name: 'Free',
        price: 0,
        interval: 'month',
        limits: PLAN_LIMITS.FREE,
        features: [
          '5 reviews per month',
          '1 repository',
          'GPT-3.5-turbo code review',
          'Basic security checks',
          'Dashboard with basic statistics',
          'Export (PDF, CSV, Excel)',
        ],
      },
      {
        id: 'PRO',
        name: 'Pro',
        price: 29,
        interval: 'month',
        limits: PLAN_LIMITS.PRO,
        features: [
          '100 reviews per month',
          '10 repositories',
          'GPT-4o code review',
          'Advanced security checks',
          'Dashboard with analytics',
          'Export (PDF, CSV, Excel)',
          'Email notifications',
          'Priority support',
        ],
      },
      {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        price: 99,
        interval: 'month',
        limits: PLAN_LIMITS.ENTERPRISE,
        features: [
          'Unlimited reviews',
          'Unlimited repositories',
          'GPT-4o code review',
          'All security checks',
          'Full dashboard with analytics',
          'Export (PDF, CSV, Excel)',
          'Email notifications',
          'Priority support',
          'Custom integrations',
          'Dedicated account manager',
        ],
      },
    ];

    return res.json({ plans });
  } catch (error) {
    logger.error('Failed to fetch plans:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * POST /api/subscription/create
 * Kreira novi subscription (za prvi login ili nakon isteka)
 */
router.post('/create', validateBody(validationSchemas.subscriptionSelectPlan), async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { planType, isDemo = false } = req.body;

    // Proveri da li je FREE plan i da li je već koristio ili imao paid plan
    if (planType === 'FREE') {
      const hasUsed = await hasUsedFreePlan(payload.userId);
      const hasHadPaid = await hasHadPaidPlan(payload.userId);
      
      if (hasUsed || hasHadPaid) {
        return res.status(400).json({
          error: 'You cannot select the FREE plan. You have already used it or had a paid plan. Please select PRO or ENTERPRISE plan.',
        });
      }
    }

    const subscription = await createSubscription(payload.userId, planType as PlanType, isDemo);

    logger.info('Subscription created', {
      userId: payload.userId,
      planType,
      isDemo,
    });

    return res.json({
      message: 'Subscription created successfully',
      subscription: {
        id: subscription.id,
        planType: subscription.planType,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error: any) {
    logger.error('Failed to create subscription:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create subscription',
    });
  }
});

/**
 * POST /api/subscription/validate-promo-code
 * Validira promo code i vraća informacije o popustu
 */
router.post('/validate-promo-code', validateBody(validationSchemas.promoCodeBody), async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    const validation = await validatePromoCode(code);

    if (!validation.valid) {
      return res.status(400).json({
        valid: false,
        error: validation.error,
      });
    }

    return res.json({
      valid: true,
      code: validation.code,
      discountPercentage: validation.discountPercentage,
    });
  } catch (error) {
    logger.error('Failed to validate promo code:', error);
    return res.status(500).json({ error: 'Failed to validate promo code' });
  }
});

/**
 * POST /api/subscription/upgrade
 * Upgrade subscription plan (sa fake payment za demo)
 */
router.post('/upgrade', validateBody(validationSchemas.subscriptionUpgrade), async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { planType, paymentData, isDemo = false, promoCode } = req.body;

    // Proveri da li je FREE plan i da li je već koristio ili imao paid plan
    if (planType === 'FREE') {
      const hasUsed = await hasUsedFreePlan(payload.userId);
      const hasHadPaid = await hasHadPaidPlan(payload.userId);
      
      if (hasUsed || hasHadPaid) {
        return res.status(400).json({
          error: 'You cannot select the FREE plan. You have already used it or had a paid plan. Please select PRO or ENTERPRISE plan.',
        });
      }
    }

    // Validiraj promo code ako je prosleđen
    let promoCodeId: string | null = null;
    let discountPercentage = 0;
    
    if (promoCode) {
      const validation = await validatePromoCode(promoCode);
      
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error || 'Invalid promo code',
        });
      }

      discountPercentage = validation.discountPercentage || 0;
      
      // Pronađi promo code u bazi da dobijemo ID
      const promoCodeRecord = await prisma.promoCode.findUnique({
        where: { code: promoCode.toUpperCase() },
      });

      if (promoCodeRecord) {
        promoCodeId = promoCodeRecord.id;
      }
    }

    // Za demo verziju, preskoči payment validaciju
    if (!isDemo && planType !== 'FREE') {
      // TODO: Validacija payment podataka (Stripe integracija)
      if (!paymentData) {
        return res.status(400).json({ error: 'Payment data is required' });
      }
    }

    // Ako korisnik već ima subscription, ažuriraj ga
    const existingSubscription = await getSubscription(payload.userId);
    let subscription;
    
    if (existingSubscription) {
      subscription = await updateSubscription(payload.userId, planType as PlanType, promoCodeId);
    } else {
      subscription = await createSubscription(payload.userId, planType as PlanType, isDemo, promoCodeId);
    }

    // Povećaj broj korišćenja promo code-a ako je korišćen
    if (promoCodeId) {
      try {
        await incrementPromoCodeUsage(promoCode || '');
      } catch (error) {
        logger.warn('Failed to increment promo code usage:', error);
        // Ne prekidaj proces ako ne uspe da ažurira usage
      }
    }

    logger.info('Subscription upgraded', {
      userId: payload.userId,
      planType,
      isDemo,
      promoCode: promoCode || null,
      discountPercentage,
    });

    return res.json({
      message: 'Subscription upgraded successfully',
      subscription: {
        id: subscription.id,
        planType: subscription.planType,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      discountApplied: discountPercentage > 0,
      discountPercentage,
    });
  } catch (error: any) {
    logger.error('Failed to upgrade subscription:', error);
    return res.status(500).json({
      error: error.message || 'Failed to upgrade subscription',
    });
  }
});

export default router;
