import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // 同一メールで複数アカウントがある場合のディスアンビギュエーション用
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const userId = (credentials?.userId as string | undefined) || null;
        if (!rawEmail || !password) return null;
        const email = rawEmail.trim().toLowerCase();

        const candidates = await prisma.user.findMany({
          where: { email, isActive: true },
        });
        if (candidates.length === 0) return null;

        // userId 指定があれば優先的に絞り込み
        const filtered = userId
          ? candidates.filter((u) => u.id === userId)
          : candidates;
        if (filtered.length === 0) return null;

        // パスワード照合（複数行ある場合は最初に一致するものを返す）
        for (const user of filtered) {
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (ok) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              tenantId: user.tenantId,
              clientId: user.clientId,
              employeeId: user.employeeId,
            };
          }
        }
        return null;
      },
    }),
  ],
});
