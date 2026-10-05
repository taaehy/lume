import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUser } from "@/lib/auth/dal";
import { createSession } from "@/lib/auth/session";
import { createWorkspaceAccount } from "@/lib/auth/accounts";
import { appOrigin, providerConfig, type Provider } from "@/lib/auth/providers";
import { HttpError } from "@/lib/http-error";
import { consumeRateLimit } from "@/lib/auth/rate-limit";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function providerName(value: string): Provider {
  if (value !== "google" && value !== "github")
    throw new HttpError(404, "Provedor não encontrado.");
  return value;
}
async function remoteJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new HttpError(
      502,
      "Não foi possível confirmar sua conta no provedor.",
    );
  return response.json();
}
function fail(message: string) {
  return NextResponse.redirect(
    new URL("/login?error=" + encodeURIComponent(message), appOrigin()),
  );
}
export async function startOAuth(value: string) {
  try {
    const provider = providerName(value);
    const config = providerConfig(provider);
    if (!config.clientId || !config.clientSecret)
      throw new HttpError(503, "Este provedor ainda precisa ser configurado.");
    const user = await getAuthenticatedUser();
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    await prisma.oAuthChallenge.create({
      data: {
        id: digest(state),
        provider,
        verifier,
        userId: user?.id,
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    (await cookies()).set("lume_oauth_" + provider, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/" + provider,
      maxAge: 600,
    });
    const target = new URL(
      provider === "google"
        ? "https://accounts.google.com/o/oauth2/v2/auth"
        : "https://github.com/login/oauth/authorize",
    );
    const params = {
      client_id: config.clientId,
      redirect_uri: appOrigin() + "/api/auth/" + provider + "/callback",
      response_type: "code",
      scope:
        provider === "google" ? "openid email profile" : "read:user user:email",
      state,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    };
    for (const [key, value] of Object.entries(params))
      target.searchParams.set(key, value);
    if (provider === "google")
      target.searchParams.set("prompt", "select_account");
    return NextResponse.redirect(target);
  } catch (error) {
    return fail(
      error instanceof HttpError
        ? error.message
        : "Não foi possível iniciar o login externo.",
    );
  }
}
export async function finishOAuth(request: Request, value: string) {
  try {
    const provider = providerName(value);
    const config = providerConfig(provider);
    if (!config.clientId || !config.clientSecret)
      throw new HttpError(503, "Este provedor ainda precisa ser configurado.");
    const url = new URL(request.url);
    const state = url.searchParams.get("state") ?? "";
    const store = await cookies();
    const expected = store.get("lume_oauth_" + provider)?.value ?? "";
    store.delete({
      name: "lume_oauth_" + provider,
      path: "/api/auth/" + provider,
    });
    if (
      !state ||
      state.length !== expected.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(expected))
    )
      throw new HttpError(
        400,
        "Sessão de autorização inválida. Tente novamente.",
      );
    const challenge = await prisma.oAuthChallenge.findUnique({
      where: { id: digest(state) },
    });
    if (
      !challenge ||
      challenge.provider !== provider ||
      challenge.expiresAt <= new Date()
    )
      throw new HttpError(400, "Autorização expirada. Tente novamente.");
    const deleted = await prisma.oAuthChallenge.deleteMany({
      where: { id: challenge.id },
    });
    if (!deleted.count) throw new HttpError(400, "Autorização já utilizada.");
    const code = url.searchParams.get("code");
    if (!code || url.searchParams.has("error"))
      throw new HttpError(400, "Autorização cancelada no provedor.");
    const current = await getAuthenticatedUser();
    if (challenge.userId && current?.id !== challenge.userId)
      throw new HttpError(
        403,
        "A conta conectada mudou durante a autorização.",
      );
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      code_verifier: challenge.verifier,
      redirect_uri: appOrigin() + "/api/auth/" + provider + "/callback",
      grant_type: "authorization_code",
    });
    const token = await remoteJson(
      provider === "google"
        ? "https://oauth2.googleapis.com/token"
        : "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      },
    );
    const access = z
      .object({
        access_token: z.string().min(1),
        token_type: z
          .string()
          .refine((value) => value.toLowerCase() === "bearer"),
      })
      .parse(token);
    const headers = {
      Authorization: "Bearer " + access.access_token,
      Accept: "application/json",
      "User-Agent": "Lume",
    };
    let identity: { subject: string; email: string; name: string };
    if (provider === "google") {
      const profile = z
        .object({
          sub: z.string().min(1),
          email: z.email(),
          email_verified: z.literal(true),
          name: z.string().optional(),
        })
        .parse(
          await remoteJson("https://openidconnect.googleapis.com/v1/userinfo", {
            headers,
          }),
        );
      identity = {
        subject: profile.sub,
        email: profile.email.toLowerCase(),
        name: profile.name ?? profile.email.split("@")[0],
      };
    } else {
      const [rawProfile, rawEmails] = await Promise.all([
        remoteJson("https://api.github.com/user", { headers }),
        remoteJson("https://api.github.com/user/emails", { headers }),
      ]);
      const profile = z
        .object({
          id: z.number().int().positive(),
          login: z.string(),
          name: z.string().nullable(),
        })
        .parse(rawProfile);
      const emails = z
        .array(
          z.object({
            email: z.email(),
            primary: z.boolean(),
            verified: z.boolean(),
          }),
        )
        .parse(rawEmails);
      const email = emails.find((e) => e.primary && e.verified);
      if (!email)
        throw new HttpError(
          422,
          "Confirme seu e-mail principal no GitHub antes de continuar.",
        );
      identity = {
        subject: String(profile.id),
        email: email.email.toLowerCase(),
        name: profile.name ?? profile.login,
      };
    }
    await consumeRateLimit("oauth-account", identity.subject, 30);
    const account = await prisma.$transaction(async (tx) => {
      const connected = await tx.oAuthAccount.findUnique({
        where: { provider_subject: { provider, subject: identity.subject } },
        include: { user: true },
      });
      if (connected) {
        if (challenge.userId && connected.userId !== challenge.userId)
          throw new HttpError(
            409,
            "Esta conta externa já está vinculada a outra pessoa.",
          );
        return connected.user;
      }
      let user;
      if (challenge.userId) {
        user = await tx.user.findUniqueOrThrow({
          where: { id: challenge.userId },
        });
        if (user.email !== identity.email)
          throw new HttpError(
            422,
            "Use uma conta externa com o mesmo e-mail do seu perfil.",
          );
      } else {
        if (await tx.user.findUnique({ where: { email: identity.email } }))
          throw new HttpError(
            409,
            "Este e-mail já tem uma conta. Entre com sua senha e vincule o provedor em Perfil.",
          );
        user = await createWorkspaceAccount(tx, {
          name: identity.name.slice(0, 100),
          email: identity.email,
          emailVerified: new Date(),
        });
      }
      await tx.oAuthAccount.create({
        data: { provider, subject: identity.subject, userId: user.id },
      });
      return user;
    });
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: account.id },
      orderBy: { createdAt: "asc" },
    });
    await createSession({
      id: account.id,
      name: account.name,
      email: account.email,
      role: membership?.role ?? "VIEWER",
      sessionVersion: account.sessionVersion,
    });
    return NextResponse.redirect(
      new URL(challenge.userId ? "/perfil" : "/dashboard", appOrigin()),
    );
  } catch (error) {
    console.error(
      "Falha no login externo",
      error instanceof Error ? error.name : "UnknownError",
    );
    return fail(
      error instanceof HttpError
        ? error.message
        : "Não foi possível confirmar o login externo.",
    );
  }
}
