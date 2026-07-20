-- CreateTable
CREATE TABLE "non_conformities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "source" TEXT NOT NULL DEFAULT 'inspection',
    "status" TEXT NOT NULL DEFAULT 'open',
    "productId" TEXT,
    "orderId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "non_conformities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capas" (
    "id" TEXT NOT NULL,
    "nonConformityId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'corrective',
    "rootCause" TEXT,
    "actionPlan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedToId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_audits" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'internal',
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "plannedDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "findings" JSONB NOT NULL DEFAULT '[]',
    "report" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "non_conformities_tenantId_idx" ON "non_conformities"("tenantId");

-- CreateIndex
CREATE INDEX "non_conformities_status_idx" ON "non_conformities"("status");

-- CreateIndex
CREATE INDEX "non_conformities_severity_idx" ON "non_conformities"("severity");

-- CreateIndex
CREATE INDEX "capas_tenantId_idx" ON "capas"("tenantId");

-- CreateIndex
CREATE INDEX "capas_status_idx" ON "capas"("status");

-- CreateIndex
CREATE INDEX "capas_type_idx" ON "capas"("type");

-- CreateIndex
CREATE INDEX "quality_audits_tenantId_idx" ON "quality_audits"("tenantId");

-- CreateIndex
CREATE INDEX "quality_audits_status_idx" ON "quality_audits"("status");

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capas" ADD CONSTRAINT "capas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_audits" ADD CONSTRAINT "quality_audits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
