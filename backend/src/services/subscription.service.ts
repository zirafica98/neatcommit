/**
 * Subscription Service
 * 
 * Upravlja subscription planovima i limits
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

export type PlanType = 'FREE' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIALING';

export interface PlanLimits {
  reviewsPerMonth: number | null; // null = unlimited
  repositories: number | null; // null = unlimited
  llmModel: string; // 'gpt-3.5-turbo' ili 'gpt-4o'
  advancedSecurity: boolean;
  analytics: boolean;
  emailNotifications: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  FREE: {
    reviewsPerMonth: 5,
    repositories: 1,
    llmModel: 'gpt-3.5-turbo',
    advancedSecurity: false,
    analytics: false,
    emailNotifications: false,
    prioritySupport: false,
    customIntegrations: false,
  },
  PRO: {
    reviewsPerMonth: 100,
    repositories: 10,
    llmModel: 'gpt-4o',
    advancedSecurity: true,
    analytics: true,
    emailNotifications: true,
    prioritySupport: true,
    customIntegrations: false,
  },
  ENTERPRISE: {
    reviewsPerMonth: null, // unlimited
    repositories: null, // unlimited
    llmModel: 'gpt-4o',
    advancedSecurity: true,
    analytics: true,
    emailNotifications: true,
    prioritySupport: true,
    customIntegrations: true,
  },
};

/**
 * Kreira ili dohvata subscription za korisnika
 */
export async function getOrCreateSubscription(userId: string): Promise<any> {
  // @ts-ignore - Prisma client će imati subscription model nakon migration
  let subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    // Kreiraj FREE subscription
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 mesec od sada

    // @ts-ignore - Prisma client će imati subscription model nakon migration
    subscription = await prisma.subscription.create({
      data: {
        userId,
        planType: 'FREE',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        reviewsUsedThisMonth: 0,
        repositoriesCount: 0,
      },
    });

    logger.info('Created FREE subscription for user', { userId });
  }

  return subscription;
}

/**
 * Dohvata subscription za korisnika
 */
export async function getSubscription(userId: string): Promise<any | null> {
  // @ts-ignore - Prisma client će imati subscription model nakon migration
  return await prisma.subscription.findUnique({
    where: { userId },
  });
}

/**
 * Proverava da li korisnik može da kreira review
 */
export async function canCreateReview(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getOrCreateSubscription(userId);
  const limits = PLAN_LIMITS[subscription.planType as PlanType];

  // Proveri status
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
    return { allowed: false, reason: 'Subscription is not active' };
  }

  // Proveri da li je period istekao
  if (new Date() > subscription.currentPeriodEnd) {
    return { allowed: false, reason: 'Subscription period has expired' };
  }

  // Proveri reviews limit
  if (limits.reviewsPerMonth !== null) {
    // Resetuj counter ako je novi mesec
    const now = new Date();
    const periodStart = subscription.currentPeriodStart;
    if (now.getMonth() !== periodStart.getMonth() || now.getFullYear() !== periodStart.getFullYear()) {
      // Resetuj counter za novi mesec
      // @ts-ignore - Prisma client će imati subscription model nakon migration
      await prisma.subscription.update({
        where: { userId },
        data: {
          reviewsUsedThisMonth: 0,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
        },
      });
      subscription.reviewsUsedThisMonth = 0;
    }

    if (subscription.reviewsUsedThisMonth >= limits.reviewsPerMonth) {
      return {
        allowed: false,
        reason: `Monthly review limit reached (${limits.reviewsPerMonth} reviews). Upgrade to Pro or Enterprise for more.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Povećava broj korišćenih reviews
 */
export async function incrementReviewUsage(userId: string): Promise<void> {
  // @ts-ignore - Prisma client će imati subscription model nakon migration
  await prisma.subscription.update({
    where: { userId },
    data: {
      reviewsUsedThisMonth: {
        increment: 1,
      },
    },
  });
}

/**
 * Proverava da li korisnik može da doda repository
 */
export async function canAddRepository(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const subscription = await getOrCreateSubscription(userId);
  const limits = PLAN_LIMITS[subscription.planType as PlanType];

  // Proveri status
  if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
    return { allowed: false, reason: 'Subscription is not active' };
  }

  // Proveri repositories limit
  if (limits.repositories !== null) {
    if (subscription.repositoriesCount >= limits.repositories) {
      return {
        allowed: false,
        reason: `Repository limit reached (${limits.repositories} repositories). Upgrade to Pro or Enterprise for more.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Ažurira broj repositories
 */
export async function updateRepositoryCount(userId: string, count: number): Promise<void> {
  // @ts-ignore - Prisma client će imati subscription model nakon migration
  await prisma.subscription.update({
    where: { userId },
    data: {
      repositoriesCount: count,
    },
  });
}

/**
 * Proverava da li korisnik ima pristup feature-u
 */
export async function hasFeatureAccess(userId: string, feature: keyof PlanLimits): Promise<boolean> {
  const subscription = await getOrCreateSubscription(userId);
  const limits = PLAN_LIMITS[subscription.planType as PlanType];
  return limits[feature] === true;
}

/**
 * Dohvata limits za korisnika
 */
export async function getUserLimits(userId: string): Promise<PlanLimits & { planType: PlanType; usage: { reviewsUsed: number; repositoriesUsed: number } }> {
  const subscription = await getOrCreateSubscription(userId);
  const limits = PLAN_LIMITS[subscription.planType as PlanType];

  return {
    ...limits,
    planType: subscription.planType as PlanType,
    usage: {
      reviewsUsed: subscription.reviewsUsedThisMonth,
      repositoriesUsed: subscription.repositoriesCount,
    },
  };
}

/**
 * Ažurira subscription plan
 */
export async function updateSubscription(
  userId: string,
  planType: PlanType,
  promoCodeId?: string | null,
  stripeSubscriptionId?: string,
  stripeCustomerId?: string,
  stripePriceId?: string
): Promise<any> {
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 mesec od sada

  // @ts-ignore - Prisma client će imati subscription model nakon migration
  return await prisma.subscription.update({
    where: { userId },
    data: {
      planType,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      reviewsUsedThisMonth: 0, // Resetuj za novi plan
      promoCodeId: promoCodeId || null,
      stripeSubscriptionId,
      stripeCustomerId,
      stripePriceId,
    },
  });
}

/**
 * Proverava da li je subscription istekao
 */
export async function isSubscriptionExpired(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);
  if (!subscription) return true;
  
  const now = new Date();
  return now > subscription.currentPeriodEnd || subscription.status === 'EXPIRED';
}

/**
 * Proverava da li subscription ističe u narednih 1-2 dana
 */
export async function isSubscriptionExpiringSoon(userId: string): Promise<boolean> {
  const subscription = await getSubscription(userId);
  if (!subscription) return false;
  
  const now = new Date();
  const periodEnd = subscription.currentPeriodEnd;
  const daysUntilExpiry = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry <= 2 && daysUntilExpiry > 0;
}

/**
 * Proverava da li korisnik može da se loguje
 */
export async function canUserLogin(userId: string): Promise<{ allowed: boolean; reason?: string; needsPlanSelection?: boolean }> {
  const subscription = await getSubscription(userId);
  
  // Ako nema subscription, mora da izabere plan
  if (!subscription) {
    return { allowed: false, reason: 'Please select a subscription plan', needsPlanSelection: true };
  }
  
  // Proveri da li je istekao
  if (await isSubscriptionExpired(userId)) {
    return { allowed: false, reason: 'Your subscription has expired. Please select a new plan.', needsPlanSelection: true };
  }
  
  // Proveri status
  if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
    return { allowed: false, reason: 'Your subscription is not active. Please select a new plan.', needsPlanSelection: true };
  }
  
  return { allowed: true };
}

/**
 * Proverava da li je korisnik već koristio FREE plan
 */
export async function hasUsedFreePlan(userId: string): Promise<boolean> {
  // @ts-ignore
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      planType: 'FREE',
    },
  });
  
  // Ako je ikad imao FREE plan i plan je istekao, ne može ponovo FREE
  for (const sub of subscriptions) {
    if (sub.status === 'EXPIRED' || new Date() > sub.currentPeriodEnd) {
      return true;
    }
  }
  
  return false;
}

/**
 * Proverava da li je korisnik ikada imao PRO ili ENTERPRISE plan
 */
export async function hasHadPaidPlan(userId: string): Promise<boolean> {
  // @ts-ignore
  const paidSubscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      planType: {
        in: ['PRO', 'ENTERPRISE'],
      },
    },
  });
  
  // Ako je ikada imao PRO ili ENTERPRISE plan, ne može više FREE
  return paidSubscriptions.length > 0;
}

/**
 * Kreira novi subscription za korisnika
 */
export async function createSubscription(
  userId: string,
  planType: PlanType,
  isDemo: boolean = false,
  promoCodeId?: string | null
): Promise<any> {
  // Proveri da li je FREE plan i da li je već koristio
  if (planType === 'FREE') {
    const hasUsed = await hasUsedFreePlan(userId);
    if (hasUsed) {
      throw new Error('You have already used the FREE plan. Please select PRO or ENTERPRISE plan.');
    }
  }
  
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 mesec od sada
  
  // @ts-ignore
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });
  
  if (existing) {
    // Ažuriraj postojeći
    return await updateSubscription(userId, planType, promoCodeId);
  } else {
    // Kreiraj novi
    // @ts-ignore
    return await prisma.subscription.create({
      data: {
        userId,
        planType,
        status: isDemo ? 'ACTIVE' : 'TRIALING',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        reviewsUsedThisMonth: 0,
        repositoriesCount: 0,
        promoCodeId: promoCodeId || null,
      },
    });
  }
}

/**
 * Dohvata subscription status sa upozorenjima
 */
export async function getSubscriptionWithWarnings(userId: string): Promise<any> {
  const subscription = await getSubscription(userId);
  if (!subscription) return null;
  
  const isExpired = await isSubscriptionExpired(userId);
  const isExpiringSoon = await isSubscriptionExpired(userId) ? false : await isSubscriptionExpiringSoon(userId);
  
  return {
    ...subscription,
    warnings: {
      isExpired,
      isExpiringSoon,
      daysUntilExpiry: isExpired ? 0 : Math.ceil((subscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    },
  };
}
