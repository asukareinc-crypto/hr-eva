-- Split Slack/LINE/ChatWork from TenantApiService into a new ClientApiKey
-- (model: client/会社単位での外部サービス連携)

-- 1) New enum for client-level services
CREATE TYPE "ClientApiService" AS ENUM (
  'SLACK_WEBHOOK',
  'LINE_NOTIFY',
  'CHATWORK',
  'RESEND',
  'CUSTOM'
);

-- 2) New table
CREATE TABLE "ClientApiKey" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "service" "ClientApiService" NOT NULL,
  "label" TEXT NOT NULL,
  "encryptedValue" TEXT NOT NULL,
  "metadata" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientApiKey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientApiKey_clientId_service_idx" ON "ClientApiKey"("clientId", "service");
CREATE INDEX "ClientApiKey_clientId_idx" ON "ClientApiKey"("clientId");

ALTER TABLE "ClientApiKey"
  ADD CONSTRAINT "ClientApiKey_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Remove SLACK_WEBHOOK / LINE_NOTIFY / CHATWORK from TenantApiService enum
-- Postgres can't drop enum values directly; recreate the type.
ALTER TYPE "TenantApiService" RENAME TO "TenantApiService_old";

CREATE TYPE "TenantApiService" AS ENUM (
  'RESEND',
  'OPENAI',
  'ANTHROPIC',
  'YAYOI_PAYROLL',
  'FREEE',
  'MONEY_FORWARD',
  'CUSTOM'
);

-- Migrate any existing values (Slack/LINE/ChatWork rows are dropped)
DELETE FROM "TenantApiKey" WHERE "service"::text IN ('SLACK_WEBHOOK', 'LINE_NOTIFY', 'CHATWORK');
ALTER TABLE "TenantApiKey"
  ALTER COLUMN "service" TYPE "TenantApiService"
  USING ("service"::text::"TenantApiService");

DROP TYPE "TenantApiService_old";
