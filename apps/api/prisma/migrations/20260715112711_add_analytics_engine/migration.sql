-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('COUNT', 'SUM', 'AVERAGE', 'MEDIAN', 'MAX', 'MIN', 'PERCENTAGE', 'RATE', 'DURATION', 'FUNNEL', 'RANKING', 'TREND');

-- CreateEnum
CREATE TYPE "DashboardCategory" AS ENUM ('COMMERCIAL', 'FINANCE', 'MARKETING', 'SUPPORT', 'OPERATIONS', 'EXECUTIVE', 'ADMIN', 'USER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WidgetType" ADD VALUE 'KPI_CARD';
ALTER TYPE "WidgetType" ADD VALUE 'LINE_CHART';
ALTER TYPE "WidgetType" ADD VALUE 'BAR_CHART';
ALTER TYPE "WidgetType" ADD VALUE 'PIE_CHART';
ALTER TYPE "WidgetType" ADD VALUE 'DONUT_CHART';
ALTER TYPE "WidgetType" ADD VALUE 'AREA_CHART';
ALTER TYPE "WidgetType" ADD VALUE 'RADAR_CHART';
ALTER TYPE "WidgetType" ADD VALUE 'FUNNEL_CHART';
ALTER TYPE "WidgetType" ADD VALUE 'HEATMAP';
ALTER TYPE "WidgetType" ADD VALUE 'GAUGE';
ALTER TYPE "WidgetType" ADD VALUE 'TIMELINE';
ALTER TYPE "WidgetType" ADD VALUE 'RANKING';

-- AlterTable
ALTER TABLE "dashboards" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'USER',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "widgets" ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "refreshInterval" INTEGER,
ADD COLUMN     "tenantId" TEXT;

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "metricName" TEXT NOT NULL,
    "entityType" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "previousValue" DOUBLE PRECISION,
    "changePercent" DOUBLE PRECISION,
    "trend" JSONB,
    "period" TEXT NOT NULL DEFAULT 'daily',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'USER',
    "config" JSONB NOT NULL DEFAULT '{}',
    "widgets" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_events_tenantId_idx" ON "analytics_events"("tenantId");

-- CreateIndex
CREATE INDEX "analytics_events_eventName_idx" ON "analytics_events"("eventName");

-- CreateIndex
CREATE INDEX "analytics_events_entityType_idx" ON "analytics_events"("entityType");

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");

-- CreateIndex
CREATE INDEX "metric_snapshots_tenantId_idx" ON "metric_snapshots"("tenantId");

-- CreateIndex
CREATE INDEX "metric_snapshots_metricKey_idx" ON "metric_snapshots"("metricKey");

-- CreateIndex
CREATE INDEX "metric_snapshots_period_idx" ON "metric_snapshots"("period");

-- CreateIndex
CREATE INDEX "metric_snapshots_periodStart_idx" ON "metric_snapshots"("periodStart");

-- CreateIndex
CREATE INDEX "metric_snapshots_createdAt_idx" ON "metric_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "dashboard_templates_tenantId_idx" ON "dashboard_templates"("tenantId");

-- CreateIndex
CREATE INDEX "dashboard_templates_category_idx" ON "dashboard_templates"("category");

-- CreateIndex
CREATE INDEX "dashboards_category_idx" ON "dashboards"("category");

-- CreateIndex
CREATE INDEX "dashboards_isDefault_idx" ON "dashboards"("isDefault");

-- CreateIndex
CREATE INDEX "widgets_tenantId_idx" ON "widgets"("tenantId");

-- AddForeignKey
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_templates" ADD CONSTRAINT "dashboard_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
