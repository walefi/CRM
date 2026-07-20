-- Integration Foundation Migration
-- Etapa 65.1 — Foundation for Email & WhatsApp integrations
-- Date: 2026-07-18

-- 1. Add idempotencyKey to WebhookDelivery
ALTER TABLE "webhook_deliveries" ADD COLUMN "idempotencyKey" TEXT;

-- 2. Make endpointId nullable in WebhookDelivery (was NOT NULL)
ALTER TABLE "webhook_deliveries" ALTER COLUMN "endpointId" DROP NOT NULL;

-- 3. Add unique constraint for idempotency
CREATE UNIQUE INDEX "webhook_delivery_idempotency_unique" ON "webhook_deliveries"("idempotencyKey", "tenantId") WHERE "idempotencyKey" IS NOT NULL;

-- 4. Add index for idempotencyKey lookups
CREATE INDEX "webhook_deliveries_idempotencyKey_idx" ON "webhook_deliveries"("idempotencyKey");

-- 5. Add foreign key from WebhookDelivery to WebhookEndpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Add foreign key from Notification to NotificationTemplate
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Add foreign key from NotificationDelivery to Notification
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Add foreign key from TimelineBookmark to Timeline
ALTER TABLE "timeline_bookmarks" ADD CONSTRAINT "timeline_bookmarks_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "timelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
