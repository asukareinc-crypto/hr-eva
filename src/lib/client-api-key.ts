import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import type { ClientApiService } from "@/generated/prisma/enums";

/**
 * クライアント企業の API キーを取得（復号して返す）。
 * 用途: Slack / LINE / ChatWork 等、会社単位で異なる外部サービスへの通知。
 */
export async function getClientApiKey(
  clientId: string,
  service: ClientApiService
): Promise<{ value: string; metadata: Record<string, string> | null } | null> {
  const record = await prisma.clientApiKey.findFirst({
    where: { clientId, service, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!record) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  let value: string;
  try {
    value = decryptSecret(record.encryptedValue);
  } catch (e) {
    console.error("[clientApiKey] decrypt failed:", e);
    return null;
  }

  prisma.clientApiKey
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

// ----- 通知ユーティリティ -----

/** Slack Incoming Webhook へ送信 */
export async function sendSlack(
  clientId: string,
  text: string,
  options?: { channel?: string; username?: string }
): Promise<{ ok: boolean }> {
  const k = await getClientApiKey(clientId, "SLACK_WEBHOOK");
  if (!k) {
    console.log("[slack:dev]", { clientId, text });
    return { ok: true };
  }
  try {
    const res = await fetch(k.value, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        channel: options?.channel ?? k.metadata?.channel,
        username: options?.username ?? k.metadata?.username,
      }),
    });
    return { ok: res.ok };
  } catch (e) {
    console.error("[slack] failed:", e);
    return { ok: false };
  }
}

/** LINE Notify へ送信 */
export async function sendLineNotify(
  clientId: string,
  message: string
): Promise<{ ok: boolean }> {
  const k = await getClientApiKey(clientId, "LINE_NOTIFY");
  if (!k) {
    console.log("[line:dev]", { clientId, message });
    return { ok: true };
  }
  try {
    const res = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${k.value}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ message }),
    });
    return { ok: res.ok };
  } catch (e) {
    console.error("[line] failed:", e);
    return { ok: false };
  }
}

/** ChatWork へメッセージ送信（roomId は metadata で指定） */
export async function sendChatwork(
  clientId: string,
  body: string,
  roomIdOverride?: string
): Promise<{ ok: boolean }> {
  const k = await getClientApiKey(clientId, "CHATWORK");
  if (!k) {
    console.log("[chatwork:dev]", { clientId, body });
    return { ok: true };
  }
  const roomId = roomIdOverride ?? k.metadata?.roomId;
  if (!roomId) {
    console.error("[chatwork] roomId not configured");
    return { ok: false };
  }
  try {
    const res = await fetch(`https://api.chatwork.com/v2/rooms/${roomId}/messages`, {
      method: "POST",
      headers: {
        "X-ChatWorkToken": k.value,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ body }),
    });
    return { ok: res.ok };
  } catch (e) {
    console.error("[chatwork] failed:", e);
    return { ok: false };
  }
}
