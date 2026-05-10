import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import type { TenantApiService } from "@/generated/prisma/enums";

/**
 * テナントの API キーを取得（復号して返す）
 * - 有効なキーが存在し isActive のもののみ
 * - 期限切れは null を返す
 * - 取得時に lastUsedAt を更新
 */
export async function getTenantApiKey(
  tenantId: string,
  service: TenantApiService
): Promise<{ value: string; metadata: Record<string, string> | null } | null> {
  const record = await prisma.tenantApiKey.findFirst({
    where: { tenantId, service, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!record) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  let value: string;
  try {
    value = decryptSecret(record.encryptedValue);
  } catch (e) {
    console.error("[tenantApiKey] decrypt failed:", e);
    return null;
  }

  // lastUsedAt 更新（失敗は無視）
  prisma.tenantApiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  let metadata: Record<string, string> | null = null;
  if (record.metadata) {
    try {
      metadata = JSON.parse(record.metadata);
    } catch {
      metadata = null;
    }
  }

  return { value, metadata };
}
