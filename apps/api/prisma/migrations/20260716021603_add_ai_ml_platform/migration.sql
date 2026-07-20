-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'classification',
    "framework" TEXT NOT NULL DEFAULT 'pytorch',
    "status" TEXT NOT NULL DEFAULT 'development',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "accuracy" DOUBLE PRECISION,
    "f1Score" DOUBLE PRECISION,
    "deployedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_features" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'numeric',
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'numeric',
    "description" TEXT,
    "values" JSONB,
    "freshness" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inference_requests" (
    "id" TEXT NOT NULL,
    "modelId" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "confidence" DOUBLE PRECISION,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inference_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "modelId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "label" TEXT,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_models_tenantId_idx" ON "ai_models"("tenantId");

-- CreateIndex
CREATE INDEX "ai_models_type_idx" ON "ai_models"("type");

-- CreateIndex
CREATE INDEX "ai_models_status_idx" ON "ai_models"("status");

-- CreateIndex
CREATE INDEX "model_features_modelId_idx" ON "model_features"("modelId");

-- CreateIndex
CREATE INDEX "feature_stores_tenantId_idx" ON "feature_stores"("tenantId");

-- CreateIndex
CREATE INDEX "feature_stores_groupName_idx" ON "feature_stores"("groupName");

-- CreateIndex
CREATE UNIQUE INDEX "feature_stores_name_tenantId_key" ON "feature_stores"("name", "tenantId");

-- CreateIndex
CREATE INDEX "inference_requests_tenantId_idx" ON "inference_requests"("tenantId");

-- CreateIndex
CREATE INDEX "inference_requests_modelId_idx" ON "inference_requests"("modelId");

-- CreateIndex
CREATE INDEX "inference_requests_createdAt_idx" ON "inference_requests"("createdAt");

-- CreateIndex
CREATE INDEX "predictions_tenantId_idx" ON "predictions"("tenantId");

-- CreateIndex
CREATE INDEX "predictions_entityType_entityId_idx" ON "predictions"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "predictions_createdAt_idx" ON "predictions"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_features" ADD CONSTRAINT "model_features_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_stores" ADD CONSTRAINT "feature_stores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
