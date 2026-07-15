-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'SENT', 'VIEWED', 'NEGOTIATION', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'ARCHIVED');

-- AlterTable: quotes — add new columns, drop old ones
ALTER TABLE "quotes" ADD COLUMN "title" TEXT;
ALTER TABLE "quotes" ADD COLUMN "description" TEXT;
ALTER TABLE "quotes" ADD COLUMN "currency" "DealCurrency" NOT NULL DEFAULT 'BRL';
ALTER TABLE "quotes" ADD COLUMN "subtotal" DECIMAL(15,2);
ALTER TABLE "quotes" ADD COLUMN "discount" DECIMAL(15,2);
ALTER TABLE "quotes" ADD COLUMN "discountPercent" DECIMAL(5,2);
ALTER TABLE "quotes" ADD COLUMN "taxes" DECIMAL(15,2);
ALTER TABLE "quotes" ADD COLUMN "shipping" DECIMAL(15,2);
ALTER TABLE "quotes" ADD COLUMN "margin" DECIMAL(5,2);
ALTER TABLE "quotes" ADD COLUMN "paymentTerms" TEXT;
ALTER TABLE "quotes" ADD COLUMN "commercialConditions" TEXT;
ALTER TABLE "quotes" ADD COLUMN "internalNotes" TEXT;
ALTER TABLE "quotes" ADD COLUMN "customerNotes" TEXT;
ALTER TABLE "quotes" ADD COLUMN "issuedAt" TIMESTAMP(3);
ALTER TABLE "quotes" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quotes" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "quotes" ADD COLUMN "tags" TEXT[];
ALTER TABLE "quotes" ADD COLUMN "metadata" JSONB;
ALTER TABLE "quotes" ADD COLUMN "companyId" TEXT;
ALTER TABLE "quotes" ADD COLUMN "contactId" TEXT;
ALTER TABLE "quotes" ADD COLUMN "teamId" TEXT;
ALTER TABLE "quotes" ADD COLUMN "createdBy" TEXT;

-- Update status column to use QuoteStatus type
ALTER TABLE "quotes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "quotes" ALTER COLUMN "status" TYPE "QuoteStatus" USING status::"QuoteStatus";
ALTER TABLE "quotes" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Drop old productId foreign key and column
ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_productId_fkey";
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "productId";

-- Add foreign keys
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "quotes_number_idx" ON "quotes"("number");
CREATE INDEX "quotes_companyId_idx" ON "quotes"("companyId");
CREATE INDEX "quotes_contactId_idx" ON "quotes"("contactId");
CREATE INDEX "quotes_validUntil_idx" ON "quotes"("validUntil");

-- Drop existing unused indexes if they exist
DROP INDEX IF EXISTS "quotes_customerId_idx";

-- CreateTable: quote_items
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'product',
    "quantity" DECIMAL(15,3),
    "unitPrice" DECIMAL(15,2),
    "costPrice" DECIMAL(15,2),
    "discount" DECIMAL(15,2),
    "discountPercent" DECIMAL(5,2),
    "taxes" DECIMAL(15,2),
    "taxPercent" DECIMAL(5,2),
    "subtotal" DECIMAL(15,2),
    "total" DECIMAL(15,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: quote_versions
CREATE TABLE "quote_versions" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "reason" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: quote_templates
CREATE TABLE "quote_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'commercial',
    "content" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quote_templates_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for quote_items
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign keys for quote_versions
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "quote_items_quoteId_idx" ON "quote_items"("quoteId");
CREATE INDEX "quote_items_productId_idx" ON "quote_items"("productId");
CREATE INDEX "quote_versions_quoteId_idx" ON "quote_versions"("quoteId");
CREATE INDEX "quote_versions_version_idx" ON "quote_versions"("version");
CREATE INDEX "quote_versions_tenantId_idx" ON "quote_versions"("tenantId");
CREATE UNIQUE INDEX "quote_templates_name_tenantId_key" ON "quote_templates"("name", "tenantId");
CREATE INDEX "quote_templates_tenantId_idx" ON "quote_templates"("tenantId");
CREATE INDEX "quote_templates_type_idx" ON "quote_templates"("type");

-- Add quoteId to activities
ALTER TABLE "activities" ADD COLUMN "quoteId" TEXT;
ALTER TABLE "activities" ADD CONSTRAINT "activities_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "activities_quoteId_idx" ON "activities"("quoteId");
