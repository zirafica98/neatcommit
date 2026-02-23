-- Add GitLab and Bitbucket user identifiers for login
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gitlabId" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bitbucketUuid" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_gitlabId_key" ON "users"("gitlabId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_bitbucketUuid_key" ON "users"("bitbucketUuid");
CREATE INDEX IF NOT EXISTS "users_gitlabId_idx" ON "users"("gitlabId");
CREATE INDEX IF NOT EXISTS "users_bitbucketUuid_idx" ON "users"("bitbucketUuid");
