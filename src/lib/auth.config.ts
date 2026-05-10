import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/generated/prisma/enums";

/**
 * Edge runtime（middleware）でも安全に使える設定の集合。
 * Prisma や bcrypt を使う Provider は auth.ts 側で登録する。
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: UserRole }).role;
        token.tenantId = (user as { tenantId: string | null }).tenantId;
        token.clientId = (user as { clientId: string | null }).clientId;
        token.employeeId = (user as { employeeId: string | null }).employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as UserRole;
        session.user.tenantId = token.tenantId as string | null;
        session.user.clientId = token.clientId as string | null;
        session.user.employeeId = token.employeeId as string | null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
