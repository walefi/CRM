-- CreateTable
CREATE TABLE "ci_cd_pipelines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "status" TEXT NOT NULL DEFAULT 'idle',
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "durationMs" INTEGER,
    "stages" JSONB NOT NULL DEFAULT '[]',
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ci_cd_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'development',
    "version" TEXT NOT NULL DEFAULT 'latest',
    "strategy" TEXT NOT NULL DEFAULT 'rolling',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deployedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "pipelineId" TEXT,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "rules" JSONB NOT NULL DEFAULT '[]',
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_quality_reports" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT,
    "coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lintErrors" INTEGER NOT NULL DEFAULT 0,
    "duplicates" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complexity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pass',
    "report" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_quality_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ci_cd_pipelines_tenantId_idx" ON "ci_cd_pipelines"("tenantId");

-- CreateIndex
CREATE INDEX "ci_cd_pipelines_status_idx" ON "ci_cd_pipelines"("status");

-- CreateIndex
CREATE INDEX "deployments_tenantId_idx" ON "deployments"("tenantId");

-- CreateIndex
CREATE INDEX "deployments_environment_idx" ON "deployments"("environment");

-- CreateIndex
CREATE INDEX "deployments_status_idx" ON "deployments"("status");

-- CreateIndex
CREATE INDEX "feature_flags_tenantId_idx" ON "feature_flags"("tenantId");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");

-- CreateIndex
CREATE INDEX "code_quality_reports_tenantId_idx" ON "code_quality_reports"("tenantId");

-- CreateIndex
CREATE INDEX "code_quality_reports_pipelineId_idx" ON "code_quality_reports"("pipelineId");

-- AddForeignKey
ALTER TABLE "ci_cd_pipelines" ADD CONSTRAINT "ci_cd_pipelines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
