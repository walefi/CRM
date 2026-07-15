-- CreateEnum
CREATE TYPE "SearchProvider" AS ENUM ('POSTGRESQL', 'ELASTICSEARCH', 'OPENSEARCH', 'MEILISEARCH', 'ALGOLIA');

-- CreateTable
CREATE TABLE "search_indexes" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "content" TEXT NOT NULL,
    "searchVector" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "url" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reindexedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_documents" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "contentPreview" TEXT,
    "tags" TEXT[],
    "url" TEXT,
    "thumbnail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "indexId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "search_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_favorites" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_saved_filters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_saved_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_indexes_tenantId_idx" ON "search_indexes"("tenantId");

-- CreateIndex
CREATE INDEX "search_indexes_entityType_idx" ON "search_indexes"("entityType");

-- CreateIndex
CREATE INDEX "search_indexes_title_idx" ON "search_indexes"("title");

-- CreateIndex
CREATE INDEX "search_indexes_tags_idx" ON "search_indexes"("tags");

-- CreateIndex
CREATE INDEX "search_indexes_score_idx" ON "search_indexes"("score");

-- CreateIndex
CREATE INDEX "search_indexes_indexedAt_idx" ON "search_indexes"("indexedAt");

-- CreateIndex
CREATE UNIQUE INDEX "search_indexes_entityType_entityId_key" ON "search_indexes"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "search_documents_tenantId_idx" ON "search_documents"("tenantId");

-- CreateIndex
CREATE INDEX "search_documents_entityType_idx" ON "search_documents"("entityType");

-- CreateIndex
CREATE INDEX "search_documents_entityId_idx" ON "search_documents"("entityId");

-- CreateIndex
CREATE INDEX "search_documents_title_idx" ON "search_documents"("title");

-- CreateIndex
CREATE INDEX "search_documents_status_idx" ON "search_documents"("status");

-- CreateIndex
CREATE INDEX "search_documents_deletedAt_idx" ON "search_documents"("deletedAt");

-- CreateIndex
CREATE INDEX "search_documents_createdAt_idx" ON "search_documents"("createdAt");

-- CreateIndex
CREATE INDEX "search_history_tenantId_idx" ON "search_history"("tenantId");

-- CreateIndex
CREATE INDEX "search_history_userId_idx" ON "search_history"("userId");

-- CreateIndex
CREATE INDEX "search_history_query_idx" ON "search_history"("query");

-- CreateIndex
CREATE INDEX "search_history_createdAt_idx" ON "search_history"("createdAt");

-- CreateIndex
CREATE INDEX "search_favorites_tenantId_idx" ON "search_favorites"("tenantId");

-- CreateIndex
CREATE INDEX "search_favorites_userId_idx" ON "search_favorites"("userId");

-- CreateIndex
CREATE INDEX "search_favorites_entityType_idx" ON "search_favorites"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "search_favorites_userId_entityType_entityId_key" ON "search_favorites"("userId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "search_saved_filters_tenantId_idx" ON "search_saved_filters"("tenantId");

-- CreateIndex
CREATE INDEX "search_saved_filters_userId_idx" ON "search_saved_filters"("userId");

-- CreateIndex
CREATE INDEX "search_saved_filters_name_idx" ON "search_saved_filters"("name");

-- AddForeignKey
ALTER TABLE "search_indexes" ADD CONSTRAINT "search_indexes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "search_indexes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_favorites" ADD CONSTRAINT "search_favorites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_saved_filters" ADD CONSTRAINT "search_saved_filters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
