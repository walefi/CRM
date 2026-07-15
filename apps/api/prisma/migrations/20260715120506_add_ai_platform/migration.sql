-- AlterTable
ALTER TABLE "ai_conversations" ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'openai',
ADD COLUMN     "systemPrompt" TEXT,
ADD COLUMN     "tokens" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ai_prompts" ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ai_tasks" ADD COLUMN     "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'openai',
ADD COLUMN     "tokens" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ai_memories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'short_term',
    "ttl" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "systemPrompt" TEXT NOT NULL,
    "tools" TEXT[],
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_embeddings" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_memories_tenantId_idx" ON "ai_memories"("tenantId");

-- CreateIndex
CREATE INDEX "ai_memories_userId_idx" ON "ai_memories"("userId");

-- CreateIndex
CREATE INDEX "ai_memories_type_idx" ON "ai_memories"("type");

-- CreateIndex
CREATE INDEX "ai_memories_expiresAt_idx" ON "ai_memories"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_memories_key_tenantId_key" ON "ai_memories"("key", "tenantId");

-- CreateIndex
CREATE INDEX "ai_agents_tenantId_idx" ON "ai_agents"("tenantId");

-- CreateIndex
CREATE INDEX "ai_agents_type_idx" ON "ai_agents"("type");

-- CreateIndex
CREATE INDEX "ai_agents_isActive_idx" ON "ai_agents"("isActive");

-- CreateIndex
CREATE INDEX "ai_embeddings_tenantId_idx" ON "ai_embeddings"("tenantId");

-- CreateIndex
CREATE INDEX "ai_embeddings_entityType_idx" ON "ai_embeddings"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "ai_embeddings_entityType_entityId_key" ON "ai_embeddings"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ai_usage_tenantId_idx" ON "ai_usage"("tenantId");

-- CreateIndex
CREATE INDEX "ai_usage_model_idx" ON "ai_usage"("model");

-- CreateIndex
CREATE INDEX "ai_usage_createdAt_idx" ON "ai_usage"("createdAt");

-- CreateIndex
CREATE INDEX "ai_conversations_provider_idx" ON "ai_conversations"("provider");

-- CreateIndex
CREATE INDEX "ai_conversations_createdAt_idx" ON "ai_conversations"("createdAt");

-- CreateIndex
CREATE INDEX "ai_prompts_isActive_idx" ON "ai_prompts"("isActive");

-- CreateIndex
CREATE INDEX "ai_tasks_createdAt_idx" ON "ai_tasks"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_memories" ADD CONSTRAINT "ai_memories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_embeddings" ADD CONSTRAINT "ai_embeddings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
