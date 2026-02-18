/**
 * Admin Service
 * 
 * Statistike i informacije za admin panel
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

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

/**
 * Dohvata admin statistike
 */
export async function getAdminStats(): Promise<AdminStats> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Plan prices (u dolarima)
    const PLAN_PRICES = {
      PRO: 29,
      ENTERPRISE: 99,
    };

    // Revenue - izračunaj na osnovu aktivnih subscription-a
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        planType: {
          in: ['PRO', 'ENTERPRISE'],
        },
      },
      select: {
        planType: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });

    // Total revenue (svi aktivni subscription-i)
    const totalRevenue = activeSubscriptions.reduce((sum, sub) => {
      return sum + (PLAN_PRICES[sub.planType as 'PRO' | 'ENTERPRISE'] || 0);
    }, 0);

    // This month revenue (subscription-i koji su aktivni ovog meseca)
    const thisMonthRevenue = activeSubscriptions
      .filter((sub) => sub.currentPeriodStart <= now && sub.currentPeriodEnd >= startOfMonth)
      .reduce((sum, sub) => {
        return sum + (PLAN_PRICES[sub.planType as 'PRO' | 'ENTERPRISE'] || 0);
      }, 0);

    // Last month revenue
    const lastMonthRevenue = activeSubscriptions
      .filter(
        (sub) =>
          sub.currentPeriodStart <= endOfLastMonth &&
          sub.currentPeriodEnd >= startOfLastMonth &&
          sub.currentPeriodStart >= startOfLastMonth
      )
      .reduce((sum, sub) => {
        return sum + (PLAN_PRICES[sub.planType as 'PRO' | 'ENTERPRISE'] || 0);
      }, 0);

    // Revenue by plan
    const revenueByPlan = {
      PRO: activeSubscriptions
        .filter((sub) => sub.planType === 'PRO')
        .reduce((sum) => sum + PLAN_PRICES.PRO, 0),
      ENTERPRISE: activeSubscriptions
        .filter((sub) => sub.planType === 'ENTERPRISE')
        .reduce((sum) => sum + PLAN_PRICES.ENTERPRISE, 0),
    };

    // Users
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        subscription: {
          status: 'ACTIVE',
        },
      },
    });
    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    // Users by plan
    const usersByPlan = {
      FREE: await prisma.user.count({
        where: {
          subscription: {
            planType: 'FREE',
            status: 'ACTIVE',
          },
        },
      }),
      PRO: await prisma.user.count({
        where: {
          subscription: {
            planType: 'PRO',
            status: 'ACTIVE',
          },
        },
      }),
      ENTERPRISE: await prisma.user.count({
        where: {
          subscription: {
            planType: 'ENTERPRISE',
            status: 'ACTIVE',
          },
        },
      }),
    };

    // Subscriptions
    const totalSubscriptions = await prisma.subscription.count();
    const activeSubscriptionsCount = await prisma.subscription.count({
      where: { status: 'ACTIVE' },
    });
    const expiredSubscriptions = await prisma.subscription.count({
      where: { status: 'EXPIRED' },
    });
    const cancelledSubscriptions = await prisma.subscription.count({
      where: { status: 'CANCELLED' },
    });

    // Subscriptions by plan
    const subscriptionsByPlan = {
      FREE: await prisma.subscription.count({
        where: { planType: 'FREE' },
      }),
      PRO: await prisma.subscription.count({
        where: { planType: 'PRO' },
      }),
      ENTERPRISE: await prisma.subscription.count({
        where: { planType: 'ENTERPRISE' },
      }),
    };

    // Reviews
    const totalReviews = await prisma.review.count();
    const reviewsThisMonth = await prisma.review.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    });
    const reviewsLastMonth = await prisma.review.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Repositories
    const totalRepositories = await prisma.repository.count();
    const activeRepositories = await prisma.repository.count({
      where: { enabled: true },
    });

    return {
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        byPlan: revenueByPlan,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
        byPlan: usersByPlan,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptionsCount,
        expired: expiredSubscriptions,
        cancelled: cancelledSubscriptions,
        byPlan: subscriptionsByPlan,
      },
      reviews: {
        total: totalReviews,
        thisMonth: reviewsThisMonth,
        lastMonth: reviewsLastMonth,
      },
      repositories: {
        total: totalRepositories,
        active: activeRepositories,
      },
    };
  } catch (error) {
    logger.error('Failed to get admin stats:', error);
    throw error;
  }
}

/**
 * Dohvata listu korisnika sa paginacijom
 */
export async function getUsers(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      include: {
        subscription: {
          select: {
            planType: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            reviewsUsedThisMonth: true,
            repositoriesCount: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            installations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.user.count(),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      githubId: user.githubId,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      name: user.name,
      role: user.role,
      subscription: user.subscription,
      reviewsCount: user._count.reviews,
      installationsCount: user._count.installations,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Dohvata detalje o korisniku
 */
export async function getUserDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      installations: {
        include: {
          repositories: {
            select: {
              id: true,
              name: true,
              fullName: true,
              enabled: true,
              createdAt: true,
            },
          },
        },
      },
      reviews: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          githubPrTitle: true,
          status: true,
          securityScore: true,
          totalIssues: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          reviews: true,
          installations: true,
          documentations: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    githubId: user.githubId,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    name: user.name,
    role: user.role,
    subscription: user.subscription,
    installations: user.installations,
    recentReviews: user.reviews,
    counts: user._count,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
