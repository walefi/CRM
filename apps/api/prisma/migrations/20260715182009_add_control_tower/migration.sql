-- CreateTable
CREATE TABLE "kpi_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'operational',
    "target" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'percent',
    "currentValue" DOUBLE PRECISION,
    "trend" TEXT NOT NULL DEFAULT 'stable',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_alerts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "source" TEXT NOT NULL DEFAULT 'system',
    "status" TEXT NOT NULL DEFAULT 'active',
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'operational',
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'identified',
    "mitigation" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_scenarios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'what_if',
    "description" TEXT,
    "assumptions" JSONB NOT NULL DEFAULT '{}',
    "results" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planning_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_definitions_tenantId_idx" ON "kpi_definitions"("tenantId");

-- CreateIndex
CREATE INDEX "kpi_definitions_category_idx" ON "kpi_definitions"("category");

-- CreateIndex
CREATE INDEX "operational_alerts_tenantId_idx" ON "operational_alerts"("tenantId");

-- CreateIndex
CREATE INDEX "operational_alerts_severity_idx" ON "operational_alerts"("severity");

-- CreateIndex
CREATE INDEX "operational_alerts_status_idx" ON "operational_alerts"("status");

-- CreateIndex
CREATE INDEX "risk_events_tenantId_idx" ON "risk_events"("tenantId");

-- CreateIndex
CREATE INDEX "risk_events_severity_idx" ON "risk_events"("severity");

-- CreateIndex
CREATE INDEX "risk_events_status_idx" ON "risk_events"("status");

-- CreateIndex
CREATE INDEX "planning_scenarios_tenantId_idx" ON "planning_scenarios"("tenantId");

-- CreateIndex
CREATE INDEX "planning_scenarios_type_idx" ON "planning_scenarios"("type");

-- AddForeignKey
ALTER TABLE "kpi_definitions" ADD CONSTRAINT "kpi_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_scenarios" ADD CONSTRAINT "planning_scenarios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
