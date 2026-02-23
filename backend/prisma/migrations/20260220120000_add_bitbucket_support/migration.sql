-- Add Bitbucket support to Installation and Repository
ALTER TABLE "installations" ADD COLUMN IF NOT EXISTS "bitbucketAccessToken" TEXT;
ALTER TABLE "installations" ADD COLUMN IF NOT EXISTS "bitbucketUsername" TEXT;

ALTER TABLE "repositories" ADD COLUMN IF NOT EXISTS "bitbucketWorkspace" TEXT;
ALTER TABLE "repositories" ADD COLUMN IF NOT EXISTS "bitbucketRepoSlug" TEXT;
