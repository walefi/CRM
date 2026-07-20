-- CreateTable
CREATE TABLE "observability_metrics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ms',
    "tags" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observability_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observability_logs" (
    "id" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT 'api',
    "traceId" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observability_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "latencyMs" INTEGER,
    "dependencies" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'gt',
    "threshold" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "channels" TEXT[],
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "observability_metrics_tenantId_idx" ON "observability_metrics"("tenantId");

-- CreateIndex
CREATE INDEX "observability_metrics_name_idx" ON "observability_metrics"("name");

-- CreateIndex
CREATE INDEX "observability_metrics_timestamp_idx" ON "observability_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "observability_logs_tenantId_idx" ON "observability_logs"("tenantId");

-- CreateIndex
CREATE INDEX "observability_logs_severity_idx" ON "observability_logs"("severity");

-- CreateIndex
CREATE INDEX "observability_logs_timestamp_idx" ON "observability_logs"("timestamp");

-- CreateIndex
CREATE INDEX "observability_logs_traceId_idx" ON "observability_logs"("traceId");

-- CreateIndex
CREATE INDEX "health_checks_tenantId_idx" ON "health_checks"("tenantId");

-- CreateIndex
CREATE INDEX "health_checks_service_idx" ON "health_checks"("service");

-- CreateIndex
CREATE INDEX "health_checks_status_idx" ON "health_checks"("status");

-- CreateIndex
CREATE INDEX "alert_rules_tenantId_idx" ON "alert_rules"("tenantId");

-- CreateIndex
CREATE INDEX "alert_rules_isActive_idx" ON "alert_rules"("isActive");

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
