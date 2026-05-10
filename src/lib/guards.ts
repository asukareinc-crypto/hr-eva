import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) redirect("/");
  return session;
}

export async function requireSr() {
  return requireRole("SR_ADMIN");
}
export async function requireClientAdmin() {
  return requireRole("CLIENT_ADMIN");
}
export async function requireEmployee() {
  return requireRole("EMPLOYEE");
}
export async function requireSuperAdmin() {
  return requireRole("SUPER_ADMIN");
}
