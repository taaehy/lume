import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { roles, type Role } from "./permissions";

export const sessionCookieName = "lume_session";
const sessionDurationMs = 7 * 24 * 60 * 60 * 1_000;
const developmentSecret =
  "lume-development-session-secret-change-before-production";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  sessionVersion?: number;
};

export type SessionPayload = SessionUser & {
  expiresAt: number;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return developmentSecret;
  throw new Error("AUTH_SECRET precisa ser configurado em produção.");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.some((role) => role === value);
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.id === "string" &&
    typeof payload.name === "string" &&
    typeof payload.email === "string" &&
    isRole(payload.role) &&
    typeof payload.expiresAt === "number"
  );
}

export function createSessionToken(
  user: SessionUser,
  now = Date.now(),
): string {
  const payload: SessionPayload = {
    ...user,
    sessionVersion: user.sessionVersion ?? 0,
    expiresAt: now + sessionDurationMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(
  token: string | undefined,
  now = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, receivedSignature, extraPart] = token.split(".");
  if (!encodedPayload || !receivedSignature || extraPart) return null;

  const expectedSignature = sign(encodedPayload);
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    if (!isSessionPayload(payload) || payload.expiresAt <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationMs / 1_000,
    priority: "high",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}
