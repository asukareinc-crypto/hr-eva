-- CreateEnum
CREATE TYPE "TenantApiService" AS ENUM ('RESEND', 'SLACK_WEBHOOK', 'LINE_NOTIFY', 'CHATWORK', 'OPENAI', 'ANTHROPIC', 'YAYOI_PAYROLL', 'FREEE', 'MONEY_FORWARD', 'CUSTOM');

-- CreateTable
CREATE TABLE "TenantApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "service" "TenantApiService" NOT NULL,
    "label" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "metadata" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantApiKey_tenantId_service_idx" ON "TenantApiKey"("tenantId", "service");

-- CreateIndex
CREATE INDEX "TenantApiKey_tenantId_idx" ON "TenantApiKey"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantApiKey" ADD CONSTRAINT "TenantApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
