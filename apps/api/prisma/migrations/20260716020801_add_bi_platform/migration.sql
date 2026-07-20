-- CreateTable
CREATE TABLE "data_pipelines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'etl',
    "status" TEXT NOT NULL DEFAULT 'idle',
    "source" TEXT,
    "target" TEXT,
    "schedule" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "records" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'postgresql',
    "connection" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastSyncAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_metrics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'revenue',
    "formula" TEXT,
    "value" DOUBLE PRECISION,
    "target" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'BRL',
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytical_queries" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "query" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'sql',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "error" TEXT,
    "userId" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytical_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_pipelines_tenantId_idx" ON "data_pipelines"("tenantId");

-- CreateIndex
CREATE INDEX "data_pipelines_status_idx" ON "data_pipelines"("status");

-- CreateIndex
CREATE INDEX "data_sources_tenantId_idx" ON "data_sources"("tenantId");

-- CreateIndex
CREATE INDEX "business_metrics_tenantId_idx" ON "business_metrics"("tenantId");

-- CreateIndex
CREATE INDEX "business_metrics_category_idx" ON "business_metrics"("category");

-- CreateIndex
CREATE INDEX "analytical_queries_tenantId_idx" ON "analytical_queries"("tenantId");

-- CreateIndex
CREATE INDEX "analytical_queries_createdAt_idx" ON "analytical_queries"("createdAt");

-- AddForeignKey
ALTER TABLE "data_pipelines" ADD CONSTRAINT "data_pipelines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
