-- CreateEnum
CREATE TYPE "KioskStateKind" AS ENUM ('IDLE', 'WAITING', 'PAID', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "themeColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "machineSlug" TEXT NOT NULL,
    "squarespaceStoreUrl" TEXT NOT NULL,
    "squarespaceSelectionPageUrl" TEXT NOT NULL,
    "squarespaceWebhookSecret" TEXT NOT NULL,
    "squarespaceCommerceApiKeyEnc" TEXT NOT NULL,
    "switchbotTokenEnc" TEXT NOT NULL,
    "switchbotSecretEnc" TEXT NOT NULL,
    "switchbotDeviceId" TEXT NOT NULL,
    "switchbotCommand" TEXT NOT NULL DEFAULT 'press',
    "kioskPinHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "webhookEventType" TEXT NOT NULL,
    "webhookSignature" TEXT,
    "eventHash" TEXT NOT NULL,
    "paymentStatus" TEXT,
    "unlockTriggered" BOOLEAN NOT NULL DEFAULT false,
    "unlockTriggeredAt" TIMESTAMP(3),
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KioskState" (
    "machineId" TEXT NOT NULL,
    "state" "KioskStateKind" NOT NULL DEFAULT 'IDLE',
    "message" TEXT NOT NULL DEFAULT '',
    "lastOrderId" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "KioskState_pkey" PRIMARY KEY ("machineId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "machineId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Machine_userId_idx" ON "Machine"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_userId_machineSlug_key" ON "Machine"("userId", "machineSlug");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_eventHash_key" ON "OrderEvent"("eventHash");

-- CreateIndex
CREATE INDEX "OrderEvent_machineId_createdAt_idx" ON "OrderEvent"("machineId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_machineId_createdAt_idx" ON "AuditLog"("machineId", "createdAt");

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KioskState" ADD CONSTRAINT "KioskState_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
