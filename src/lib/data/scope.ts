import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUser } from "@/lib/auth/dal";
import { can, type Capability, type Role } from "@/lib/auth/permissions";
import { HttpError } from "@/lib/http-error";

export async function workspaceScope(
  projectId?: string,
  capability: Capability = "project:read",
) {
  const user = await getAuthenticatedUser();
  if (!user) throw new HttpError(401, "Entre para continuar.");
  const preferred = projectId ?? (await cookies()).get("lume_project")?.value;
  const query = {
    members: { some: { userId: user.id } },
    organization: { members: { some: { userId: user.id } } },
  };
  let project = await prisma.project.findFirst({
    where: { ...query, ...(preferred ? { id: preferred } : {}) },
    orderBy: { createdAt: "asc" },
    include: {
      members: { where: { userId: user.id } },
      organization: { include: { members: { where: { userId: user.id } } } },
    },
  });
  if (!project && preferred && !projectId)
    project = await prisma.project.findFirst({
      where: query,
      orderBy: { createdAt: "asc" },
      include: {
        members: { where: { userId: user.id } },
        organization: { include: { members: { where: { userId: user.id } } } },
      },
    });
  if (!project)
    throw new HttpError(404, "Projeto não encontrado ou sem acesso.");
  const role = project.organization.members[0].role;
  const projectRole: Role = project.members[0].role;
  const organizationOperation = [
    "organization:manage",
    "member:manage",
    "project:manage",
  ].includes(capability);
  if (
    !can(role, capability) ||
    (!organizationOperation && !can(projectRole, capability))
  )
    throw new HttpError(403, "Seu perfil não permite esta operação.");
  return {
    user,
    role,
    projectRole,
    projectId: project.id,
    projectName: project.name,
    projectKey: project.key,
    organizationId: project.organizationId,
    organizationName: project.organization.name,
  };
}
