/*
  Warnings:

  - You are about to drop the column `notes` on the `contracts` table. All the data in the column will be lost.
  - The `status` column on the `contracts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `notes` on the `quotes` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'PUBLISHED', 'ERROR');

-- CreateEnum
CREATE TYPE "WorkflowNodeType" AS ENUM ('TRIGGER', 'CONDITION', 'DELAY', 'IF', 'ELSE', 'LOOP', 'SWITCH', 'WAIT', 'WEBHOOK', 'EMAIL', 'WHATSAPP', 'SMS', 'PUSH', 'SLACK', 'TEAMS', 'DISCORD', 'TELEGRAM', 'HTTP_REQUEST', 'DATABASE', 'SCRIPT', 'AI', 'END');

-- CreateEnum
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'RETRYING', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'AWAITING_SIGNATURE', 'SIGNED', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'TERMINATED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('SERVICE', 'SALE', 'RENTAL', 'LICENSING', 'SUBSCRIPTION', 'MAINTENANCE', 'SUPPORT', 'SLA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SignerStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'REFUSED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActionType" ADD VALUE 'CREATE_LEAD';
ALTER TYPE "ActionType" ADD VALUE 'CREATE_CONTACT';
ALTER TYPE "ActionType" ADD VALUE 'CREATE_COMPANY';
ALTER TYPE "ActionType" ADD VALUE 'CREATE_DEAL';
ALTER TYPE "ActionType" ADD VALUE 'CREATE_ACTIVITY';
ALTER TYPE "ActionType" ADD VALUE 'SEND_WHATSAPP';
ALTER TYPE "ActionType" ADD VALUE 'SEND_PUSH';
ALTER TYPE "ActionType" ADD VALUE 'CREATE_DOCUMENT';
ALTER TYPE "ActionType" ADD VALUE 'UPDATE_FIELDS';
ALTER TYPE "ActionType" ADD VALUE 'EXECUTE_AI';
ALTER TYPE "ActionType" ADD VALUE 'EXECUTE_API';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TriggerType" ADD VALUE 'COMPANY_CREATED';
ALTER TYPE "TriggerType" ADD VALUE 'CONTRACT_SIGNED';
ALTER TYPE "TriggerType" ADD VALUE 'DOCUMENT_SENT';
ALTER TYPE "TriggerType" ADD VALUE 'ACTIVITY_CREATED';
ALTER TYPE "TriggerType" ADD VALUE 'USER_CREATED';
ALTER TYPE "TriggerType" ADD VALUE 'LOGIN';
ALTER TYPE "TriggerType" ADD VALUE 'CRON';
ALTER TYPE "TriggerType" ADD VALUE 'MANUAL';
ALTER TYPE "TriggerType" ADD VALUE 'API';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WebhookEvent" ADD VALUE 'COMPANY_CREATED';
ALTER TYPE "WebhookEvent" ADD VALUE 'CONTRACT_SIGNED';

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "contractId" TEXT;

-- AlterTable
ALTER TABLE "contracts" DROP COLUMN "notes",
ADD COLUMN     "autoRenewal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "currency" "DealCurrency" NOT NULL DEFAULT 'BRL',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "object" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "publicNotes" TEXT,
ADD COLUMN     "quoteId" TEXT,
ADD COLUMN     "renewalDate" TIMESTAMP(3),
ADD COLUMN     "renewalNoticeDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "terminatedAt" TIMESTAMP(3),
ADD COLUMN     "type" "ContractType" NOT NULL DEFAULT 'SERVICE',
DROP COLUMN "status",
ADD COLUMN     "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "quotes" DROP COLUMN "notes";

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "reason" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_signers" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "status" "SignerStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "signedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_signers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "config" JSONB,
    "tags" TEXT[],
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateCategory" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "reason" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL,
    "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "trigger" TEXT,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "nodeResults" JSONB,
    "correlationId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "workflowId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_store" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT,
    "aggregateType" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "correlationId" TEXT,
    "causationId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "origin" TEXT,
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_outbox" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "publisherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letters" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "lastRetryAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedById" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dead_letters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_versions_contractId_idx" ON "contract_versions"("contractId");

-- CreateIndex
CREATE INDEX "contract_versions_version_idx" ON "contract_versions"("version");

-- CreateIndex
CREATE INDEX "contract_versions_tenantId_idx" ON "contract_versions"("tenantId");

-- CreateIndex
CREATE INDEX "contract_signers_contractId_idx" ON "contract_signers"("contractId");

-- CreateIndex
CREATE INDEX "contract_signers_status_idx" ON "contract_signers"("status");

-- CreateIndex
CREATE INDEX "contract_signers_email_idx" ON "contract_signers"("email");

-- CreateIndex
CREATE INDEX "workflows_tenantId_idx" ON "workflows"("tenantId");

-- CreateIndex
CREATE INDEX "workflows_status_idx" ON "workflows"("status");

-- CreateIndex
CREATE INDEX "workflows_isTemplate_idx" ON "workflows"("isTemplate");

-- CreateIndex
CREATE INDEX "workflows_deletedAt_idx" ON "workflows"("deletedAt");

-- CreateIndex
CREATE INDEX "workflow_versions_workflowId_idx" ON "workflow_versions"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_versions_version_idx" ON "workflow_versions"("version");

-- CreateIndex
CREATE INDEX "workflow_versions_tenantId_idx" ON "workflow_versions"("tenantId");

-- CreateIndex
CREATE INDEX "workflow_executions_workflowId_idx" ON "workflow_executions"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_executions_tenantId_idx" ON "workflow_executions"("tenantId");

-- CreateIndex
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions"("status");

-- CreateIndex
CREATE INDEX "workflow_executions_correlationId_idx" ON "workflow_executions"("correlationId");

-- CreateIndex
CREATE INDEX "workflow_executions_createdAt_idx" ON "workflow_executions"("createdAt");

-- CreateIndex
CREATE INDEX "event_store_tenantId_idx" ON "event_store"("tenantId");

-- CreateIndex
CREATE INDEX "event_store_eventName_idx" ON "event_store"("eventName");

-- CreateIndex
CREATE INDEX "event_store_status_idx" ON "event_store"("status");

-- CreateIndex
CREATE INDEX "event_store_correlationId_idx" ON "event_store"("correlationId");

-- CreateIndex
CREATE INDEX "event_store_aggregateType_aggregateId_idx" ON "event_store"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "event_store_createdAt_idx" ON "event_store"("createdAt");

-- CreateIndex
CREATE INDEX "event_outbox_eventId_idx" ON "event_outbox"("eventId");

-- CreateIndex
CREATE INDEX "event_outbox_status_idx" ON "event_outbox"("status");

-- CreateIndex
CREATE INDEX "event_outbox_createdAt_idx" ON "event_outbox"("createdAt");

-- CreateIndex
CREATE INDEX "dead_letters_tenantId_idx" ON "dead_letters"("tenantId");

-- CreateIndex
CREATE INDEX "dead_letters_eventId_idx" ON "dead_letters"("eventId");

-- CreateIndex
CREATE INDEX "dead_letters_resolvedAt_idx" ON "dead_letters"("resolvedAt");

-- CreateIndex
CREATE INDEX "dead_letters_createdAt_idx" ON "dead_letters"("createdAt");

-- CreateIndex
CREATE INDEX "activities_contractId_idx" ON "activities"("contractId");

-- CreateIndex
CREATE INDEX "contracts_number_idx" ON "contracts"("number");

-- CreateIndex
CREATE INDEX "contracts_companyId_idx" ON "contracts"("companyId");

-- CreateIndex
CREATE INDEX "contracts_contactId_idx" ON "contracts"("contactId");

-- CreateIndex
CREATE INDEX "contracts_quoteId_idx" ON "contracts"("quoteId");

-- CreateIndex
CREATE INDEX "contracts_ownerId_idx" ON "contracts"("ownerId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_type_idx" ON "contracts"("type");

-- CreateIndex
CREATE INDEX "contracts_endDate_idx" ON "contracts"("endDate");

-- CreateIndex
CREATE INDEX "contracts_renewalDate_idx" ON "contracts"("renewalDate");

-- CreateIndex
CREATE INDEX "contracts_deletedAt_idx" ON "contracts"("deletedAt");

-- CreateIndex
CREATE INDEX "quotes_customerId_idx" ON "quotes"("customerId");

-- CreateIndex
CREATE INDEX "quotes_ownerId_idx" ON "quotes"("ownerId");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_deletedAt_idx" ON "quotes"("deletedAt");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signers" ADD CONSTRAINT "contract_signers_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_store" ADD CONSTRAINT "event_store_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letters" ADD CONSTRAINT "dead_letters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
