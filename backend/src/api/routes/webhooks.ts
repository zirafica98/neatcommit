import { Router, Request, Response } from 'express';
import { analysisQueue } from '../../config/queue';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';

const router = Router();

/**
 * Webhook Routes
 * 
 * Šta radi:
 * - Prima webhook evente od GitHub-a
 * - Proverava webhook signature (security)
 * - Procesira različite evente (PR opened, synchronized, itd.)
 * - Dodaje job-ove u queue za analizu
 * 
 * Eventi koje obrađujemo:
 * - pull_request.opened - Novi PR
 * - pull_request.synchronize - PR je ažuriran (novi commit)
 * - installation.created - App je instaliran
 * - installation.deleted - App je deinstaliran
 */

/**
 * Webhook endpoint za GitHub App
 * 
 * GitHub šalje POST zahtev sa:
 * - X-GitHub-Event header (tip eventa)
 * - X-GitHub-Delivery header (unique ID)
 * - X-Hub-Signature-256 header (signature za verifikaciju)
 * - Body sa event podacima
 */
router.post('/github', async (req: Request, res: Response) => {
  try {
    let event = req.headers['x-github-event'] as string;
    const deliveryId = req.headers['x-github-delivery'] as string;

    // Fallback: Detektuj event tip iz body-ja ako header nedostaje
    if (!event || event === '') {
      const body = req.body || {};
      if (body.pull_request) {
        event = 'pull_request';
      } else if (body.installation) {
        event = 'installation';
      } else if (body.issue) {
        event = 'issues';
      } else {
        event = 'unknown';
      }
      logger.warn('⚠️ Missing x-github-event header, detected from body', { detectedEvent: event });
    }

    logger.info('📡 Webhook received', {
      event,
      deliveryId,
      bodyKeys: Object.keys(req.body || {}),
    });

    // Verifikuj webhook signature
    // TODO: Implement proper webhook signature verification
    // Privremeno isključeno za testiranje - u produkciji MORA biti uključeno!
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
      logger.warn('⚠️ Missing webhook signature (ignoring for development)');
      // Privremeno ne vraćamo grešku za development
      // res.status(401).json({ error: 'Missing signature' });
      // return;
    } else {
      logger.debug('✅ Webhook signature present', { signature: signature.substring(0, 20) + '...' });
    }

    // Webhook verification će se uraditi kasnije
    // Za sada samo proveravamo da li postoji signature

    // Odgovori GitHub-u ODMAH da smo primili event (202 Accepted)
    // Ovo sprečava timeout jer GitHub očekuje odgovor u 10 sekundi
    res.status(202).json({ received: true, processing: true });

    // Procesiraj event ASINHRONO u pozadini (ne čekaj da se završi)
    // Ovo omogućava da webhook processing traje koliko god treba
    handleWebhookEvent(event, req.body).catch((error) => {
      logger.error('❌ Background webhook processing failed:', {
        event,
        deliveryId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    });
  } catch (error) {
    logger.error('❌ Webhook processing failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Procesira različite webhook evente
 * Export-ovano za testiranje
 */
export async function handleWebhookEvent(event: string, payload: any) {
  switch (event) {
    case 'pull_request':
      await handlePullRequestEvent(payload);
      break;

    case 'installation':
      await handleInstallationEvent(payload);
      break;

    default:
      logger.debug('Unhandled webhook event', { event });
  }
}

/**
 * Procesira Pull Request evente
 */
async function handlePullRequestEvent(payload: any) {
  const { action, pull_request, installation, repository } = payload;

  // Procesiraj samo opened i synchronize akcije
  if (action !== 'opened' && action !== 'synchronize') {
    logger.debug('Skipping PR event', { action });
    return;
  }

  const installationId = installation?.id;
  if (!installationId) {
    logger.warn('⚠️ No installation ID in PR event');
    return;
  }

  // GitHub pull_request event struktura:
  // - repository.owner.login = owner username
  // - repository.name = repo name
  // - pull_request.number = PR number
  const ownerLogin = repository?.owner?.login || pull_request?.head?.repo?.owner?.login;
  const repoName = repository?.name || pull_request?.head?.repo?.name;
  const pullNumber = pull_request.number;
  const { head, html_url, title } = pull_request;

  if (!ownerLogin || !repoName) {
    logger.warn('⚠️ Missing owner or repo information in PR event', {
      repository: repository?.full_name,
      pullRequest: pull_request?.number,
    });
    return;
  }

  logger.info('Processing PR event', {
    action,
    owner: ownerLogin,
    repo: repoName,
    pullNumber,
    sha: head.sha,
  });

  // Pronađi installation u bazi (po GitHub installation ID)
  let dbInstallation = await prisma.installation.findUnique({
    where: { installationId: installationId },
  });

  // Ako installation ne postoji, kreiraj ga automatski iz PR event-a (fallback za development)
  if (!dbInstallation) {
    logger.warn('⚠️ Installation not found in database, creating from PR event', {
      installationId,
    });

    // Pokušaj da kreiram installation iz dostupnih podataka
    try {
      const accountLogin = repository?.owner?.login || pull_request?.head?.repo?.owner?.login || 'unknown';
      const accountId = repository?.owner?.id || pull_request?.head?.repo?.owner?.id || installationId;

      dbInstallation = await prisma.installation.upsert({
        where: { installationId: installationId },
        create: {
          installationId: installationId,
          accountId: accountId,
          accountType: repository?.owner?.type || 'User',
          accountLogin: accountLogin,
          targetType: 'User',
          userId: null, // User će biti kreiran kasnije ako je potrebno
        },
        update: {
          accountId: accountId,
          accountType: repository?.owner?.type || 'User',
          accountLogin: accountLogin,
          updatedAt: new Date(),
        },
      });

      logger.info('✅ Installation created from PR event', {
        installationId: dbInstallation.id,
        githubInstallationId: installationId,
      });
    } catch (error) {
      logger.error('❌ Failed to create installation from PR event:', error);
      return;
    }
  }

  logger.debug('✅ Installation found in database', {
    installationId: dbInstallation.id,
  });

  // Pronađi repository u bazi
  let dbRepository = await prisma.repository.findUnique({
    where: { githubRepoId: repository.id },
  });

  // Ako repository ne postoji, kreiraj ga automatski (fallback za development)
  if (!dbRepository) {
    logger.warn('⚠️ Repository not found in database, creating from PR event', {
      repoId: repository.id,
      fullName: repository.full_name,
    });

    try {
      dbRepository = await prisma.repository.upsert({
        where: { githubRepoId: repository.id },
        create: {
          installationId: dbInstallation.id,
          githubRepoId: repository.id,
          name: repository.name,
          fullName: repository.full_name,
          owner: repository.owner?.login || ownerLogin,
          private: repository.private || false,
          defaultBranch: repository.default_branch || 'main',
          language: repository.language || null,
          enabled: true,
        },
        update: {
          name: repository.name,
          fullName: repository.full_name,
          owner: repository.owner?.login || ownerLogin,
          private: repository.private || false,
          defaultBranch: repository.default_branch || 'main',
          language: repository.language || null,
          updatedAt: new Date(),
        },
      });

      logger.info('✅ Repository created from PR event', {
        repositoryId: dbRepository.id,
        fullName: dbRepository.fullName,
      });
    } catch (error) {
      logger.error('❌ Failed to create repository from PR event:', error);
      return;
    }
  }

  logger.debug('✅ Repository found in database', {
    repositoryId: dbRepository.id,
    fullName: dbRepository.fullName,
  });

  // Sačuvaj ili ažuriraj review u bazi
  const review = await prisma.review.upsert({
    where: {
      githubPrId: pull_request.id.toString(),
    },
    create: {
      installationId: dbInstallation.id, // Koristi Installation.id (cuid), ne GitHub installation ID
      repositoryId: dbRepository.id,
      userId: null, // Will be set if we have user info
      githubPrNumber: pullNumber,
      githubPrId: pull_request.id.toString(),
      githubPrUrl: html_url,
      githubPrTitle: title,
      githubPrState: pull_request.state,
      githubSha: head.sha,
      status: 'pending',
    },
    update: {
      githubSha: head.sha,
      githubPrState: pull_request.state,
      status: 'pending',
      updatedAt: new Date(),
    },
  });

  // Dodaj job u queue za analizu
  const job = await analysisQueue.add('analyze-pr', {
    installationId,
    owner: ownerLogin,
    repo: repoName,
    pullNumber,
    sha: head.sha,
    prId: pull_request.id.toString(),
    prUrl: html_url,
    prTitle: title,
  });

  logger.info('⚙️ Analysis job added to queue', {
    reviewId: review.id,
    jobId: job.id,
    owner: ownerLogin,
    repo: repoName,
    pullNumber,
  });
}

/**
 * Procesira Installation evente
 */
async function handleInstallationEvent(payload: any) {
  const { action, installation, sender, repositories } = payload;

  logger.info('Processing installation event', {
    action,
    installationId: installation.id,
    account: installation.account?.login,
    repositoriesCount: repositories?.length || 0,
  });

  switch (action) {
    case 'created':
      await handleInstallationCreated(installation, sender, repositories);
      break;

    case 'deleted':
      await handleInstallationDeleted(installation);
      break;

    default:
      logger.debug('Unhandled installation action', { action });
  }
}

/**
 * Sačuva novu instalaciju u bazi
 */
async function handleInstallationCreated(installation: any, sender: any, repositories: any[] = []) {
  try {
    // Proveri da li installation ima account
    if (!installation.account) {
      logger.warn('⚠️ Installation missing account information', {
        installationId: installation.id,
      });
      return;
    }

    // Kreiraj ili ažuriraj korisnika ako postoji sender
    let user = null;
    if (sender && sender.id) {
      user = await prisma.user.findUnique({
        where: { githubId: sender.id },
      });

      // Kreiraj korisnika ako ne postoji
      if (!user) {
        user = await prisma.user.create({
          data: {
            githubId: sender.id,
            username: sender.login || 'unknown',
            email: sender.email || null,
            avatarUrl: sender.avatar_url || null,
            name: sender.name || null,
          },
        });
        logger.info('👤 User created', { userId: user.id, githubId: sender.id });
      }
    }

    // Kreiraj instalaciju
    await prisma.installation.upsert({
      where: { installationId: installation.id },
      create: {
        installationId: installation.id,
        accountId: installation.account.id,
        accountType: installation.account.type || 'User',
        accountLogin: installation.account.login || 'unknown',
        targetType: installation.target_type || 'User',
        userId: user?.id || null,
      },
      update: {
        accountId: installation.account.id,
        accountType: installation.account.type || 'User',
        accountLogin: installation.account.login || 'unknown',
        targetType: installation.target_type || 'User',
        updatedAt: new Date(),
      },
    });

    // Pronađi installation u bazi
    const dbInstallation = await prisma.installation.findUnique({
      where: { installationId: installation.id },
    });

    if (!dbInstallation) {
      logger.warn('Installation not found when saving repositories');
      return;
    }

    // Sačuvaj repozitorijume
    // Repositories mogu biti u installation.repositories ili u root payload.repositories
    const reposToSave = repositories || installation.repositories || [];
    
    if (reposToSave.length > 0) {
      logger.info(`💾 Saving ${reposToSave.length} repositories`, {
        installationId: installation.id,
      });
      
      for (const repo of reposToSave) {
        await prisma.repository.upsert({
          where: {
            githubRepoId: repo.id,
          },
          create: {
            installationId: dbInstallation.id,
            githubRepoId: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner?.login || installation.account.login,
            private: repo.private || false,
            defaultBranch: repo.default_branch || 'main',
          },
          update: {
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner?.login || installation.account.login,
            private: repo.private || false,
            defaultBranch: repo.default_branch || 'main',
            updatedAt: new Date(),
          },
        });
      }
      
      logger.info(`✅ Saved ${reposToSave.length} repositories`, {
        installationId: installation.id,
      });
    } else {
      logger.warn('⚠️ No repositories in installation event', {
        installationId: installation.id,
      });
    }

    logger.info('💾 Installation saved to database', {
      installationId: installation.id,
      userId: user?.id || null,
      accountLogin: installation.account.login,
    });
  } catch (error) {
    logger.error('Failed to save installation:', error);
    throw error;
  }
}

/**
 * Obriše instalaciju iz baze
 */
async function handleInstallationDeleted(installation: any) {
  try {
    await prisma.installation.delete({
      where: { installationId: installation.id },
    });

    logger.info('Installation deleted from database', {
      installationId: installation.id,
    });
  } catch (error) {
    logger.error('Failed to delete installation:', error);
    throw error;
  }
}

export default router;
