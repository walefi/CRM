-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "planName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_renewals" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "newPrice" DOUBLE PRECISION,
    "newCycle" TEXT,
    "notes" TEXT,
    "renewedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_health" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "factors" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nps_responses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "survey" TEXT NOT NULL DEFAULT 'nps',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nps_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_plans" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "completedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_idx" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_companyId_idx" ON "subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "subscriptions_nextBillingAt_idx" ON "subscriptions"("nextBillingAt");

-- CreateIndex
CREATE INDEX "subscription_renewals_subscriptionId_idx" ON "subscription_renewals"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_renewals_status_idx" ON "subscription_renewals"("status");

-- CreateIndex
CREATE INDEX "customer_health_tenantId_idx" ON "customer_health"("tenantId");

-- CreateIndex
CREATE INDEX "customer_health_score_idx" ON "customer_health"("score");

-- CreateIndex
CREATE UNIQUE INDEX "customer_health_companyId_key" ON "customer_health"("companyId");

-- CreateIndex
CREATE INDEX "nps_responses_tenantId_idx" ON "nps_responses"("tenantId");

-- CreateIndex
CREATE INDEX "nps_responses_companyId_idx" ON "nps_responses"("companyId");

-- CreateIndex
CREATE INDEX "onboarding_plans_tenantId_idx" ON "onboarding_plans"("tenantId");

-- CreateIndex
CREATE INDEX "onboarding_plans_status_idx" ON "onboarding_plans"("status");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_health" ADD CONSTRAINT "customer_health_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_plans" ADD CONSTRAINT "onboarding_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
