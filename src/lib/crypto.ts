import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * AES-256-GCM で文字列を暗号化／復号する。
 * env: ENCRYPTION_KEY が必須（平文 32 文字以上推奨）
 *
 * 出力フォーマット（base64 連結）:
 *   <salt:16> | <iv:12> | <authTag:16> | <ciphertext>
 */

function getMasterKey(): string {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || k.length < 16) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is missing or too short (>=16 chars required)."
    );
  }
  return k;
}

function deriveKey(salt: Buffer): Buffer {
  return scryptSync(getMasterKey(), salt, 32);
}

export function encryptSecret(plaintext: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const salt = buf.subarray(0, 16);
  const iv = buf.subarray(16, 28);
  const tag = buf.subarray(28, 44);
  const enc = buf.subarray(44);
  const key = deriveKey(salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** 表示用にマスク化（先頭4文字 + ... + 末尾4文字） */
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 12) return "****";
  return `${plaintext.slice(0, 4)}…${plaintext.slice(-4)}`;
}
