import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "zap-emprestimos-jwt-secret-2026-prod"
);

const COOKIE = "zap_token";
const EXPIRES = 60 * 60 * 24 * 7; // 7 dias

export interface JWTPayload {
  sub:   string; // userId
  email: string;
  nome:  string;
  role:  string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES}s`)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  try {
    const jar   = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function setSessionCookie(token: string) {
  return {
    name:     COOKIE,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/",
    maxAge:   EXPIRES,
  };
}

export function clearSessionCookie() {
  return {
    name:    COOKIE,
    value:   "",
    maxAge:  0,
    path:    "/",
  };
}
