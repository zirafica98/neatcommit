-- CreateTable
CREATE TABLE "documentations" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fileName" TEXT,
    "filePath" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "totalLines" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentations_repositoryId_idx" ON "documentations"("repositoryId");

-- CreateIndex
CREATE INDEX "documentations_userId_idx" ON "documentations"("userId");

-- CreateIndex
CREATE INDEX "documentations_status_idx" ON "documentations"("status");

-- CreateIndex
CREATE INDEX "documentations_createdAt_idx" ON "documentations"("createdAt");

-- AddForeignKey
ALTER TABLE "documentations" ADD CONSTRAINT "documentations_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentations" ADD CONSTRAINT "documentations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
