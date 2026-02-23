/**
 * User Repositories Service
 * 
 * Dobija sve repozitorijume korisnika sa GitHub-a
 * i omogućava izbor dodatnih repozitorijuma
 */

// import { Octokit } from '@octokit/rest'; // Not used directly
import { logger } from '../utils/logger';
import prisma from '../config/database';
import { getInstallationOctokit } from './github-app.service';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
  };
  private: boolean;
  default_branch: string;
  language: string | null;
  description: string | null;
  updated_at: string;
}

export interface UserRepository {
  githubRepoId: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  language: string | null;
  description: string | null;
  isConnected: boolean; // Da li je već u našoj bazi
  connectedRepoId?: string; // ID u našoj bazi ako je connected
  enabled?: boolean; // Da li je enabled ako je connected
}

/**
 * Dobija sve repozitorijume korisnika koristeći GitHub App installation
 * 
 * @param userId - User ID
 */
export async function getUserRepositories(userId: string): Promise<UserRepository[]> {
  try {
    // Pronađi korisnika da dobijemo GitHub ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.warn('User not found', { userId });
      return [];
    }

    // Proveri da li korisnik ima GitHub ID
    if (!user.githubId) {
      logger.warn('User does not have GitHub ID - cannot fetch repositories', {
        userId,
        username: user.username,
      });
      return [];
    }

    // Pronađi sve installation-e za korisnika (po userId) ILI po GitHub account ID
    let installations = await prisma.installation.findMany({
      where: {
        OR: [
          { userId: userId },
          { accountId: user.githubId }, // Pokušaj i po GitHub account ID
        ],
      },
    });

    // Ako nema instalacija povezanih sa korisnikom, pokušaj da ih povežeš automatski
    if (installations.length === 0) {
      logger.info('No installations found for user, trying to link by accountId', {
        userId,
        githubId: user.githubId,
      });

      // Pronađi sve instalacije koje imaju isti accountId kao korisnikov GitHub ID
      const installationsByAccount = await prisma.installation.findMany({
        where: {
          accountId: user.githubId,
        },
      });

      logger.info('Found installations by accountId', {
        userId,
        githubId: user.githubId,
        installationsCount: installationsByAccount.length,
        installationIds: installationsByAccount.map(i => i.installationId),
      });

      if (installationsByAccount.length > 0) {
        // Poveži instalacije sa korisnikom
        const updated = await prisma.installation.updateMany({
          where: {
            accountId: user.githubId,
            userId: null, // Samo one koje nisu već povezane
          },
          data: {
            userId: userId,
          },
        });

        logger.info('Linked installations to user', {
          userId,
          githubId: user.githubId,
          linkedCount: updated.count,
          totalFound: installationsByAccount.length,
        });

        // Ponovo učitaj instalacije
        installations = await prisma.installation.findMany({
          where: {
            OR: [
              { userId: userId },
              { accountId: user.githubId },
            ],
          },
        });
      } else {
        logger.warn('No installations found by accountId', {
          userId,
          githubId: user.githubId,
        });
      }
    }

    logger.info('Found installations for user', {
      userId,
      githubId: user.githubId,
      installationsCount: installations.length,
      installationIds: installations.map((i) => i.installationId),
    });

    if (installations.length === 0) {
      logger.warn('No installations found for user', { userId, githubId: user.githubId });
      return [];
    }

    // Dobij sve repozitorijume iz svih installation-a
    const allRepos: Map<number, GitHubRepository> = new Map();

    for (const installation of installations) {
      try {
        logger.debug('Getting repositories for installation', {
          installationId: installation.installationId,
          accountId: installation.accountId,
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
        });

        // Proveri da li instalacija postoji i da li je validna
        let octokit;
        try {
          octokit = await getInstallationOctokit(installation.installationId);

          if (!octokit || !octokit.rest) {
            logger.warn('Octokit does not have rest property', {
              installationId: installation.installationId,
              hasOctokit: !!octokit,
            });
            continue;
          }
        } catch (octokitError) {
          logger.error('Failed to get installation octokit', {
            installationId: installation.installationId,
            error: octokitError instanceof Error ? octokitError.message : String(octokitError),
            status: (octokitError as any)?.status,
          });
          // Preskoči ovu instalaciju ako ne možemo da dobijemo octokit
          continue;
        }

        // Dobij sve repozitorijume za ovu instalaciju (sa paginacijom)
        // GitHub API može vratiti do 100 repozitorijuma po stranici
        let page = 1;
        let hasMore = true;
        let totalRepos = 0;

        while (hasMore) {
          try {
            // Za installation token, koristimo GET /installation/repositories endpoint
            // Ovo je direktan API poziv jer Octokit možda nema ovu metodu
            const response = await octokit.request('GET /installation/repositories', {
              per_page: 100,
              page: page,
            });
            const data = response.data;

            logger.debug('Fetched repositories page', {
              installationId: installation.installationId,
              page,
              reposInPage: data.repositories.length,
              totalCount: data.total_count,
            });

            for (const repo of data.repositories) {
              // Koristi repo.id kao key da izbegnemo duplikate
              if (!allRepos.has(repo.id)) {
                allRepos.set(repo.id, {
                  id: repo.id,
                  name: repo.name,
                  full_name: repo.full_name,
                  owner: {
                    login: repo.owner.login,
                    id: repo.owner.id,
                  },
                  private: repo.private,
                  default_branch: repo.default_branch,
                  language: repo.language,
                  description: repo.description,
                  updated_at: repo.updated_at || new Date().toISOString(),
                });
                totalRepos++;
              }
            }

            // Proveri da li ima još stranica
            hasMore = data.repositories.length === 100 && totalRepos < (data.total_count || 0);
            page++;
          } catch (pageError) {
            logger.error('Failed to fetch repositories page', {
              installationId: installation.installationId,
              page,
              error: pageError instanceof Error ? pageError.message : String(pageError),
              status: (pageError as any)?.status,
              response: (pageError as any)?.response?.data,
            });
            // Prekini paginaciju za ovu instalaciju
            hasMore = false;
          }
        }

        logger.info('Fetched all repositories for installation', {
          installationId: installation.installationId,
          totalRepos,
        });
      } catch (error) {
        logger.error('Failed to get repositories for installation', {
          installationId: installation.installationId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          status: (error as any)?.status,
          response: (error as any)?.response?.data,
        });
        // Nastavi sa sledećom instalacijom
      }
    }

    // Pronađi koje repozitorijume već imamo u bazi
    const connectedRepoIds = Array.from(allRepos.keys());
    const connectedRepos = await prisma.repository.findMany({
      where: {
        githubRepoId: {
          in: connectedRepoIds,
        },
      },
    });

    const connectedReposMap = new Map(
      connectedRepos.map((r) => [r.githubRepoId, r])
    );

    // Mapiraj u UserRepository format
    const userRepos: UserRepository[] = Array.from(allRepos.values()).map(
      (repo) => {
        const connectedRepo = connectedReposMap.get(repo.id);
        return {
          githubRepoId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          private: repo.private,
          defaultBranch: repo.default_branch,
          language: repo.language,
          description: repo.description,
          isConnected: !!connectedRepo,
          connectedRepoId: connectedRepo?.id,
          enabled: connectedRepo?.enabled,
        };
      }
    );

    // Sortiraj: prvo connected, pa po imenu
    userRepos.sort((a, b) => {
      if (a.isConnected !== b.isConnected) {
        return a.isConnected ? -1 : 1;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    logger.info('User repositories retrieved', {
      userId,
      totalRepos: userRepos.length,
      connectedRepos: userRepos.filter((r) => r.isConnected).length,
    });

    return userRepos;
  } catch (error) {
    logger.error('Failed to get user repositories:', error);
    throw error;
  }
}

/**
 * Povezuje repozitorijum sa našom bazom
 * 
 * @param userId - User ID
 * @param githubRepoId - GitHub repository ID
 */
export async function connectRepository(
  userId: string,
  githubRepoId: number
): Promise<UserRepository> {
  try {
    // Pronađi installation za korisnika
    const installation = await prisma.installation.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!installation) {
      throw new Error('No installation found for user');
    }

    // Dobij informacije o repozitorijumu sa GitHub-a
    const octokit = await getInstallationOctokit(installation.installationId);

    if (!octokit.rest) {
      throw new Error('Octokit instance does not have rest property');
    }

    // Pronađi repozitorijum u listi installation repozitorijuma
    // Za installation token, koristimo GET /installation/repositories endpoint
    const response = await octokit.request('GET /installation/repositories', {
      per_page: 100,
    });
    const data = response.data;

    const repo = data.repositories.find((r) => r.id === githubRepoId);

    if (!repo) {
      throw new Error('Repository not found in installation');
    }

    // Proveri da li već postoji u bazi (githubRepoId nije više unique, koristi findFirst)
    let dbRepo = await prisma.repository.findFirst({
      where: { provider: 'github', githubRepoId: githubRepoId },
    });

    if (dbRepo) {
      // Ažuriraj ako već postoji
      dbRepo = await prisma.repository.update({
        where: { id: dbRepo.id },
        data: {
          enabled: true,
          updatedAt: new Date(),
        },
      });
    } else {
      // Kreiraj novi
      dbRepo = await prisma.repository.create({
        data: {
          installationId: installation.id,
          githubRepoId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          private: repo.private,
          defaultBranch: repo.default_branch,
          language: repo.language,
          enabled: true,
        },
      });
    }

    logger.info('Repository connected', {
      userId,
      repositoryId: dbRepo.id,
      githubRepoId,
    });

    return {
      githubRepoId: dbRepo.githubRepoId,
      name: dbRepo.name,
      fullName: dbRepo.fullName,
      owner: dbRepo.owner,
      private: dbRepo.private,
      defaultBranch: dbRepo.defaultBranch,
      language: dbRepo.language,
      description: null,
      isConnected: true,
      connectedRepoId: dbRepo.id,
      enabled: dbRepo.enabled,
    };
  } catch (error) {
    logger.error('Failed to connect repository:', error);
    throw error;
  }
}
