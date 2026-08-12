import { NextRequest, NextResponse } from "next/server";
import {
  beautyProofSessionCookie,
  beautyProofSessionHeader,
  isSessionUserId,
} from "@/lib/security/session";

const encoder = new TextEncoder();

function sessionSecret() {
  return process.env.BEAUTYPROOF_SESSION_SECRET
    ?? process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? "beautyproof-local-session-only";
}

function base64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signature(userId: string) {
  const keyMaterial = await crypto.subtle.digest("SHA-256", encoder.encode(`BeautyProof session v1\0${sessionSecret()}`));
  const key = await crypto.subtle.importKey("raw", keyMaterial, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(userId)));
}

async function readSession(value?: string) {
  if (!value) return null;
  const separator = value.indexOf(".");
  if (separator < 0) return null;
  const userId = value.slice(0, separator);
  const receivedSignature = value.slice(separator + 1);
  if (!isSessionUserId(userId)) return null;
  const expectedSignature = await signature(userId);
  const [receivedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(receivedSignature)),
    crypto.subtle.digest("SHA-256", encoder.encode(expectedSignature)),
  ]);
  const receivedBytes = new Uint8Array(receivedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) difference |= receivedBytes[index] ^ expectedBytes[index];
  if (difference !== 0) return null;
  return userId;
}

export async function middleware(request: NextRequest) {
  const existing = request.cookies.get(beautyProofSessionCookie)?.value;
  const existingUserId = await readSession(existing);
  const userId = existingUserId ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);

  // Always overwrite the internal identity header so callers cannot select a
  // different user's server-side records.
  requestHeaders.set(beautyProofSessionHeader, userId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!existingUserId) {
    response.cookies.set(beautyProofSessionCookie, `${userId}.${await signature(userId)}`, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 180,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
