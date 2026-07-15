/*
  Warnings:

  - You are about to drop the `webhooks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "webhooks" DROP CONSTRAINT "webhooks_tenantId_fkey";

-- AlterTable
ALTER TABLE "integrations" ADD COLUMN     "healthScore" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "isConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "syncStatus" TEXT;

-- DropTable
DROP TABLE "webhooks";

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "authType" TEXT NOT NULL DEFAULT 'oauth2',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "metadata" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_webhooks" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "headers" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "lastReceivedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "method" TEXT,
    "url" TEXT,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "error" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_syncs" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "direction" TEXT NOT NULL DEFAULT 'import',
    "recordsTotal" INTEGER NOT NULL DEFAULT 0,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_connections_tenantId_idx" ON "integration_connections"("tenantId");

-- CreateIndex
CREATE INDEX "integration_connections_integrationId_idx" ON "integration_connections"("integrationId");

-- CreateIndex
CREATE INDEX "integration_connections_status_idx" ON "integration_connections"("status");

-- CreateIndex
CREATE INDEX "integration_webhooks_tenantId_idx" ON "integration_webhooks"("tenantId");

-- CreateIndex
CREATE INDEX "integration_webhooks_integrationId_idx" ON "integration_webhooks"("integrationId");

-- CreateIndex
CREATE INDEX "integration_webhooks_isActive_idx" ON "integration_webhooks"("isActive");

-- CreateIndex
CREATE INDEX "integration_logs_tenantId_idx" ON "integration_logs"("tenantId");

-- CreateIndex
CREATE INDEX "integration_logs_integrationId_idx" ON "integration_logs"("integrationId");

-- CreateIndex
CREATE INDEX "integration_logs_level_idx" ON "integration_logs"("level");

-- CreateIndex
CREATE INDEX "integration_logs_createdAt_idx" ON "integration_logs"("createdAt");

-- CreateIndex
CREATE INDEX "integration_syncs_tenantId_idx" ON "integration_syncs"("tenantId");

-- CreateIndex
CREATE INDEX "integration_syncs_integrationId_idx" ON "integration_syncs"("integrationId");

-- CreateIndex
CREATE INDEX "integration_syncs_status_idx" ON "integration_syncs"("status");

-- CreateIndex
CREATE INDEX "integration_syncs_createdAt_idx" ON "integration_syncs"("createdAt");

-- CreateIndex
CREATE INDEX "integrations_provider_idx" ON "integrations"("provider");

-- CreateIndex
CREATE INDEX "integrations_isActive_idx" ON "integrations"("isActive");

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_webhooks" ADD CONSTRAINT "integration_webhooks_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_webhooks" ADD CONSTRAINT "integration_webhooks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_syncs" ADD CONSTRAINT "integration_syncs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_syncs" ADD CONSTRAINT "integration_syncs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
