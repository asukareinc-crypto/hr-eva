"use server";

import { prisma } from "@/lib/prisma";
import { requireClientAdmin } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { encryptSecret } from "@/lib/crypto";
import type { ClientApiService } from "@/generated/prisma/enums";

const VALID_SERVICES: ClientApiService[] = [
  "SLACK_WEBHOOK",
  "LINE_NOTIFY",
  "CHATWORK",
  "RESEND",
  "CUSTOM",
];

export async function upsertClientApiKey(formData: FormData) {
  const session = await requireClientAdmin();
  const clientId = session.user.clientId!;
  const service = String(formData.get("service") ?? "") as ClientApiService;
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

  let metadata: string | null = null;
  if (metadataRaw) {
    try {
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

  const existing = await prisma.clientApiKey.findFirst({
    where: { clientId, service },
  });
  if (existing) {
    await prisma.clientApiKey.update({
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
    await prisma.clientApiKey.create({
      data: {
        clientId,
        service,
        label,
        encryptedValue: encrypted,
        metadata,
        expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
      },
    });
  }
  revalidatePath("/client/settings/api-keys");
  return { ok: true };
}

export async function toggleClientApiKey(id: string) {
  const session = await requireClientAdmin();
  const k = await prisma.clientApiKey.findFirst({
    where: { id, clientId: session.user.clientId! },
  });
  if (!k) return;
  await prisma.clientApiKey.update({
    where: { id },
    data: { isActive: !k.isActive },
  });
  revalidatePath("/client/settings/api-keys");
}

export async function deleteClientApiKey(id: string) {
  const session = await requireClientAdmin();
  const k = await prisma.clientApiKey.findFirst({
    where: { id, clientId: session.user.clientId! },
  });
  if (!k) return;
  await prisma.clientApiKey.delete({ where: { id } });
  revalidatePath("/client/settings/api-keys");
}
