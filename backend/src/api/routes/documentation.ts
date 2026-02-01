/**
 * Documentation Routes
 * 
 * API endpoints za generisanje i preuzimanje dokumentacije
 */

import { Router, Request, Response } from 'express';
import { Queue } from 'bullmq';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';
import { verifyAccessToken } from '../../services/auth.service';
import * as fs from 'fs';
// import * as path from 'path'; // Not used

const router = Router();

/**
 * POST /api/documentation/generate
 * 
 * Pokreće generisanje dokumentacije za repozitorijum
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    logger.info('📝 POST /api/documentation/generate called');
    
    // Proveri autentifikaciju
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('⚠️ Missing authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      logger.warn('⚠️ Invalid token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    logger.info('✅ User authenticated', { userId: payload.userId });

    const { repositoryId } = req.body;

    if (!repositoryId) {
      logger.warn('⚠️ Missing repositoryId');
      return res.status(400).json({ error: 'Missing repositoryId' });
    }

    logger.info('🔍 Looking for repository', { repositoryId });

    // Pronađi repozitorijum
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: {
        installation: true,
      },
    });

    if (!repository) {
      logger.warn('⚠️ Repository not found', { repositoryId });
      return res.status(404).json({ error: 'Repository not found' });
    }

    logger.info('✅ Repository found', { 
      repositoryId: repository.id,
      fullName: repository.fullName,
      installationId: repository.installation.installationId,
    });

    // Proveri da li korisnik ima pristup
    // TODO: Dodati proveru da li korisnik ima pristup ovom repozitorijumu

    // Proveri da li već postoji dokumentacija u procesu
    logger.info('🔍 Checking for existing documentation');
    const existingDoc = await prisma.documentation.findFirst({
      where: {
        repositoryId,
        status: {
          in: ['pending', 'processing'],
        },
      },
    });

    if (existingDoc) {
      // Proveri da li je dokumentacija "zaglavljena" (starija od 10 minuta)
      const createdAt = existingDoc.createdAt.getTime();
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000; // 10 minuta
      const isStuck = createdAt < tenMinutesAgo;

      if (isStuck) {
        logger.warn('⚠️ Found stuck documentation, marking as failed', {
          documentationId: existingDoc.id,
          createdAt: existingDoc.createdAt.toISOString(),
          ageMinutes: Math.round((now - createdAt) / 1000 / 60),
        });
        // Označi zaglavljenu dokumentaciju kao failed
        await prisma.documentation.update({
          where: { id: existingDoc.id },
          data: {
            status: 'failed',
            errorMessage: 'Documentation generation timed out (stuck for more than 10 minutes)',
          },
        });
        logger.info('✅ Stuck documentation marked as failed, allowing new generation');
      } else {
        logger.info('⚠️ Documentation already in progress', {
          documentationId: existingDoc.id,
          createdAt: existingDoc.createdAt.toISOString(),
          ageMinutes: Math.round((now - createdAt) / 1000 / 60),
        });
        return res.status(400).json({
          error: 'Documentation generation already in progress',
          documentationId: existingDoc.id,
        });
      }
    }

    // Kreiraj dokumentaciju u bazi
    logger.info('💾 Creating documentation record');
    const documentation = await prisma.documentation.create({
      data: {
        repositoryId,
        userId: payload.userId,
        status: 'pending',
      },
    });

    logger.info('✅ Documentation record created', { documentationId: documentation.id });

    // Obriši stare dokumentacije za ovaj repozitorijum (osim trenutne)
    logger.info('🗑️ Deleting old documentations for repository', { repositoryId });
    const oldDocumentations = await prisma.documentation.findMany({
      where: {
        repositoryId,
        id: {
          not: documentation.id, // Ne briši trenutnu dokumentaciju
        },
      },
    });

    // Obriši fajlove sa diska ako postoje
    for (const oldDoc of oldDocumentations) {
      if (oldDoc.filePath && fs.existsSync(oldDoc.filePath)) {
        try {
          fs.unlinkSync(oldDoc.filePath);
          logger.debug('Deleted old documentation file', { filePath: oldDoc.filePath });
        } catch (error) {
          logger.warn('Failed to delete old documentation file', {
            filePath: oldDoc.filePath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Obriši stare dokumentacije iz baze
    if (oldDocumentations.length > 0) {
      await prisma.documentation.deleteMany({
        where: {
          repositoryId,
          id: {
            not: documentation.id, // Ne briši trenutnu dokumentaciju
          },
        },
      });
      logger.info('✅ Deleted old documentations', {
        count: oldDocumentations.length,
        repositoryId,
      });
    }

    // Dodaj job u queue
    logger.info('📦 Loading documentation queue');
    // Koristimo dynamic import da izbegnemo probleme sa učitavanjem modula
    let queue: Queue;
    try {
      const queueModule = await import('../../config/queue');
      queue = queueModule.documentationQueue;
      
      logger.info('Queue module imported', {
        availableExports: Object.keys(queueModule),
        hasDocumentationQueue: 'documentationQueue' in queueModule,
        queueType: typeof queue,
        queueValue: queue ? 'defined' : 'undefined',
      });
      
      if (!queue) {
        logger.error('Documentation queue is undefined after import', {
          availableExports: Object.keys(queueModule),
          queueModuleKeys: Object.keys(queueModule),
        });
        return res.status(500).json({ error: 'Documentation queue not available' });
      }
      
      logger.info('Documentation queue loaded successfully', {
        queueName: queue?.name,
        hasAdd: typeof queue?.add === 'function',
      });
    } catch (error) {
      logger.error('Failed to import documentation queue:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return res.status(500).json({ 
        error: 'Failed to initialize documentation queue',
        message: error instanceof Error ? error.message : String(error),
      });
    }
    
    if (!queue || typeof queue.add !== 'function') {
      logger.error('Queue is invalid', {
        queue: queue,
        hasAdd: typeof queue?.add,
      });
      return res.status(500).json({ error: 'Documentation queue is invalid' });
    }
    
    const job = await queue.add('generate-documentation', {
      documentationId: documentation.id,
      repositoryId: repository.id,
      installationId: parseInt(repository.installation.installationId.toString()),
      owner: repository.owner,
      repo: repository.name,
      branch: repository.defaultBranch,
    });

    logger.info('Documentation generation job added to queue', {
      documentationId: documentation.id,
      repositoryId: repository.id,
      jobId: job.id,
    });

    return res.status(202).json({
      success: true,
      documentationId: documentation.id,
      status: 'pending',
      message: 'Documentation generation started',
    });
  } catch (error) {
    logger.error('Failed to start documentation generation:', error);
    return res.status(500).json({
      error: 'Failed to start documentation generation',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/documentation/:id
 * 
 * Dobija status dokumentacije
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const documentation = await prisma.documentation.findUnique({
      where: { id },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            fullName: true,
            owner: true,
          },
        },
      },
    });

    if (!documentation) {
      return res.status(404).json({ error: 'Documentation not found' });
    }

    return res.json({
      id: documentation.id,
      repositoryId: documentation.repositoryId,
      status: documentation.status,
      fileName: documentation.fileName,
      fileUrl: documentation.fileUrl,
      fileSize: documentation.fileSize,
      totalFiles: documentation.totalFiles,
      totalLines: documentation.totalLines,
      errorMessage: documentation.errorMessage,
      startedAt: documentation.startedAt?.toISOString(),
      completedAt: documentation.completedAt?.toISOString(),
      createdAt: documentation.createdAt.toISOString(),
      repository: documentation.repository,
    });
  } catch (error) {
    logger.error('Failed to get documentation:', error);
    return res.status(500).json({
      error: 'Failed to get documentation',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/documentation/:id/download
 * 
 * Preuzima .doc fajl sa dokumentacijom
 */
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const documentation = await prisma.documentation.findUnique({
      where: { id },
    });

    if (!documentation) {
      return res.status(404).json({ error: 'Documentation not found' });
    }

    if (documentation.status !== 'completed') {
      return res.status(400).json({
        error: 'Documentation is not ready',
        status: documentation.status,
      });
    }

    if (!documentation.filePath || !fs.existsSync(documentation.filePath)) {
      return res.status(404).json({ error: 'Documentation file not found' });
    }

    // Pošalji fajl
    const fileName = documentation.fileName || 'documentation.docx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(documentation.filePath);
    fileStream.pipe(res);
    return; // File stream will handle the response
  } catch (error) {
    logger.error('Failed to download documentation:', error);
    return res.status(500).json({
      error: 'Failed to download documentation',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/documentation/repository/:repositoryId
 * 
 * Dobija listu dokumentacija za repozitorijum
 */
router.get('/repository/:repositoryId', async (req: Request, res: Response) => {
  try {
    const { repositoryId } = req.params;

    const documentations = await prisma.documentation.findMany({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
      take: 10, // Poslednjih 10
    });

    return res.json({
      count: documentations.length,
      documentations: documentations.map((doc) => ({
        id: doc.id,
        status: doc.status,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        totalFiles: doc.totalFiles,
        totalLines: doc.totalLines,
        createdAt: doc.createdAt.toISOString(),
        completedAt: doc.completedAt?.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Failed to get documentations:', error);
    return res.status(500).json({
      error: 'Failed to get documentations',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
