"use server";

import { prisma } from "@/lib/prisma";
import { requireSr } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { encryptSecret } from "@/lib/crypto";
import type { TenantApiService } from "@/generated/prisma/enums";

const VALID_SERVICES: TenantApiService[] = [
  "OPENAI",
  "ANTHROPIC",
  "YAYOI_PAYROLL",
  "FREEE",
  "MONEY_FORWARD",
  "CUSTOM",
];

export async function upsertApiKey(formData: FormData) {
  const session = await requireSr();
  const tenantId = session.user.tenantId!;
  const service = String(formData.get("service") ?? "") as TenantApiService;
  const label = String(formData.get("label") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  const metadataRaw = String(formData.get("metadata") ?? "").trim();
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");

  if (!VALID_SERVICES.includes(service)) {
    return { ok: false, error: "無効なサービスです" };
  }
  if (!label || !value) {
    return { ok: false, error: "ラベルとAPIキー値は必須です" };
  }

  // metadata は任意の JSON 文字列または key=value 形式（複数行）
  let metadata: string | null = null;
  if (metadataRaw) {
    try {
      // JSON として解釈できればそのまま、できなければ key=value をパース
      JSON.parse(metadataRaw);
      metadata = metadataRaw;
    } catch {
      const obj: Record<string, string> = {};
      for (const line of metadataRaw.split(/\r?\n/)) {
        const m = line.match(/^([^=]+)=(.*)$/);
        if (m) obj[m[1].trim()] = m[2].trim();
      }
      metadata = Object.keys(obj).length > 0 ? JSON.stringify(obj) : null;
    }
  }

  const encrypted = encryptSecret(value);

  // 同じ tenantId + service があれば更新、なければ作成
  const existing = await prisma.tenantApiKey.findFirst({
    where: { tenantId, service },
  });
  if (existing) {
    await prisma.tenantApiKey.update({
      where: { id: existing.id },
      data: {
        label,
        encryptedValue: encrypted,
        metadata,
        expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
        isActive: true,
      },
    });
  } else {
    await prisma.tenantApiKey.create({
      data: {
        tenantId,
        service,
        label,
        encryptedValue: encrypted,
        metadata,
        expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
      },
    });
  }

  revalidatePath("/sr/settings/api-keys");
  return { ok: true };
}

export async function toggleApiKeyActive(id: string) {
  const session = await requireSr();
  const k = await prisma.tenantApiKey.findFirst({
    where: { id, tenantId: session.user.tenantId! },
  });
  if (!k) return;
  await prisma.tenantApiKey.update({
    where: { id },
    data: { isActive: !k.isActive },
  });
  revalidatePath("/sr/settings/api-keys");
}

export async function deleteApiKey(id: string) {
  const session = await requireSr();
  const k = await prisma.tenantApiKey.findFirst({
    where: { id, tenantId: session.user.tenantId! },
  });
  if (!k) return;
  await prisma.tenantApiKey.delete({ where: { id } });
  revalidatePath("/sr/settings/api-keys");
}
