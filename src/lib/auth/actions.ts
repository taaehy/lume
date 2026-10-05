"use server";

import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { HttpError } from "@/lib/http-error";
import { createWorkspaceAccount } from "@/lib/auth/accounts";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { createSession, deleteSession } from "@/lib/auth/session";
import { checkPassword, hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import {
  loginSchema,
  registerSchema,
  type AuthFormState,
} from "@/lib/auth/validation";

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  try {
    await consumeRateLimit("login", parsed.data.email.toLowerCase(), 12);
  } catch (error) {
    if (error instanceof HttpError) return { message: error.message };
    throw error;
  }
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: {
      organizationMembers: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!user || !(await checkPassword(parsed.data.password, user.passwordHash)))
    return { message: "E-mail ou senha incorretos." };
  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.organizationMembers[0]?.role ?? "VIEWER",
    sessionVersion: user.sessionVersion,
  });
  redirect(user.organizationMembers.length ? "/dashboard" : "/onboarding");
}

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const passwordHash = await hashPassword(parsed.data.password);
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      return createWorkspaceAccount(tx, {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return { message: "Já existe uma conta com este e-mail." };
    throw error;
  }
  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: "OWNER",
    sessionVersion: user.sessionVersion,
  });
  redirect("/onboarding");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
