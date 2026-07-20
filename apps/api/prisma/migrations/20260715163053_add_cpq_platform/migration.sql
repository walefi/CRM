-- AlterTable
ALTER TABLE "products" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "bundleGroupId" TEXT,
ADD COLUMN     "comparePrice" DECIMAL(15,2),
ADD COLUMN     "ean" TEXT,
ADD COLUMN     "family" TEXT,
ADD COLUMN     "margin" DECIMAL(5,2),
ADD COLUMN     "maxQuantity" INTEGER,
ADD COLUMN     "minQuantity" INTEGER,
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "stock" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'product';

-- CreateTable
CREATE TABLE "price_books" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'bundle',
    "price" DECIMAL(15,2),
    "items" JSONB NOT NULL DEFAULT '[]',
    "rules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'percentage',
    "value" DOUBLE PRECISION NOT NULL,
    "minQuantity" INTEGER,
    "maxPercent" DOUBLE PRECISION,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_books_tenantId_idx" ON "price_books"("tenantId");

-- CreateIndex
CREATE INDEX "price_books_isActive_idx" ON "price_books"("isActive");

-- CreateIndex
CREATE INDEX "bundles_tenantId_idx" ON "bundles"("tenantId");

-- CreateIndex
CREATE INDEX "bundles_type_idx" ON "bundles"("type");

-- CreateIndex
CREATE INDEX "discount_rules_tenantId_idx" ON "discount_rules"("tenantId");

-- CreateIndex
CREATE INDEX "discount_rules_isActive_idx" ON "discount_rules"("isActive");

-- CreateIndex
CREATE INDEX "products_type_idx" ON "products"("type");

-- AddForeignKey
ALTER TABLE "price_books" ADD CONSTRAINT "price_books_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
