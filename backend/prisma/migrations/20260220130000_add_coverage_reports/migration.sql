-- CreateTable
CREATE TABLE "coverage_reports" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "lineCoverage" DOUBLE PRECISION,
    "branchCoverage" DOUBLE PRECISION,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coverage_reports_repositoryId_commitSha_key" ON "coverage_reports"("repositoryId", "commitSha");

-- CreateIndex
CREATE INDEX "coverage_reports_repositoryId_idx" ON "coverage_reports"("repositoryId");

-- CreateIndex
CREATE INDEX "coverage_reports_commitSha_idx" ON "coverage_reports"("commitSha");

-- AddForeignKey
ALTER TABLE "coverage_reports" ADD CONSTRAINT "coverage_reports_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
