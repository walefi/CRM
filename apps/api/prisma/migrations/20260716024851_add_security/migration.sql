-- CreateTable
CREATE TABLE "security_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'access',
    "description" TEXT,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secrets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'api_key',
    "category" TEXT NOT NULL DEFAULT 'general',
    "expiresAt" TIMESTAMP(3),
    "lastRotatedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "type" TEXT NOT NULL DEFAULT 'access_attempt',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'investigating',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_audits" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'internal',
    "regulation" TEXT NOT NULL DEFAULT 'LGPD',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "findings" JSONB NOT NULL DEFAULT '[]',
    "report" TEXT,
    "completedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'data_processing',
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "purpose" TEXT,
    "expiresAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_policies_tenantId_idx" ON "security_policies"("tenantId");

-- CreateIndex
CREATE INDEX "security_policies_type_idx" ON "security_policies"("type");

-- CreateIndex
CREATE INDEX "secrets_tenantId_idx" ON "secrets"("tenantId");

-- CreateIndex
CREATE INDEX "secrets_type_idx" ON "secrets"("type");

-- CreateIndex
CREATE INDEX "security_incidents_tenantId_idx" ON "security_incidents"("tenantId");

-- CreateIndex
CREATE INDEX "security_incidents_severity_idx" ON "security_incidents"("severity");

-- CreateIndex
CREATE INDEX "security_incidents_status_idx" ON "security_incidents"("status");

-- CreateIndex
CREATE INDEX "compliance_audits_tenantId_idx" ON "compliance_audits"("tenantId");

-- CreateIndex
CREATE INDEX "compliance_audits_regulation_idx" ON "compliance_audits"("regulation");

-- CreateIndex
CREATE INDEX "consents_tenantId_idx" ON "consents"("tenantId");

-- CreateIndex
CREATE INDEX "consents_userId_idx" ON "consents"("userId");

-- AddForeignKey
ALTER TABLE "security_policies" ADD CONSTRAINT "security_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_audits" ADD CONSTRAINT "compliance_audits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
