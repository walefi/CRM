-- DropForeignKey
ALTER TABLE "timelines" DROP CONSTRAINT "timelines_userId_fkey";

-- AlterTable
ALTER TABLE "histories" ADD COLUMN     "module" TEXT NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE "timelines" ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "device" TEXT,
ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT 'generic',
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "module" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "summary" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "timeline_comments" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timeline_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_attachments" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT,
    "type" TEXT NOT NULL DEFAULT 'file',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_reactions" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_bookmarks" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timeline_comments_timelineId_idx" ON "timeline_comments"("timelineId");

-- CreateIndex
CREATE INDEX "timeline_attachments_timelineId_idx" ON "timeline_attachments"("timelineId");

-- CreateIndex
CREATE INDEX "timeline_reactions_timelineId_idx" ON "timeline_reactions"("timelineId");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_reactions_timelineId_userId_reaction_key" ON "timeline_reactions"("timelineId", "userId", "reaction");

-- CreateIndex
CREATE INDEX "timeline_bookmarks_userId_idx" ON "timeline_bookmarks"("userId");

-- CreateIndex
CREATE INDEX "timeline_bookmarks_tenantId_idx" ON "timeline_bookmarks"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_bookmarks_timelineId_userId_key" ON "timeline_bookmarks"("timelineId", "userId");

-- CreateIndex
CREATE INDEX "histories_module_idx" ON "histories"("module");

-- CreateIndex
CREATE INDEX "timelines_module_idx" ON "timelines"("module");

-- CreateIndex
CREATE INDEX "timelines_eventType_idx" ON "timelines"("eventType");

-- CreateIndex
CREATE INDEX "timelines_correlationId_idx" ON "timelines"("correlationId");

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_comments" ADD CONSTRAINT "timeline_comments_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_comments" ADD CONSTRAINT "timeline_comments_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "timeline_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_attachments" ADD CONSTRAINT "timeline_attachments_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_reactions" ADD CONSTRAINT "timeline_reactions_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_bookmarks" ADD CONSTRAINT "timeline_bookmarks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
