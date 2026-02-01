/**
 * Documentation Worker
 * 
 * Asinhrono generiše dokumentaciju za repozitorijum
 */

import { Worker, Job } from 'bullmq';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import { queueOptions } from '../config/queue';
import {
  fetchRepositoryFiles,
  analyzeProjectStructure,
  generateDocumentation,
  createDocumentationFile,
} from '../services/documentation.service';

export interface GenerateDocumentationJob {
  documentationId: string;
  repositoryId: string;
  installationId: number;
  owner: string;
  repo: string;
  branch: string;
}

logger.info('Creating documentation worker...');

export const documentationWorker = new Worker(
  'documentation',
  async (job: Job<GenerateDocumentationJob>) => {
    const { documentationId, repositoryId, installationId, owner, repo, branch } = job.data;

    logger.info(`📝 Processing documentation job for ${owner}/${repo}`, {
      jobId: job.id,
      documentationId,
      attempt: job.attemptsMade + 1,
    });

    try {
      // 1. Ažuriraj status na processing
      await prisma.documentation.update({
        where: { id: documentationId },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });

      // 2. Fetchuj sve fajlove iz repozitorijuma
      logger.info('Fetching repository files...', { owner, repo, branch });
      const files = await fetchRepositoryFiles(installationId, owner, repo, branch);

      if (files.length === 0) {
        throw new Error('No files found in repository');
      }

      // 3. Analiziraj strukturu projekta
      logger.info('Analyzing project structure...', {
        totalFiles: files.length,
      });
      const structure = analyzeProjectStructure(files);

      // 4. Ažuriraj dokumentaciju sa statistikama
      await prisma.documentation.update({
        where: { id: documentationId },
        data: {
          totalFiles: structure.totalFiles,
          totalLines: structure.totalLines,
        },
      });

      // 5. Generiši dokumentaciju koristeći LLM
      logger.info('Generating documentation with LLM...');
      const documentation = await generateDocumentation(structure, files);

      // 6. Kreiraj .doc fajl
      logger.info('Creating documentation file...');
      const repoData = await prisma.repository.findUnique({
        where: { id: repositoryId },
      });

      const projectName = repoData?.fullName || `${owner}/${repo}`;
      const { filePath, fileName, fileSize } = await createDocumentationFile(
        documentation,
        projectName
      );

      // 7. Ažuriraj dokumentaciju sa fajl informacijama
      const baseUrl = process.env.API_URL || 'http://localhost:3000';
      const fileUrl = `${baseUrl}/api/documentation/${documentationId}/download`;

      await prisma.documentation.update({
        where: { id: documentationId },
        data: {
          status: 'completed',
          fileName,
          filePath,
          fileUrl,
          fileSize,
          completedAt: new Date(),
        },
      });

      logger.info('Documentation generated successfully', {
        documentationId,
        fileName,
        fileSize,
        totalFiles: structure.totalFiles,
        totalLines: structure.totalLines,
      });

      return {
        success: true,
        fileName,
        fileUrl,
        fileSize,
      };
    } catch (error) {
      logger.error('Documentation generation failed:', {
        documentationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Ažuriraj status na failed
      await prisma.documentation.update({
        where: { id: documentationId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });

      throw error;
    }
  },
    {
      connection: queueOptions.connection,
      concurrency: 2, // Max 2 dokumentacije istovremeno (jer je resource-intensive)
    }
);

// Worker event handlers
documentationWorker.on('completed', (job) => {
  logger.info('Documentation job completed', { jobId: job.id });
});

documentationWorker.on('failed', (job, err) => {
  logger.error('Documentation job failed', {
    jobId: job?.id,
    error: err.message,
  });
});

logger.info('✅ Documentation worker ready');
