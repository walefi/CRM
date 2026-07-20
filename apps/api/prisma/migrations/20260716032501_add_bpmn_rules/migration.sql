-- CreateTable
CREATE TABLE "business_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'conditional',
    "expression" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'sequential',
    "entityType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "approverId" TEXT,
    "approverRole" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decision" TEXT,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bpmnXml" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "variables" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "human_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assigneeId" TEXT,
    "queue" TEXT NOT NULL DEFAULT 'default',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "formData" JSONB,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "human_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_rules_tenantId_idx" ON "business_rules"("tenantId");

-- CreateIndex
CREATE INDEX "business_rules_category_idx" ON "business_rules"("category");

-- CreateIndex
CREATE INDEX "business_rules_isActive_idx" ON "business_rules"("isActive");

-- CreateIndex
CREATE INDEX "approval_flows_tenantId_idx" ON "approval_flows"("tenantId");

-- CreateIndex
CREATE INDEX "approval_flows_entityType_idx" ON "approval_flows"("entityType");

-- CreateIndex
CREATE INDEX "approval_steps_flowId_idx" ON "approval_steps"("flowId");

-- CreateIndex
CREATE INDEX "process_definitions_tenantId_idx" ON "process_definitions"("tenantId");

-- CreateIndex
CREATE INDEX "process_definitions_status_idx" ON "process_definitions"("status");

-- CreateIndex
CREATE INDEX "human_tasks_tenantId_idx" ON "human_tasks"("tenantId");

-- CreateIndex
CREATE INDEX "human_tasks_assigneeId_idx" ON "human_tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "human_tasks_queue_idx" ON "human_tasks"("queue");

-- CreateIndex
CREATE INDEX "human_tasks_status_idx" ON "human_tasks"("status");

-- AddForeignKey
ALTER TABLE "business_rules" ADD CONSTRAINT "business_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "approval_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_definitions" ADD CONSTRAINT "process_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_tasks" ADD CONSTRAINT "human_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
