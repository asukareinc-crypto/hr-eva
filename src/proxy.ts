import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  SR_ADMIN: "/sr",
  CLIENT_ADMIN: "/client",
  EMPLOYEE: "/m",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/api/account/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/sw.js");

  if (!session?.user) {
    if (isPublic) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const role = session.user.role as string;
  const home = ROLE_HOME[role] ?? "/";

  if (pathname === "/dashboard") {
    const url = req.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  const areas = [
    { prefix: "/admin", roles: ["SUPER_ADMIN"] },
    { prefix: "/sr", roles: ["SR_ADMIN"] },
    { prefix: "/client", roles: ["CLIENT_ADMIN"] },
    { prefix: "/m", roles: ["EMPLOYEE"] },
  ];
  for (const a of areas) {
    if (pathname.startsWith(a.prefix) && !a.roles.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
