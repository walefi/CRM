/*
  Warnings:

  - The `operator` column on the `conditions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `tenantId` to the `automation_executions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `automation_executions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CRON', 'INTERVAL', 'AFTER_EVENT');

-- CreateEnum
CREATE TYPE "AutomationLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR', 'DEBUG', 'TRACE');

-- CreateEnum
CREATE TYPE "ConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_OR_EQUAL', 'LESS_OR_EQUAL', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'IS_EMPTY', 'IS_NOT_EMPTY', 'IN', 'NOT_IN', 'BETWEEN', 'REGEX', 'BEFORE', 'AFTER', 'IS_TRUE', 'IS_FALSE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActionType" ADD VALUE 'CREATE_PRODUCT';
ALTER TYPE "ActionType" ADD VALUE 'SEND_SMS';
ALTER TYPE "ActionType" ADD VALUE 'EXECUTE_WORKFLOW';
ALTER TYPE "ActionType" ADD VALUE 'CREATE_TIMELINE';
ALTER TYPE "ActionType" ADD VALUE 'CREATE_AUDIT';
ALTER TYPE "ActionType" ADD VALUE 'CREATE_COMMENT';
ALTER TYPE "ActionType" ADD VALUE 'CREATE_TAG';
ALTER TYPE "ActionType" ADD VALUE 'ADD_FILE';
ALTER TYPE "ActionType" ADD VALUE 'EXECUTE_SCRIPT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutomationStatus" ADD VALUE 'PAUSED';
ALTER TYPE "AutomationStatus" ADD VALUE 'RUNNING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TriggerType" ADD VALUE 'LEAD_UPDATED';
ALTER TYPE "TriggerType" ADD VALUE 'DEAL_WON';
ALTER TYPE "TriggerType" ADD VALUE 'DEAL_LOST';
ALTER TYPE "TriggerType" ADD VALUE 'PRODUCT_CREATED';
ALTER TYPE "TriggerType" ADD VALUE 'CONTRACT_CREATED';
ALTER TYPE "TriggerType" ADD VALUE 'CONTRACT_EXPIRING';
ALTER TYPE "TriggerType" ADD VALUE 'CONTRACT_RENEWED';
ALTER TYPE "TriggerType" ADD VALUE 'QUOTE_SENT';
ALTER TYPE "TriggerType" ADD VALUE 'QUOTE_ACCEPTED';
ALTER TYPE "TriggerType" ADD VALUE 'DOCUMENT_SHARED';
ALTER TYPE "TriggerType" ADD VALUE 'ACTIVITY_COMPLETED';
ALTER TYPE "TriggerType" ADD VALUE 'NOTIFICATION_SENT';
ALTER TYPE "TriggerType" ADD VALUE 'WORKFLOW_COMPLETED';
ALTER TYPE "TriggerType" ADD VALUE 'LOGOUT';
ALTER TYPE "TriggerType" ADD VALUE 'WEBHOOK_RECEIVED';
ALTER TYPE "TriggerType" ADD VALUE 'API_CALLED';
ALTER TYPE "TriggerType" ADD VALUE 'CUSTOM_EVENT';

-- AlterTable
ALTER TABLE "actions" ADD COLUMN     "delay" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "automation_executions" ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "input" JSONB,
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "trigger" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "workflowId" TEXT;

-- AlterTable
ALTER TABLE "automations" ADD COLUMN     "cooldown" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "runCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "conditions" ADD COLUMN     "groupId" TEXT,
DROP COLUMN "operator",
ADD COLUMN     "operator" "ConditionOperator" NOT NULL DEFAULT 'EQUALS';

-- AlterTable
ALTER TABLE "triggers" ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "automation_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL DEFAULT 'ONCE',
    "cronExpression" TEXT,
    "interval" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "automationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "level" "AutomationLogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "details" JSONB,
    "automationId" TEXT NOT NULL,
    "executionId" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_variables" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "automationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "icon" TEXT,
    "config" JSONB NOT NULL,
    "triggers" JSONB NOT NULL DEFAULT '[]',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "schedules" JSONB NOT NULL DEFAULT '[]',
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_schedules_automationId_idx" ON "automation_schedules"("automationId");

-- CreateIndex
CREATE INDEX "automation_schedules_tenantId_idx" ON "automation_schedules"("tenantId");

-- CreateIndex
CREATE INDEX "automation_schedules_nextRunAt_idx" ON "automation_schedules"("nextRunAt");

-- CreateIndex
CREATE INDEX "automation_logs_automationId_idx" ON "automation_logs"("automationId");

-- CreateIndex
CREATE INDEX "automation_logs_tenantId_idx" ON "automation_logs"("tenantId");

-- CreateIndex
CREATE INDEX "automation_logs_level_idx" ON "automation_logs"("level");

-- CreateIndex
CREATE INDEX "automation_logs_createdAt_idx" ON "automation_logs"("createdAt");

-- CreateIndex
CREATE INDEX "automation_variables_automationId_idx" ON "automation_variables"("automationId");

-- CreateIndex
CREATE INDEX "automation_variables_tenantId_idx" ON "automation_variables"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "automation_variables_key_automationId_key" ON "automation_variables"("key", "automationId");

-- CreateIndex
CREATE INDEX "automation_templates_tenantId_idx" ON "automation_templates"("tenantId");

-- CreateIndex
CREATE INDEX "automation_templates_category_idx" ON "automation_templates"("category");

-- CreateIndex
CREATE UNIQUE INDEX "automation_templates_name_tenantId_key" ON "automation_templates"("name", "tenantId");

-- CreateIndex
CREATE INDEX "automation_executions_tenantId_idx" ON "automation_executions"("tenantId");

-- CreateIndex
CREATE INDEX "automation_executions_correlationId_idx" ON "automation_executions"("correlationId");

-- CreateIndex
CREATE INDEX "automation_executions_createdAt_idx" ON "automation_executions"("createdAt");

-- CreateIndex
CREATE INDEX "automations_deletedAt_idx" ON "automations"("deletedAt");

-- CreateIndex
CREATE INDEX "triggers_type_idx" ON "triggers"("type");

-- AddForeignKey
ALTER TABLE "automation_schedules" ADD CONSTRAINT "automation_schedules_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_schedules" ADD CONSTRAINT "automation_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_variables" ADD CONSTRAINT "automation_variables_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_variables" ADD CONSTRAINT "automation_variables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_templates" ADD CONSTRAINT "automation_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
