-- Email Account Migration
-- Etapa 65.2 — Email Sending
-- Date: 2026-07-18

-- 1. Create EmailAccount table
CREATE TABLE "email_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);

-- 2. Create unique constraint for email per tenant
CREATE UNIQUE INDEX "email_accounts_email_tenantId_key" ON "email_accounts"("email", "tenantId");

-- 3. Create indexes
CREATE INDEX "email_accounts_tenantId_idx" ON "email_accounts"("tenantId");
CREATE INDEX "email_accounts_isActive_idx" ON "email_accounts"("isActive");

-- 4. Add foreign key to Tenant
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
