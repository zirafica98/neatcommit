/**
 * Export Routes
 * 
 * API rute za export podataka u različite formate
 */

import { Router, Request, Response } from 'express';
import { verifyAccessToken } from '../../services/auth.service';
import { ExportService } from '../../services/export.service';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { validateParams, validateQuery, validationSchemas } from '../../middleware/validation';

const router = Router();

/**
 * GET /api/export/review/:id/pdf
 * 
 * Export review u PDF format
 */
router.get('/review/:id/pdf', validateParams(validationSchemas.reviewId), async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const reviewId = req.params.id;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        issues: true,
        repository: true,
        installation: { select: { userId: true } },
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    if (review.installation?.userId !== payload.userId) {
      return res.status(403).json({ error: 'Forbidden: you do not have access to this review' });
    }

    logger.info('Exporting review to PDF', {
      reviewId,
      issueCount: review.issues?.length || 0,
      hasRepository: !!review.repository,
    });

    const pdfBuffer = await ExportService.exportReviewToPDF(review);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      logger.error('PDF buffer is empty');
      return res.status(500).json({ error: 'Failed to generate PDF file' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="review-${reviewId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache');
    return res.end(pdfBuffer, 'binary');
  } catch (error) {
    logger.error('PDF export error:', error);
    return res.status(500).json({ error: 'Failed to export review to PDF' });
  }
});

/**
 * GET /api/export/issues/csv
 * 
 * Export issues u CSV format
 */
router.get('/issues/csv', validateQuery(validationSchemas.exportIssuesQuery), async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { severity, reviewId } = req.query;

    // Samo issues iz review-a koji pripadaju korisnikovim instalacijama
    const userInstallations = await prisma.installation.findMany({
      where: { userId: payload.userId },
      select: { id: true },
    });
    const installationIds = userInstallations.map((i) => i.id);
    const allowedReviews = await prisma.review.findMany({
      where: { installationId: { in: installationIds } },
      select: { id: true },
    });
    const allowedReviewIds = allowedReviews.map((r) => r.id);
    if (allowedReviewIds.length === 0) {
      const emptyCsv = ['Title', 'Severity', 'Category', 'Description', 'File Path', 'Line Number', 'Created At'].join(',');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="issues.csv"');
      return res.send('\uFEFF' + emptyCsv);
    }

    const where: any = { reviewId: { in: allowedReviewIds } };
    if (severity && severity !== 'all') {
      where.severity = severity;
    }
    if (reviewId && allowedReviewIds.includes(reviewId as string)) {
      where.reviewId = reviewId;
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        review: {
          include: {
            repository: true,
          },
        },
      },
      orderBy: {
        severity: 'desc',
      },
    });

    logger.info('Exporting issues to CSV', {
      issueCount: issues.length,
      severity: severity || 'all',
      reviewId: reviewId || 'all',
    });

    const csvContent = ExportService.exportIssuesToCSV(issues);

    if (!csvContent || csvContent.length === 0) {
      logger.warn('CSV content is empty');
      // Vrati barem header-e ako nema issues
      const emptyCsv = ['Title', 'Severity', 'Category', 'Description', 'File Path', 'Line Number', 'Created At'].join(',');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="issues.csv"');
      res.setHeader('Cache-Control', 'no-cache');
      const emptyCsvWithBOM = '\uFEFF' + emptyCsv;
      return res.send(emptyCsvWithBOM);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="issues.csv"');
    res.setHeader('Cache-Control', 'no-cache');
    // Add BOM for Excel compatibility
    const csvWithBOM = '\uFEFF' + csvContent;
    return res.send(csvWithBOM);
  } catch (error) {
    logger.error('CSV export error:', error);
    return res.status(500).json({ error: 'Failed to export issues to CSV' });
  }
});

/**
 * GET /api/export/stats/excel
 * 
 * Export statistika u Excel format
 */
router.get('/stats/excel', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    logger.info('Export stats - User ID from token', { userId: payload.userId });

    // Dohvati statistike - koristimo isti pristup kao dashboard (bez userId filtera)
    // jer reviews mogu imati userId=null ili biti povezani preko installation-a
    const totalReviews = await prisma.review.count();

    // Koristimo isti pristup kao dashboard endpoint - bez userId filtera
    const totalIssues = await prisma.issue.count();

    const criticalIssues = await prisma.issue.count({
      where: { severity: 'CRITICAL' },
    });

    const highIssues = await prisma.issue.count({
      where: { severity: 'HIGH' },
    });

    const mediumIssues = await prisma.issue.count({
      where: { severity: 'MEDIUM' },
    });

    const lowIssues = await prisma.issue.count({
      where: { severity: 'LOW' },
    });

    // Calculate average security score (samo completed reviews sa score-om)
    const reviewsWithScore = await prisma.review.findMany({
      where: {
        status: 'completed',
        securityScore: { not: null },
      },
      select: {
        securityScore: true,
      },
    });

    const averageScore = reviewsWithScore.length > 0
      ? Math.round(reviewsWithScore.reduce((sum, r) => sum + (r.securityScore || 0), 0) / reviewsWithScore.length)
      : 0;

    const reviewsByStatus = await prisma.review.groupBy({
      by: ['status'],
      _count: true,
    });

    const issuesByCategory = await prisma.issue.groupBy({
      by: ['category'],
      _count: true,
    });

    const stats = {
      totalReviews,
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      averageScore,
      reviewsByStatus: reviewsByStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
      issuesByCategory: issuesByCategory.map((item) => ({
        category: item.category,
        count: item._count,
      })),
    };

    logger.info('Stats for Excel export:', {
      stats,
      reviewsByStatusCount: stats.reviewsByStatus.length,
      issuesByCategoryCount: stats.issuesByCategory.length,
    });

    logger.info('Exporting stats to Excel', {
      totalReviews: stats.totalReviews,
      totalIssues: stats.totalIssues,
      averageScore: stats.averageScore,
    });

    const excelBuffer = ExportService.exportStatsToExcel(stats);

    if (!excelBuffer || excelBuffer.length === 0) {
      logger.error('Excel buffer is empty');
      return res.status(500).json({ error: 'Failed to generate Excel file' });
    }

    logger.info('Sending Excel file response', {
      bufferSize: excelBuffer.length,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      isBuffer: Buffer.isBuffer(excelBuffer),
    });

    // Ensure we're sending a proper Buffer
    const bufferToSend = Buffer.isBuffer(excelBuffer) ? excelBuffer : Buffer.from(excelBuffer);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="statistics.xlsx"');
    res.setHeader('Content-Length', bufferToSend.length.toString());
    res.setHeader('Cache-Control', 'no-cache');
    
    return res.end(bufferToSend, 'binary');
  } catch (error) {
    logger.error('Excel export error:', error);
    return res.status(500).json({ error: 'Failed to export statistics to Excel' });
  }
});

export default router;
