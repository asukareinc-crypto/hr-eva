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
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!rawEmail || !password) return null;
        const email = rawEmail.trim().toLowerCase();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          console.warn("[auth] user not found or inactive:", email);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          console.warn("[auth] password mismatch for:", email);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          clientId: user.clientId,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
});
