import "server-only";
import { Prisma, BugStatus, Priority } from "@prisma/client";
import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { workspaceScope } from "@/lib/data/scope";
import { getAuthenticatedUser } from "@/lib/auth/dal";
import { createSession } from "@/lib/auth/session";
import { checkPassword, hashPassword } from "@/lib/auth/password";
import {
  createBugRecord,
  getProjectBug,
  updateBugStatusRecord,
} from "@/lib/data/bugs";
import { calculateQualityScore } from "@/lib/domain/quality-score";
import { findRelatedBugs } from "@/lib/domain/related-bugs";
import { projectSummary, releaseReadiness } from "@/lib/data/summary";
import { bugReportSchema } from "@/lib/validation/bug";
import { HttpError } from "@/lib/http-error";
import { appOrigin } from "@/lib/auth/providers";
import { emailConfigured, sendTransactionalEmail } from "@/lib/email";

const nonempty = z.string().trim().min(2).max(160);
const roles = z.enum(["OWNER", "ADMIN", "QA", "DEVELOPER", "VIEWER"]);
const storage = path.resolve(
  /* turbopackIgnore: true */
  process.env.LUME_STORAGE_PATH || path.join(process.cwd(), ".storage"),
);
const json = (data: unknown, status = 200) =>
  Response.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
const tokenDigest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const fileTypes: Record<string, string> = {
  "image/png": "IMAGE",
  "image/jpeg": "IMAGE",
  "image/webp": "IMAGE",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "application/pdf": "FILE",
  "text/plain": "FILE",
  "application/json": "FILE",
};

export async function handleApi(request: Request, segments: string[]) {
  try {
    const method = request.method;
    const url = new URL(request.url);
    const [resource, id, operation] = segments;
    if (segments.length > 3)
      throw new HttpError(404, "Endpoint não encontrado.");
    if (method !== "GET") {
      const origin = request.headers.get("origin");
      if (
        (origin && origin !== url.origin) ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        throw new HttpError(403, "Origem da requisição não autorizada.");
      if (Number(request.headers.get("content-length") ?? 0) > 25 * 1024 * 1024)
        throw new HttpError(413, "Envio limitado a 25 MB.");
    }
    const user = await getAuthenticatedUser();
    if (!user) throw new HttpError(401, "Entre para continuar.");
    const readBody = async () => {
      if (!request.headers.get("content-type")?.includes("application/json"))
        throw new HttpError(415, "Envie JSON.");
      try {
        return await request.json();
      } catch {
        throw new HttpError(400, "JSON inválido.");
      }
    };
    if (resource === "health" && method === "GET") {
      await prisma.$queryRaw`SELECT 1`;
      return json({ status: "ok", database: "connected" });
    }
    if (resource === "profile") {
      if (method === "GET") return json(user);
      if (method === "PATCH") {
        const body = z
          .object({
            name: nonempty,
            email: z.email().transform((v) => v.toLowerCase()),
            currentPassword: z.string().max(128).optional(),
            password: z.string().min(10).max(128).optional(),
          })
          .parse(await readBody());
        if (body.password || body.email !== user.email) {
          const current = await prisma.user.findUniqueOrThrow({
            where: { id: user.id },
            select: { passwordHash: true },
          });
          if (
            !(await checkPassword(
              body.currentPassword ?? "",
              current.passwordHash,
            ))
          )
            throw new HttpError(422, "Confirme sua senha atual.");
        }
        const changed = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: body.name,
            email: body.email,
            ...(body.password
              ? {
                  passwordHash: await hashPassword(body.password),
                  sessionVersion: { increment: 1 },
                }
              : {}),
          },
          select: { id: true, name: true, email: true, sessionVersion: true },
        });
        await createSession({ ...changed, role: user.role });
        return json(changed);
      }
    }
    if (
      resource === "invitations" &&
      method === "POST" &&
      /^[a-f0-9]{64}$/.test(id ?? "")
    ) {
      const invite = await prisma.invitation.findUnique({
        where: { tokenHash: tokenDigest(id) },
      });
      if (!invite || invite.acceptedAt || invite.expiresAt <= new Date())
        throw new HttpError(410, "Convite inválido, utilizado ou expirado.");
      if (invite.email !== user.email)
        throw new HttpError(403, "Entre com o e-mail que recebeu o convite.");
      await prisma.$transaction(async (tx) => {
        const consumed = await tx.invitation.updateMany({
          where: {
            id: invite.id,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { acceptedAt: new Date() },
        });
        if (!consumed.count)
          throw new HttpError(409, "O convite já foi utilizado.");
        const project = await tx.project.findFirst({
          where: {
            id: invite.projectId,
            organizationId: invite.organizationId,
          },
        });
        if (!project)
          throw new HttpError(410, "O projeto do convite não existe mais.");
        await tx.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: invite.organizationId,
              userId: user.id,
            },
          },
          update: {},
          create: {
            organizationId: invite.organizationId,
            userId: user.id,
            role: invite.role,
          },
        });
        await tx.projectMember.upsert({
          where: {
            projectId_userId: { projectId: invite.projectId, userId: user.id },
          },
          update: {},
          create: {
            projectId: invite.projectId,
            userId: user.id,
            role: invite.role === "OWNER" ? "ADMIN" : invite.role,
          },
        });
      });
      (await cookies()).set("lume_project", invite.projectId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 604800,
      });
      return json({ accepted: true });
    }
    const scope = await workspaceScope(
      url.searchParams.get("projectId") ?? undefined,
    );
    const authorize = async (
      capability: Parameters<typeof workspaceScope>[1],
    ) => workspaceScope(scope.projectId, capability);
    const bugRecord = async () => {
      const bug = await prisma.bug.findFirst({
        where: { friendlyId: id, projectId: scope.projectId },
      });
      if (!bug) throw new HttpError(404, "Bug não encontrado.");
      return bug;
    };
    if (resource === "workspace") {
      if (method === "GET") return json(scope);
      if (method === "PATCH") {
        await authorize("organization:manage");
        const body = z
          .object({ organizationName: nonempty, projectName: nonempty })
          .parse(await readBody());
        await prisma.$transaction([
          prisma.organization.update({
            where: { id: scope.organizationId },
            data: { name: body.organizationName },
          }),
          prisma.project.update({
            where: { id: scope.projectId },
            data: { name: body.projectName },
          }),
        ]);
        return json({ saved: true });
      }
    }
    if (resource === "summary" && method === "GET")
      return json(await projectSummary(scope.projectId));
    if (resource === "projects") {
      if (method === "GET")
        return json(
          await prisma.project.findMany({
            where: {
              organizationId: scope.organizationId,
              members: { some: { userId: user.id } },
            },
            select: {
              id: true,
              name: true,
              key: true,
              description: true,
              _count: {
                select: { bugs: true, testCases: true, members: true },
              },
            },
            orderBy: { createdAt: "asc" },
          }),
        );
      if (method === "POST" && !id) {
        await authorize("project:manage");
        const body = z
          .object({
            name: nonempty,
            key: z
              .string()
              .trim()
              .regex(/^[A-Z][A-Z0-9]{1,11}$/),
            description: z.string().max(2000).optional(),
          })
          .parse(await readBody());
        return json(
          await prisma.project.create({
            data: {
              ...body,
              organizationId: scope.organizationId,
              members: { create: { userId: user.id, role: "ADMIN" } },
            },
            select: { id: true, name: true, key: true },
          }),
          201,
        );
      }
      if (method === "POST" && operation === "select") {
        await workspaceScope(id);
        (await cookies()).set("lume_project", id, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 604800,
        });
        return json({ selected: id });
      }
      if (method === "PATCH" && id) {
        await workspaceScope(id, "project:manage");
        const body = z
          .object({
            name: nonempty,
            description: z.string().max(2000).optional(),
          })
          .parse(await readBody());
        return json(
          await prisma.project.update({
            where: { id },
            data: body,
            select: { id: true, name: true, description: true },
          }),
        );
      }
    }
    if (resource === "bugs") {
      if (method === "GET" && !id) {
        const query = z
          .object({
            page: z.coerce.number().int().min(1).default(1),
            limit: z.coerce.number().int().min(1).max(100).default(20),
            search: z.string().max(160).optional(),
            status: z.enum(BugStatus).optional(),
            priority: z.enum(Priority).optional(),
          })
          .parse(Object.fromEntries(url.searchParams));
        const where: Prisma.BugWhereInput = {
          projectId: scope.projectId,
          status: query.status,
          priority: query.priority,
          ...(query.search
            ? {
                OR: [
                  { title: { contains: query.search, mode: "insensitive" } },
                  {
                    friendlyId: { contains: query.search, mode: "insensitive" },
                  },
                  { module: { contains: query.search, mode: "insensitive" } },
                ],
              }
            : {}),
        };
        const [items, total] = await Promise.all([
          prisma.bug.findMany({
            where,
            select: {
              id: true,
              friendlyId: true,
              title: true,
              status: true,
              module: true,
              priority: true,
              updatedAt: true,
              qualityScore: true,
              assignee: { select: { id: true, name: true } },
            },
            orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
            take: query.limit,
            skip: (query.page - 1) * query.limit,
          }),
          prisma.bug.count({ where }),
        ]);
        return json({ items, total, page: query.page, limit: query.limit });
      }
      if (method === "GET" && id === "related") {
        const report = z
          .object({ title: z.string().max(160), module: z.string().max(160) })
          .parse(Object.fromEntries(url.searchParams));
        const candidates = await prisma.bug.findMany({
          where: { projectId: scope.projectId },
          select: {
            friendlyId: true,
            title: true,
            description: true,
            module: true,
          },
          take: 500,
          orderBy: { updatedAt: "desc" },
        });
        return json(
          findRelatedBugs(
            report,
            candidates.map((b) => ({ ...b, id: b.friendlyId })),
          ).slice(0, 5),
        );
      }
      if (method === "GET" && id) {
        const detail = await getProjectBug({ ...scope, friendlyId: id });
        if (!detail) throw new HttpError(404, "Bug não encontrado.");
        return json(detail);
      }
      if (method === "POST" && !id) {
        await authorize("bug:write");
        const body = bugReportSchema.parse(await readBody());
        const quality = calculateQualityScore({ ...body, evidenceCount: 0 });
        return json(
          await createBugRecord({
            ...scope,
            ...body,
            qualityScore: quality.score,
            qualityBreakdown: { version: 1, criteria: quality.criteria },
          }),
          201,
        );
      }
      if (method === "PATCH" && operation === "status") {
        const body = z
          .object({
            status: z.enum(BugStatus),
            reason: z.string().max(2000).optional(),
          })
          .parse(await readBody());
        return json(
          await updateBugStatusRecord({ ...scope, friendlyId: id, ...body }),
        );
      }
      if (method === "PATCH" && id && !operation) {
        await authorize("bug:write");
        const body = bugReportSchema
          .omit({ evidenceCount: true })
          .partial()
          .extend({
            assigneeId: z.string().nullable().optional(),
            releaseId: z.string().nullable().optional(),
          })
          .parse(await readBody());
        const bug = await bugRecord();
        if (
          body.assigneeId &&
          !(await prisma.projectMember.findUnique({
            where: {
              projectId_userId: {
                projectId: scope.projectId,
                userId: body.assigneeId,
              },
            },
          }))
        )
          throw new HttpError(422, "Responsável não pertence ao projeto.");
        if (
          body.releaseId &&
          !(await prisma.release.findFirst({
            where: { id: body.releaseId, projectId: scope.projectId },
          }))
        )
          throw new HttpError(422, "Release não pertence ao projeto.");
        const count = await prisma.bugAttachment.count({
          where: { bugId: bug.id },
        });
        const quality = calculateQualityScore({
          ...bug,
          ...body,
          environment: body.environment ?? bug.environment ?? undefined,
          version: body.version ?? bug.version ?? undefined,
          expectedResult:
            body.expectedResult ?? bug.expectedResult ?? undefined,
          actualResult: body.actualResult ?? bug.actualResult ?? undefined,
          technicalContext:
            body.technicalContext ?? bug.technicalContext ?? undefined,
          reproductionSteps:
            body.reproductionSteps ?? (bug.reproductionSteps as string[]),
          evidenceCount: count,
        });
        await prisma.$transaction(async (tx) => {
          const result = await tx.bug.updateMany({
            where: { id: bug.id, updatedAt: bug.updatedAt },
            data: {
              ...body,
              qualityScore: quality.score,
              qualityBreakdown: { version: 1, criteria: quality.criteria },
            },
          });
          if (!result.count)
            throw new HttpError(
              409,
              "O registro mudou. Atualize e tente novamente.",
            );
          await tx.bugHistory.createMany({
            data: Object.entries(body).map(([field, value]) => ({
              bugId: bug.id,
              actorId: user.id,
              type: "FIELD_CHANGED",
              field,
              fromValue: JSON.stringify(bug[field as keyof typeof bug]),
              toValue: JSON.stringify(value),
            })),
          });
          if (body.assigneeId && body.assigneeId !== user.id)
            await tx.notification.create({
              data: {
                organizationId: scope.organizationId,
                userId: body.assigneeId,
                type: "ASSIGNED",
                title: `${id} atribuído a você`,
                body: bug.title,
                href: `/bugs/${id}`,
              },
            });
        });
        return json({ saved: true });
      }
      if (method === "POST" && operation === "comments") {
        await authorize("bug:write");
        const bug = await bugRecord();
        const body = z
          .object({ body: z.string().trim().min(1).max(4000) })
          .parse(await readBody());
        return json(
          await prisma.$transaction(async (tx) => {
            const comment = await tx.bugComment.create({
              data: { bugId: bug.id, authorId: user.id, body: body.body },
              select: { id: true, body: true },
            });
            await tx.bugHistory.create({
              data: {
                bugId: bug.id,
                actorId: user.id,
                type: "COMMENTED",
                toValue: comment.id,
              },
            });
            return comment;
          }),
          201,
        );
      }
      if (method === "POST" && operation === "attachments") {
        await authorize("bug:write");
        const bug = await bugRecord();
        if (
          !request.headers.get("content-type")?.includes("multipart/form-data")
        )
          throw new HttpError(415, "Envie um arquivo.");
        const form = await request.formData();
        const file = form.get("file");
        if (
          !(file instanceof File) ||
          file.size < 1 ||
          file.size > 20 * 1024 * 1024 ||
          !(file.type in fileTypes)
        )
          throw new HttpError(
            422,
            "Arquivo não permitido. Use PNG, JPEG, WebP, MP4, WebM, PDF, TXT ou JSON, até 20 MB.",
          );
        const bytes = Buffer.from(await file.arrayBuffer());
        if (
          (file.type === "image/png" &&
            bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") ||
          (file.type === "image/jpeg" &&
            bytes.subarray(0, 3).toString("hex") !== "ffd8ff") ||
          (file.type === "image/webp" &&
            (bytes.toString("ascii", 0, 4) !== "RIFF" ||
              bytes.toString("ascii", 8, 12) !== "WEBP")) ||
          (file.type === "application/pdf" &&
            bytes.toString("ascii", 0, 5) !== "%PDF-") ||
          (file.type === "video/mp4" &&
            bytes.toString("ascii", 4, 8) !== "ftyp") ||
          (file.type === "video/webm" &&
            bytes.subarray(0, 4).toString("hex") !== "1a45dfa3")
        )
          throw new HttpError(
            422,
            "O conteúdo não corresponde ao tipo informado.",
          );
        const key = randomUUID();
        const destination = path.join(/* turbopackIgnore: true */ storage, key);
        await mkdir(storage, { recursive: true });
        await writeFile(destination, bytes, { flag: "wx" });
        try {
          const attachment = await prisma.$transaction(
            async (tx) => {
              if (
                (await tx.bugAttachment.count({ where: { bugId: bug.id } })) >=
                10
              )
                throw new HttpError(422, "Limite de 10 evidências por bug.");
              const saved = await tx.bugAttachment.create({
                data: {
                  bugId: bug.id,
                  storageKey: key,
                  name: path.basename(file.name).slice(0, 180),
                  kind: fileTypes[file.type] as "IMAGE" | "VIDEO" | "FILE",
                  mimeType: file.type,
                  sizeBytes: file.size,
                },
              });
              const count = await tx.bugAttachment.count({
                where: { bugId: bug.id },
              });
              const quality = calculateQualityScore({
                ...bug,
                environment: bug.environment ?? undefined,
                version: bug.version ?? undefined,
                expectedResult: bug.expectedResult ?? undefined,
                actualResult: bug.actualResult ?? undefined,
                technicalContext: bug.technicalContext ?? undefined,
                reproductionSteps: bug.reproductionSteps as string[],
                evidenceCount: count,
              });
              await tx.bug.update({
                where: { id: bug.id },
                data: {
                  qualityScore: quality.score,
                  qualityBreakdown: { version: 1, criteria: quality.criteria },
                },
              });
              await tx.bugHistory.create({
                data: {
                  bugId: bug.id,
                  actorId: user.id,
                  type: "ATTACHMENT_ADDED",
                  toValue: saved.name,
                },
              });
              return { id: saved.id, name: saved.name };
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          );
          return json(attachment, 201);
        } catch (error) {
          await unlink(destination);
          throw error;
        }
      }
    }
    if (resource === "attachments" && method === "GET" && id) {
      const item = await prisma.bugAttachment.findFirst({
        where: { id, bug: { projectId: scope.projectId } },
      });
      if (!item?.storageKey || !/^[a-f0-9-]{36}$/.test(item.storageKey))
        throw new HttpError(404, "Arquivo não encontrado.");
      let bytes;
      try {
        bytes = await readFile(
          /* turbopackIgnore: true */
          path.join(/* turbopackIgnore: true */ storage, item.storageKey),
        );
      } catch {
        throw new HttpError(404, "Arquivo indisponível no armazenamento.");
      }
      return new Response(bytes, {
        headers: {
          "Content-Type": item.mimeType ?? "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (resource === "tests") {
      if (method === "GET")
        return json(
          await prisma.testCase.findMany({
            where: { projectId: scope.projectId },
            include: {
              steps: { orderBy: { position: "asc" } },
              executions: { orderBy: { createdAt: "desc" }, take: 1 },
            },
            orderBy: { createdAt: "asc" },
          }),
        );
      if (method === "POST" && !id) {
        await authorize("test:manage");
        const body = z
          .object({
            title: nonempty,
            module: nonempty,
            priority: z.enum(Priority),
            steps: z
              .array(
                z.object({
                  action: z.string().trim().min(3).max(2000),
                  expectedResult: z.string().trim().min(3).max(2000),
                }),
              )
              .min(1)
              .max(50),
          })
          .parse(await readBody());
        const created = await prisma.$transaction(async (tx) => {
          const project = await tx.project.update({
            where: { id: scope.projectId },
            data: { testSequence: { increment: 1 } },
          });
          return tx.testCase.create({
            data: {
              projectId: scope.projectId,
              friendlyId: `TC-${project.testSequence}`,
              title: body.title,
              module: body.module,
              priority: body.priority,
              steps: {
                create: body.steps.map((step, index) => ({
                  ...step,
                  position: index + 1,
                })),
              },
            },
          });
        });
        return json(created, 201);
      }
    }
    if (resource === "runs") {
      if (method === "GET")
        return json(
          await prisma.testRun.findMany({
            where: { projectId: scope.projectId },
            include: {
              executions: {
                include: {
                  testCase: { select: { friendlyId: true, title: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        );
      if (method === "POST") {
        await authorize("test:manage");
        const body = z
          .object({
            name: nonempty,
            releaseId: z.string().nullable().optional(),
          })
          .parse(await readBody());
        if (
          body.releaseId &&
          !(await prisma.release.findFirst({
            where: {
              id: body.releaseId,
              projectId: scope.projectId,
              releasedAt: null,
            },
          }))
        )
          throw new HttpError(422, "Release inválida ou já publicada.");
        const cases = await prisma.testCase.findMany({
          where: { projectId: scope.projectId },
          select: { id: true },
        });
        if (!cases.length)
          throw new HttpError(422, "Crie um caso de teste antes da execução.");
        return json(
          await prisma.testRun.create({
            data: {
              projectId: scope.projectId,
              name: body.name,
              releaseId: body.releaseId,
              executions: {
                create: cases.map((test) => ({ testCaseId: test.id })),
              },
            },
            select: { id: true, name: true },
          }),
          201,
        );
      }
    }
    if (resource === "executions" && method === "POST" && operation === "bug") {
      await authorize("bug:write");
      const body = z.object({ friendlyId: nonempty }).parse(await readBody());
      const execution = await prisma.testExecution.findFirst({
        where: {
          id,
          status: "FAILED",
          testRun: { projectId: scope.projectId },
        },
      });
      const bug = await prisma.bug.findFirst({
        where: { friendlyId: body.friendlyId, projectId: scope.projectId },
      });
      if (!execution || !bug)
        throw new HttpError(
          422,
          "Vincule um bug do projeto a uma execução com falha.",
        );
      await prisma.$transaction(async (tx) => {
        const changed = await tx.testExecution.updateMany({
          where: { id, status: "FAILED", generatedBugId: null },
          data: { generatedBugId: bug.id },
        });
        if (!changed.count)
          throw new HttpError(
            409,
            "A execução mudou ou já possui um bug vinculado.",
          );
        await tx.bugHistory.create({
          data: {
            bugId: bug.id,
            actorId: user.id,
            type: "LINKED_TEST",
            toValue: execution.id,
          },
        });
      });
      return json({ linked: true });
    }
    if (resource === "executions" && method === "PATCH" && !operation) {
      await authorize("test:manage");
      const body = z
        .object({
          status: z.enum(["PASSED", "FAILED", "BLOCKED", "NOT_TESTED"]),
          notes: z.string().max(4000).optional(),
        })
        .parse(await readBody());
      const execution = await prisma.testExecution.findFirst({
        where: { id, testRun: { projectId: scope.projectId } },
        include: {
          testRun: { select: { release: { select: { releasedAt: true } } } },
        },
      });
      if (!execution) throw new HttpError(404, "Execução não encontrada.");
      if (execution.testRun.release?.releasedAt)
        throw new HttpError(
          409,
          "Resultados de uma release publicada não podem ser alterados.",
        );
      const result = await prisma.$transaction(async (tx) => {
        const changed = await tx.testExecution.update({
          where: { id },
          data: {
            ...body,
            executorId: user.id,
            executedAt: body.status === "NOT_TESTED" ? null : new Date(),
          },
        });
        const pending = await tx.testExecution.count({
          where: { testRunId: execution.testRunId, status: "NOT_TESTED" },
        });
        await tx.testRun.update({
          where: { id: execution.testRunId },
          data: { completedAt: pending ? null : new Date() },
        });
        return changed;
      });
      return json(result);
    }
    if (resource === "releases") {
      if (method === "GET") {
        const items = await prisma.release.findMany({
          where: { projectId: scope.projectId },
          orderBy: { createdAt: "desc" },
        });
        return json(
          await Promise.all(
            items.map(async (item) => ({
              ...item,
              readiness: await releaseReadiness(scope.projectId, item.id),
            })),
          ),
        );
      }
      if (method === "POST" && !id) {
        await authorize("release:manage");
        const body = z
          .object({ name: nonempty, version: z.string().trim().min(1).max(80) })
          .parse(await readBody());
        return json(
          await prisma.release.create({
            data: {
              ...body,
              projectId: scope.projectId,
              qualityScore: 0,
              scoringBreakdown: {},
            },
          }),
          201,
        );
      }
      if (method === "POST" && operation === "publish") {
        await authorize("release:manage");
        const release = await prisma.release.findFirst({
          where: { id, projectId: scope.projectId },
        });
        if (!release) throw new HttpError(404, "Release não encontrada.");
        if (release.releasedAt)
          throw new HttpError(409, "Release já publicada.");
        const saved = await prisma.$transaction(
          async (tx) => {
            const quality = await releaseReadiness(scope.projectId, id, tx);
            if (!quality.canPublish)
              throw new HttpError(
                422,
                "Release bloqueada: conclua os testes e resolva os bugs críticos.",
              );
            const result = await tx.release.update({
              where: { id },
              data: {
                status: quality.status,
                qualityScore: quality.score,
                scoringBreakdown: { version: 1, criteria: quality.breakdown },
                testsTotal: quality.testsTotal,
                testsPassed: quality.testsPassed,
                testsFailed: quality.testsFailed,
                testsBlocked: quality.testsBlocked,
                openCriticalBugs: quality.openCriticalBugs,
                releasedAt: new Date(),
              },
            });
            await tx.notification.create({
              data: {
                organizationId: scope.organizationId,
                userId: user.id,
                type: "RELEASE",
                title: `Release ${release.version} publicada`,
                body: release.name,
                href: "/releases",
              },
            });
            return result;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        return json(saved);
      }
    }
    if (resource === "notifications") {
      if (method === "GET")
        return json(
          await prisma.notification.findMany({
            where: { userId: user.id, organizationId: scope.organizationId },
            orderBy: { createdAt: "desc" },
            take: 100,
          }),
        );
      if (method === "PATCH") {
        const changed = await prisma.notification.updateMany({
          where: {
            userId: user.id,
            organizationId: scope.organizationId,
            ...(id ? { id } : {}),
          },
          data: { readAt: new Date() },
        });
        return json({ updated: changed.count });
      }
    }
    if (resource === "team") {
      if (method === "GET")
        return json(
          await prisma.organizationMember.findMany({
            where: { organizationId: scope.organizationId },
            select: {
              id: true,
              role: true,
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "asc" },
          }),
        );
      if (method === "POST") {
        await authorize("member:manage");
        const body = z
          .object({
            email: z.email().transform((v) => v.toLowerCase()),
            role: roles,
            delivery: z.enum(["link", "email"]).default("link"),
          })
          .parse(await readBody());
        if (body.role === "OWNER" && scope.role !== "OWNER")
          throw new HttpError(
            403,
            "Somente a pessoa proprietária pode conceder este papel.",
          );
        if (body.delivery === "email" && !emailConfigured())
          throw new HttpError(
            503,
            "Configure o serviço de e-mail antes de enviar convites.",
          );
        const token = randomBytes(32).toString("hex");
        const invite = await prisma.invitation.create({
          data: {
            organizationId: scope.organizationId,
            projectId: scope.projectId,
            email: body.email,
            role: body.role,
            tokenHash: tokenDigest(token),
            expiresAt: new Date(Date.now() + 7 * 86400000),
          },
        });
        const invitationUrl = `${appOrigin()}/convite/${token}`;
        if (body.delivery === "email")
          await sendTransactionalEmail({
            to: body.email,
            subject: "Convite para o Lume",
            text: `Você recebeu um convite para ${scope.projectName}. Entre ou crie uma conta com este e-mail e aceite o convite em até sete dias:\n\n${invitationUrl}`,
            idempotencyKey: "invitation-" + invite.id,
          });
        return json(
          {
            invitationUrl,
            expiresInDays: 7,
            message:
              body.delivery === "email"
                ? "Convite criado e enviado por e-mail."
                : "Convite criado. Compartilhe o link abaixo.",
          },
          201,
        );
      }
    }
    throw new HttpError(404, "Endpoint não encontrado.");
  } catch (error) {
    if (error instanceof HttpError)
      return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError)
      return Response.json(
        { error: error.issues[0]?.message ?? "Dados inválidos." },
        { status: 422 },
      );
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        return Response.json(
          { error: "Este e-mail, identificador ou versão já existe." },
          { status: 409 },
        );
      if (error.code === "P2034")
        return Response.json(
          { error: "Outra operação alterou os dados. Tente novamente." },
          { status: 409 },
        );
    }
    console.error(
      "Falha na API Lume",
      error instanceof Error ? error.name : "UnknownError",
    );
    return Response.json(
      { error: "Não foi possível concluir a operação." },
      { status: 500 },
    );
  }
}
