-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "description" TEXT,
ADD COLUMN     "filters" JSONB,
ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'pdf',
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parameters" JSONB,
ADD COLUMN     "sections" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "report_executions" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "format" TEXT NOT NULL,
    "filters" JSONB,
    "parameters" JSONB,
    "outputUrl" TEXT,
    "error" TEXT,
    "durationMs" INTEGER,
    "fileSize" INTEGER,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "cronExpression" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "recipients" TEXT[],
    "channels" TEXT[],
    "filters" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB,
    "preview" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_exports" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "outputUrl" TEXT,
    "fileData" TEXT,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_executions_tenantId_idx" ON "report_executions"("tenantId");

-- CreateIndex
CREATE INDEX "report_executions_reportId_idx" ON "report_executions"("reportId");

-- CreateIndex
CREATE INDEX "report_executions_status_idx" ON "report_executions"("status");

-- CreateIndex
CREATE INDEX "report_executions_createdAt_idx" ON "report_executions"("createdAt");

-- CreateIndex
CREATE INDEX "report_schedules_tenantId_idx" ON "report_schedules"("tenantId");

-- CreateIndex
CREATE INDEX "report_schedules_reportId_idx" ON "report_schedules"("reportId");

-- CreateIndex
CREATE INDEX "report_schedules_nextRunAt_idx" ON "report_schedules"("nextRunAt");

-- CreateIndex
CREATE INDEX "report_templates_tenantId_idx" ON "report_templates"("tenantId");

-- CreateIndex
CREATE INDEX "report_templates_category_idx" ON "report_templates"("category");

-- CreateIndex
CREATE INDEX "report_templates_type_idx" ON "report_templates"("type");

-- CreateIndex
CREATE INDEX "report_exports_tenantId_idx" ON "report_exports"("tenantId");

-- CreateIndex
CREATE INDEX "report_exports_executionId_idx" ON "report_exports"("executionId");

-- CreateIndex
CREATE INDEX "report_exports_status_idx" ON "report_exports"("status");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "reports"("type");

-- CreateIndex
CREATE INDEX "reports_isTemplate_idx" ON "reports"("isTemplate");

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
