-- AlterTable
ALTER TABLE "files" ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "folderId" TEXT,
ADD COLUMN     "hash" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "ocrText" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "entity" DROP NOT NULL,
ALTER COLUMN "entityId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "document_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "hash" TEXT,
    "comment" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_shares" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "sharedWithId" TEXT,
    "sharedWithTeamId" TEXT,
    "permission" TEXT NOT NULL DEFAULT 'view',
    "token" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_folders_tenantId_idx" ON "document_folders"("tenantId");

-- CreateIndex
CREATE INDEX "document_folders_parentId_idx" ON "document_folders"("parentId");

-- CreateIndex
CREATE INDEX "document_versions_fileId_idx" ON "document_versions"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_fileId_version_key" ON "document_versions"("fileId", "version");

-- CreateIndex
CREATE INDEX "document_shares_fileId_idx" ON "document_shares"("fileId");

-- CreateIndex
CREATE INDEX "document_shares_token_idx" ON "document_shares"("token");

-- CreateIndex
CREATE INDEX "document_shares_tenantId_idx" ON "document_shares"("tenantId");

-- CreateIndex
CREATE INDEX "files_folderId_idx" ON "files"("folderId");

-- CreateIndex
CREATE INDEX "files_hash_idx" ON "files"("hash");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "document_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "document_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_shares" ADD CONSTRAINT "document_shares_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
