import { Router, Request, Response } from 'express';
import { analysisQueue } from '../../config/queue';
import { logger } from '../../utils/logger';
import prisma from '../../config/database';
import env from '../../config/env';

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

    // Za webhook verification, treba nam raw body (Buffer)
    // Raw body je sačuvan u middleware-u pre express.json()
    const rawBody = (req as any).rawBody;
    const parsedBody = (req as any).parsedBody || req.body;
    
    logger.info('📡 Webhook received', {
      event,
      deliveryId,
      hasRawBody: !!rawBody,
      rawBodyType: rawBody ? (Buffer.isBuffer(rawBody) ? 'Buffer' : typeof rawBody) : 'none',
      bodyKeys: Object.keys(parsedBody || {}),
    });

    // Verifikuj webhook signature za bezbednost
    const signature = req.headers['x-hub-signature-256'] as string;
    
    if (!rawBody) {
      logger.error('❌ Raw body not available for webhook verification', {
        event,
        deliveryId,
        hasBody: !!req.body,
      });
      return res.status(400).json({ error: 'Raw body required for webhook verification' });
    }
    
    // Importuj verification utility
    const { verifyGitHubWebhookSignature } = await import('../../utils/webhook-verification');
    
    // Raw body je već Buffer, koristi ga direktno
    // VAŽNO: Ne menjaj Buffer na bilo koji način - koristi ga tačno kako je sačuvan
    const bodyForVerification = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    
    logger.debug('Verifying webhook signature', {
      rawBodyIsBuffer: Buffer.isBuffer(rawBody),
      bodyLength: bodyForVerification.length,
      signaturePrefix: signature ? signature.substring(0, 20) : 'missing',
    });
    
    const isValid = verifyGitHubWebhookSignature(
      bodyForVerification,
      signature
    );
    
    if (!isValid) {
      logger.error('❌ Webhook signature verification failed', {
        event,
        deliveryId,
        hasSignature: !!signature,
      });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    logger.debug('✅ Webhook signature verified', { event, deliveryId });

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
    return;
  } catch (error) {
    logger.error('❌ Webhook processing failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: 'Webhook processing failed' });
    return;
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

  // Pronađi repository u bazi (provider=github, githubRepoId – unique per GitHub repo)
  let dbRepository = await prisma.repository.findFirst({
    where: { provider: 'github', githubRepoId: repository.id },
  });

  // Ako repository ne postoji, kreiraj ga automatski (fallback za development)
  if (!dbRepository) {
    logger.warn('⚠️ Repository not found in database, creating from PR event', {
      repoId: repository.id,
      fullName: repository.full_name,
    });

    try {
      dbRepository = await prisma.repository.upsert({
        where: {
          installationId_fullName: {
            installationId: dbInstallation.id,
            fullName: repository.full_name,
          },
        },
        create: {
          installationId: dbInstallation.id,
          provider: 'github',
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
      try {
        await handleInstallationCreated(installation, sender, repositories);
      } catch (err) {
        logger.error('❌ handleInstallationCreated failed', {
          installationId: installation?.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        throw err;
      }
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
  const installationId = installation?.id;
  logger.info('handleInstallationCreated started', { installationId });
  try {
    if (!installation.account) {
      logger.warn('⚠️ Installation missing account information', { installationId });
      return;
    }

    // PRVO: Pokušaj da pronađeš korisnika po installation.account.id (vlasnik account-a)
    // Ovo je važno jer installation.account.id je pravi vlasnik account-a na koji je App instaliran
    let user = await prisma.user.findUnique({
      where: { githubId: installation.account.id },
    });

    // Ako ne postoji korisnik sa installation.account.id, kreiraj ga
    if (!user && installation.account.id) {
      user = await prisma.user.create({
        data: {
          githubId: installation.account.id,
          username: installation.account.login || 'unknown',
          email: null, // Email nije dostupan u installation.account
          avatarUrl: installation.account.avatar_url || null,
          name: installation.account.name || null,
        },
      });
      logger.info('👤 User created from installation.account', { 
        userId: user.id, 
        githubId: installation.account.id,
        username: installation.account.login,
      });
    }

    // FALLBACK: Ako i dalje nema korisnika, pokušaj sa sender.id (osoba koja je instalirala)
    // Ovo je korisno ako je App instaliran na organizaciju, a sender je član
    if (!user && sender && sender.id) {
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
        logger.info('👤 User created from sender', { userId: user.id, githubId: sender.id });
      }
    }

    // Kreiraj instalaciju
    // VAŽNO: Ako postoji korisnik sa githubId === installation.account.id, poveži ga
    // Ako ne postoji, installation će biti kreiran sa userId: null, ali će se kasnije
    // automatski povezati kada korisnik loguje (u getUserRepositories funkciji)
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
        ...(user && { userId: user.id }),
        updatedAt: new Date(),
      },
    });
    logger.info('✅ Installation saved to DB', { installationId, accountLogin: installation.account?.login });

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
            installationId_fullName: {
              installationId: dbInstallation.id,
              fullName: repo.full_name,
            },
          },
          create: {
            installationId: dbInstallation.id,
            provider: 'github',
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
      accountId: installation.account.id,
      accountLogin: installation.account.login,
      accountType: installation.account.type,
      linkedToUser: !!user,
    });

    // Ako je korisnik kreiran ili povezan, logujemo ga
    // Korisnik će se automatski logovati kada dođe na callback URL nakon instalacije
    if (user) {
      logger.info('✅ User ready for authentication via installation', {
        userId: user.id,
        username: user.username,
        installationId: installation.id,
        completeUrl: `${env.API_URL}/api/auth/github/complete?installation_id=${installation.id}`,
      });
    }
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

/**
 * GitLab webhook: Merge Request Hook
 * Verify X-Gitlab-Token, find repo by project id, create/update review, enqueue analyze-gitlab-mr.
 */
router.post('/gitlab', async (req: Request, res: Response) => {
  try {
    const secret = env.GITLAB_WEBHOOK_SECRET;
    if (secret) {
      const token = req.headers['x-gitlab-token'] as string;
      if (token !== secret) {
        logger.warn('GitLab webhook: invalid or missing token');
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const payload = req.body;
    if (payload?.object_kind !== 'merge_request') {
      logger.debug('GitLab webhook: ignoring non merge_request event', { object_kind: payload?.object_kind });
      return res.status(200).json({ ok: true });
    }

    const attrs = payload.object_attributes || {};
    const action = attrs.action;
    if (action !== 'open' && action !== 'update' && action !== 'reopen') {
      logger.debug('GitLab webhook: ignoring action', { action });
      return res.status(200).json({ ok: true });
    }

    const project = payload.project || {};
    const projectId = project.id != null ? String(project.id) : project.path_with_namespace;
    const pathWithNamespace = project.path_with_namespace || '';
    const mrIid = attrs.iid;
    const sha = attrs.last_commit?.id || attrs.sha || '';
    const title = attrs.title || '';
    const state = attrs.state || 'opened';
    const webUrl = attrs.url || payload.object_attributes?.url || '';

    if (!projectId || !mrIid) {
      logger.warn('GitLab webhook: missing project.id or object_attributes.iid');
      return res.status(400).json({ error: 'Missing project or MR id' });
    }

    const dbRepository = await prisma.repository.findFirst({
      where: { provider: 'gitlab', gitlabProjectId: projectId },
      include: { installation: true },
    });

    if (!dbRepository?.installation) {
      logger.info('GitLab webhook: no enabled repo or installation for project', { projectId });
      return res.status(200).json({ ok: true });
    }

    if (!dbRepository.enabled) {
      return res.status(200).json({ ok: true });
    }

    const inst = dbRepository.installation;
    if (inst.provider !== 'gitlab' || !inst.gitlabAccessToken) {
      logger.warn('GitLab webhook: installation missing token', { installationId: inst.id });
      return res.status(200).json({ ok: true });
    }

    const branchId = `gitlab:${projectId}:${mrIid}`;
    const review = await prisma.review.upsert({
      where: { githubPrId: branchId },
      create: {
        installationId: inst.id,
        repositoryId: dbRepository.id,
        userId: inst.userId ?? undefined,
        githubPrNumber: mrIid,
        githubPrId: branchId,
        githubPrUrl: webUrl || `https://gitlab.com/${pathWithNamespace}/-/merge_requests/${mrIid}`,
        githubPrTitle: title,
        githubPrState: state,
        githubSha: sha,
        status: 'pending',
      },
      update: {
        githubSha: sha,
        githubPrState: state,
        status: 'pending',
        updatedAt: new Date(),
      },
    });

    await analysisQueue.add('analyze-gitlab-mr', {
      installationId: inst.id,
      repositoryId: dbRepository.id,
      projectId,
      mrIid,
      sha,
      branchId,
    });

    logger.info('GitLab MR analysis job queued', {
      reviewId: review.id,
      projectId,
      mrIid,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('GitLab webhook failed', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Webhook failed' });
  }
});

/**
 * Bitbucket webhook: Pull Request created/updated
 * X-Event-Key: pullrequest:created, pullrequest:updated
 */
router.post('/bitbucket', async (req: Request, res: Response) => {
  try {
    const eventKey = req.headers['x-event-key'] as string;
    if (eventKey !== 'pullrequest:created' && eventKey !== 'pullrequest:updated') {
      logger.debug('Bitbucket webhook: ignoring event', { eventKey });
      return res.status(200).json({ ok: true });
    }

    const payload = req.body;
    const repository = payload.repository || {};
    const pullrequest = payload.pullrequest || {};
    const fullName = repository.full_name;
    const prId = pullrequest.id;
    const sha = pullrequest.source?.commit?.hash || '';
    const title = pullrequest.title || '';
    const state = pullrequest.state || 'OPEN';
    const htmlUrl = pullrequest.links?.html?.href || '';

    if (!fullName || !prId) {
      logger.warn('Bitbucket webhook: missing repository.full_name or pullrequest.id');
      return res.status(400).json({ error: 'Missing repository or PR id' });
    }

    const [workspace, repoSlug] = fullName.includes('/') ? fullName.split('/', 2) : [fullName, ''];

    const dbRepository = await prisma.repository.findFirst({
      where: { provider: 'bitbucket', fullName },
      include: { installation: true },
    });

    if (!dbRepository?.installation) {
      logger.info('Bitbucket webhook: no enabled repo or installation', { fullName });
      return res.status(200).json({ ok: true });
    }

    if (!dbRepository.enabled) {
      return res.status(200).json({ ok: true });
    }

    const inst = dbRepository.installation;
    if (inst.provider !== 'bitbucket' || !inst.bitbucketAccessToken) {
      logger.warn('Bitbucket webhook: installation missing token', { installationId: inst.id });
      return res.status(200).json({ ok: true });
    }

    const branchId = `bitbucket:${workspace}:${repoSlug}:${prId}`;
    const review = await prisma.review.upsert({
      where: { githubPrId: branchId },
      create: {
        installationId: inst.id,
        repositoryId: dbRepository.id,
        userId: inst.userId ?? undefined,
        githubPrNumber: prId,
        githubPrId: branchId,
        githubPrUrl: htmlUrl,
        githubPrTitle: title,
        githubPrState: state,
        githubSha: sha,
        status: 'pending',
      },
      update: {
        githubSha: sha,
        githubPrState: state,
        status: 'pending',
        updatedAt: new Date(),
      },
    });

    await analysisQueue.add('analyze-bitbucket-pr', {
      installationId: inst.id,
      repositoryId: dbRepository.id,
      workspace,
      repoSlug,
      prId,
      sha,
      branchId,
    });

    logger.info('Bitbucket PR analysis job queued', { reviewId: review.id, fullName, prId });
    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('Bitbucket webhook failed', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Webhook failed' });
  }
});

export default router;
