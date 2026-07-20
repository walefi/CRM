-- CreateTable
CREATE TABLE "sla_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "firstResponse" INTEGER NOT NULL DEFAULT 300,
    "resolution" INTEGER NOT NULL DEFAULT 3600,
    "escalationAfter" INTEGER NOT NULL DEFAULT 600,
    "escalationLevel" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_ratings" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_journeys" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'awareness',
    "status" TEXT NOT NULL DEFAULT 'active',
    "touchpoints" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "skills" TEXT[],
    "maxConcurrent" INTEGER NOT NULL DEFAULT 5,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sla_policies_tenantId_idx" ON "sla_policies"("tenantId");

-- CreateIndex
CREATE INDEX "conversation_ratings_conversationId_idx" ON "conversation_ratings"("conversationId");

-- CreateIndex
CREATE INDEX "customer_journeys_tenantId_idx" ON "customer_journeys"("tenantId");

-- CreateIndex
CREATE INDEX "customer_journeys_contactId_idx" ON "customer_journeys"("contactId");

-- CreateIndex
CREATE INDEX "agents_tenantId_idx" ON "agents"("tenantId");

-- CreateIndex
CREATE INDEX "agents_status_idx" ON "agents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "agents_userId_tenantId_key" ON "agents"("userId", "tenantId");

-- AddForeignKey
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_journeys" ADD CONSTRAINT "customer_journeys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
