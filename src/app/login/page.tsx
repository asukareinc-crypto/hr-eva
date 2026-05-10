import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "./LoginForm";

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  SR_ADMIN: "/sr",
  CLIENT_ADMIN: "/client",
  EMPLOYEE: "/m",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(ROLE_HOME[session.user.role] ?? "/");
  }
  return <LoginForm />;
}
