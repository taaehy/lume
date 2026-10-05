import "server-only";

import type { BugStatus, Prisma, Priority, Severity } from "@prisma/client";

import { workspaceScope } from "@/lib/data/scope";
import { HttpError } from "@/lib/http-error";
import { allowedTransitions } from "@/lib/domain/bug-workflow";
import { type Capability } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";

const bugListSelect = {
  id: true,
  friendlyId: true,
  title: true,
  module: true,
  status: true,
  priority: true,
  qualityScore: true,
  updatedAt: true,
  assignee: { select: { name: true } },
} satisfies Prisma.BugSelect;

export type BugListDTO = Prisma.BugGetPayload<{
  select: typeof bugListSelect;
}>;

async function authorizeProjectAccess(input: {
  organizationId: string;
  projectId: string;
  capability: Capability;
}) {
  const scope = await workspaceScope(input.projectId, input.capability);
  if (scope.organizationId !== input.organizationId)
    throw new HttpError(403, "Acesso não autorizado.");
  return scope.user;
}

export async function getCurrentProjectContext() {
  return workspaceScope();
}

export async function listProjectBugs(input: {
  organizationId: string;
  projectId: string;
  search?: string;
  status?: BugStatus;
  priority?: Priority;
  limit?: number;
  offset?: number;
}): Promise<BugListDTO[]> {
  await authorizeProjectAccess({
    organizationId: input.organizationId,
    projectId: input.projectId,
    capability: "project:read",
  });
  const search = input.search?.trim();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  return prisma.bug.findMany({
    where: {
      projectId: input.projectId,
      project: { organizationId: input.organizationId },
      status: input.status,
      priority: input.priority,
      ...(search
        ? {
            OR: [
              { friendlyId: { contains: search, mode: "insensitive" } },
              { title: { contains: search, mode: "insensitive" } },
              { module: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: bugListSelect,
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: limit,
    skip: input.offset ?? 0,
  });
}

export async function getProjectBug(input: {
  organizationId: string;
  projectId: string;
  friendlyId: string;
}) {
  await authorizeProjectAccess({
    organizationId: input.organizationId,
    projectId: input.projectId,
    capability: "project:read",
  });
  return prisma.bug.findFirst({
    where: {
      friendlyId: input.friendlyId,
      projectId: input.projectId,
      project: { organizationId: input.organizationId },
    },
    select: {
      id: true,
      friendlyId: true,
      title: true,
      description: true,
      module: true,
      environment: true,
      version: true,
      priority: true,
      severity: true,
      status: true,
      reproductionSteps: true,
      expectedResult: true,
      actualResult: true,
      technicalContext: true,
      qualityScore: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      comments: {
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        select: {
          id: true,
          name: true,
          kind: true,
          mimeType: true,
          sizeBytes: true,
          externalUrl: true,
        },
        orderBy: { createdAt: "asc" },
      },
      history: {
        select: {
          id: true,
          type: true,
          field: true,
          fromValue: true,
          toValue: true,
          createdAt: true,
          actor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export type CreateBugRecordInput = {
  organizationId: string;
  projectId: string;
  title: string;
  description: string;
  module: string;
  environment?: string;
  version?: string;
  priority: Priority;
  severity: Severity;
  reproductionSteps: readonly string[];
  expectedResult?: string;
  actualResult?: string;
  technicalContext?: string;
  qualityScore: number;
  qualityBreakdown: Prisma.InputJsonValue;
};

export async function createBugRecord(input: CreateBugRecordInput) {
  const session = await authorizeProjectAccess({
    organizationId: input.organizationId,
    projectId: input.projectId,
    capability: "bug:write",
  });

  return prisma.$transaction(async (transaction) => {
    const project = await transaction.project.update({
      where: {
        id: input.projectId,
        organizationId: input.organizationId,
      },
      data: { bugSequence: { increment: 1 } },
      select: { key: true, bugSequence: true },
    });
    const friendlyId = `${project.key}-${project.bugSequence}`;

    return transaction.bug.create({
      data: {
        projectId: input.projectId,
        friendlyId,
        title: input.title,
        description: input.description,
        module: input.module,
        environment: input.environment,
        version: input.version,
        priority: input.priority,
        severity: input.severity,
        status: "OPEN",
        authorId: session.id,
        reproductionSteps: [...input.reproductionSteps],
        expectedResult: input.expectedResult,
        actualResult: input.actualResult,
        technicalContext: input.technicalContext,
        qualityScore: input.qualityScore,
        qualityBreakdown: input.qualityBreakdown,
        history: {
          create: {
            actorId: session.id,
            type: "CREATED",
            toValue: "OPEN",
          },
        },
      },
      select: { id: true, friendlyId: true },
    });
  });
}

export async function updateBugStatusRecord(input: {
  organizationId: string;
  projectId: string;
  friendlyId: string;
  status: BugStatus;
  reason?: string;
}) {
  const session = await authorizeProjectAccess({
    organizationId: input.organizationId,
    projectId: input.projectId,
    capability: input.status === "CLOSED" ? "bug:close" : "bug:write",
  });
  return prisma.$transaction(async (tx) => {
    const bug = await tx.bug.findFirst({
      where: { friendlyId: input.friendlyId, projectId: input.projectId },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        assigneeId: true,
        resolvedAt: true,
      },
    });
    if (!bug) throw new HttpError(404, "Bug não encontrado.");
    if (!allowedTransitions(bug.status).includes(input.status))
      throw new HttpError(422, "Esta mudança de status não é permitida.");
    if (input.status === "REOPENED" && (input.reason?.trim().length ?? 0) < 10)
      throw new HttpError(
        422,
        "Informe um motivo de reabertura com pelo menos 10 caracteres.",
      );
    const changed = await tx.bug.updateMany({
      where: { id: bug.id, updatedAt: bug.updatedAt, status: bug.status },
      data: {
        status: input.status,
        resolvedAt:
          input.status === "RESOLVED"
            ? new Date()
            : input.status === "CLOSED"
              ? bug.resolvedAt
              : null,
        closedAt: input.status === "CLOSED" ? new Date() : null,
      },
    });
    if (!changed.count)
      throw new HttpError(
        409,
        "O bug mudou durante a operação. Atualize a página.",
      );
    await tx.bugHistory.create({
      data: {
        bugId: bug.id,
        actorId: session.id,
        type: "STATUS_CHANGED",
        field: "status",
        fromValue: bug.status,
        toValue: input.status,
        metadata: input.reason ? { reason: input.reason.trim() } : undefined,
      },
    });
    if (bug.assigneeId && bug.assigneeId !== session.id)
      await tx.notification.create({
        data: {
          organizationId: input.organizationId,
          userId: bug.assigneeId,
          type: "BUG_STATUS",
          title: `${input.friendlyId}: status alterado`,
          body: `Novo status: ${input.status}`,
          href: `/bugs/${input.friendlyId}`,
        },
      });
    return { friendlyId: input.friendlyId, status: input.status };
  });
}
