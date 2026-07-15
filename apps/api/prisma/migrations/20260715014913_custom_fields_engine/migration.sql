-- AlterTable
ALTER TABLE "custom_fields" ADD COLUMN     "category" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "defaultValue" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "helpText" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isReadonly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isUnique" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mask" TEXT,
ADD COLUMN     "maxLength" INTEGER,
ADD COLUMN     "maxValue" DECIMAL(15,2),
ADD COLUMN     "minLength" INTEGER,
ADD COLUMN     "minValue" DECIMAL(15,2),
ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "regex" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "custom_field_options" (
    "id" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "custom_field_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entity" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_field_options_customFieldId_idx" ON "custom_field_options"("customFieldId");

-- CreateIndex
CREATE INDEX "custom_field_groups_tenantId_idx" ON "custom_field_groups"("tenantId");

-- CreateIndex
CREATE INDEX "custom_field_groups_entity_idx" ON "custom_field_groups"("entity");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_groups_name_entity_tenantId_key" ON "custom_field_groups"("name", "entity", "tenantId");

-- CreateIndex
CREATE INDEX "custom_fields_entity_idx" ON "custom_fields"("entity");

-- CreateIndex
CREATE INDEX "custom_fields_category_idx" ON "custom_fields"("category");

-- CreateIndex
CREATE INDEX "custom_fields_deletedAt_idx" ON "custom_fields"("deletedAt");

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "custom_field_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_options" ADD CONSTRAINT "custom_field_options_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_groups" ADD CONSTRAINT "custom_field_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
