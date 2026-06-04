import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/", "/login", "/register", "/api/auth/login", "/api/auth/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permite paths públicos, arquivos estáticos e favicon
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/apple") ||
    pathname.match(/\.(png|ico|svg|jpg|jpeg|webp|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("zap_token")?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Injeta headers da sessão para uso nos Server Components
  const res = NextResponse.next();
  res.headers.set("x-user-id",    session.sub);
  res.headers.set("x-user-email", session.email);
  res.headers.set("x-user-role",  session.role);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
