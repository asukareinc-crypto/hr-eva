/**
 * 本番環境用シード（最小限）
 * - Super Admin ユーザーを1名作成のみ
 * - デモテナント / デモクライアント / デモ評価項目は作成しない
 *
 * 環境変数:
 *   SUPER_ADMIN_EMAIL    必須
 *   SUPER_ADMIN_PASSWORD 必須（後で必ず変更してもらう）
 *   SUPER_ADMIN_NAME     任意（デフォルト "運営管理者"）
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME ?? "運営管理者";

  if (!email || !password) {
    throw new Error(
      "SUPER_ADMIN_EMAIL と SUPER_ADMIN_PASSWORD の環境変数が必要です。"
    );
  }
  if (password.length < 8) {
    throw new Error("SUPER_ADMIN_PASSWORD は8文字以上にしてください。");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, name, role: "SUPER_ADMIN", isActive: true },
    create: {
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log(`✓ Super Admin ${user.email} を作成/更新しました`);
  console.log("  パスワードを必ず初回ログイン後に変更してください。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
