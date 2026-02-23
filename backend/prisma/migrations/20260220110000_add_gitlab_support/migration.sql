-- AlterTable: Installation - add provider and gitlab token
ALTER TABLE "installations" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'github';
ALTER TABLE "installations" ADD COLUMN "gitlabAccessToken" TEXT;

-- AlterTable: Repository - add provider and gitlab project id
ALTER TABLE "repositories" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'github';
ALTER TABLE "repositories" ADD COLUMN "gitlabProjectId" TEXT;

-- Drop unique on githubRepoId so GitLab repos can use 0
ALTER TABLE "repositories" DROP CONSTRAINT IF EXISTS "repositories_githubRepoId_key";

-- CreateIndex for provider lookups
CREATE INDEX "installations_provider_idx" ON "installations"("provider");
CREATE INDEX "repositories_provider_idx" ON "repositories"("provider");
