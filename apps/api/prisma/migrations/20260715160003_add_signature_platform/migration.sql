-- CreateTable
CREATE TABLE "signature_requests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "workflow" TEXT NOT NULL DEFAULT 'single',
    "provider" TEXT NOT NULL DEFAULT 'generic',
    "documentId" TEXT,
    "documentHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature_signers" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'signer',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "signedAt" TIMESTAMP(3),
    "ip" TEXT,
    "device" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signature_signers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature_audits" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "signerId" TEXT,
    "ip" TEXT,
    "device" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signature_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workflow" TEXT NOT NULL DEFAULT 'single',
    "signers" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signature_requests_tenantId_idx" ON "signature_requests"("tenantId");

-- CreateIndex
CREATE INDEX "signature_requests_status_idx" ON "signature_requests"("status");

-- CreateIndex
CREATE INDEX "signature_requests_documentId_idx" ON "signature_requests"("documentId");

-- CreateIndex
CREATE INDEX "signature_requests_createdAt_idx" ON "signature_requests"("createdAt");

-- CreateIndex
CREATE INDEX "signature_signers_requestId_idx" ON "signature_signers"("requestId");

-- CreateIndex
CREATE INDEX "signature_signers_email_idx" ON "signature_signers"("email");

-- CreateIndex
CREATE INDEX "signature_audits_requestId_idx" ON "signature_audits"("requestId");

-- CreateIndex
CREATE INDEX "signature_audits_createdAt_idx" ON "signature_audits"("createdAt");

-- CreateIndex
CREATE INDEX "signature_templates_tenantId_idx" ON "signature_templates"("tenantId");

-- CreateIndex
CREATE INDEX "signature_templates_isActive_idx" ON "signature_templates"("isActive");

-- AddForeignKey
ALTER TABLE "signature_requests" ADD CONSTRAINT "signature_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_signers" ADD CONSTRAINT "signature_signers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "signature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_audits" ADD CONSTRAINT "signature_audits_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "signature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature_templates" ADD CONSTRAINT "signature_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
