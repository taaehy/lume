import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
export async function createWorkspaceAccount(
  tx: Prisma.TransactionClient,
  input: {
    name: string;
    email: string;
    passwordHash?: string;
    emailVerified?: Date;
  },
) {
  const user = await tx.user.create({ data: input });
  await tx.organization.create({
    data: {
      name: `Workspace de ${user.name}`,
      slug: `workspace-${randomBytes(10).toString("hex")}`,
      members: { create: { userId: user.id, role: "OWNER" } },
      projects: {
        create: {
          name: "Meu projeto",
          key: `LUM${randomBytes(5).toString("hex").toUpperCase()}`,
          members: { create: { userId: user.id, role: "ADMIN" } },
        },
      },
    },
  });
  return user;
}
