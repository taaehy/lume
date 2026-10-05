import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/permissions";

export const getAuthenticatedUser = cache(async () => {
  const token = (await cookies()).get(sessionCookieName)?.value;
  const session = verifySessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      sessionVersion: true,
      organizationMembers: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { role: true },
      },
    },
  });
  if (!user || user.sessionVersion !== (session.sessionVersion ?? 0))
    return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    sessionVersion: user.sessionVersion,
    role: (user.organizationMembers[0]?.role ?? "VIEWER") as Role,
  };
});

export const verifySession = cache(async () => {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return user;
});
