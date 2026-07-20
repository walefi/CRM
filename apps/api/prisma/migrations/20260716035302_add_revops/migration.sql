-- CreateTable
CREATE TABLE "commission_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'revenue_based',
    "rule" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target" DOUBLE PRECISION,
    "bonusRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_forecasts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "target" DOUBLE PRECISION NOT NULL,
    "pipeline" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weighted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "type" TEXT NOT NULL DEFAULT 'geographic',
    "assigneeId" TEXT,
    "teamId" TEXT,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_plans_tenantId_idx" ON "commission_plans"("tenantId");

-- CreateIndex
CREATE INDEX "sales_forecasts_tenantId_idx" ON "sales_forecasts"("tenantId");

-- CreateIndex
CREATE INDEX "sales_forecasts_period_idx" ON "sales_forecasts"("period");

-- CreateIndex
CREATE INDEX "territories_tenantId_idx" ON "territories"("tenantId");

-- AddForeignKey
ALTER TABLE "commission_plans" ADD CONSTRAINT "commission_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_forecasts" ADD CONSTRAINT "sales_forecasts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
