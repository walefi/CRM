-- AlterTable
ALTER TABLE "events" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "dealId" TEXT,
ADD COLUMN     "recurrence" JSONB,
ADD COLUMN     "recurrenceRule" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'meeting',
ADD COLUMN     "videoLink" TEXT;

-- CreateTable
CREATE TABLE "event_participants" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'attendee',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_reminders" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 15,
    "channel" TEXT NOT NULL DEFAULT 'notification',
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_resources" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'room',
    "capacity" INTEGER,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_participants_eventId_idx" ON "event_participants"("eventId");

-- CreateIndex
CREATE INDEX "event_reminders_eventId_idx" ON "event_reminders"("eventId");

-- CreateIndex
CREATE INDEX "event_resources_eventId_idx" ON "event_resources"("eventId");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- AddForeignKey
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
