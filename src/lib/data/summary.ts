import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { calculateReleaseQuality } from "@/lib/domain/release-quality";

const active = (status: string) => !["RESOLVED", "CLOSED"].includes(status);

export async function releaseReadiness(
  projectId: string,
  releaseId: string,
  db: Prisma.TransactionClient = prisma,
) {
  const [bugs, tests] = await Promise.all([
    db.bug.findMany({
      where: { projectId, releaseId },
      select: { priority: true, status: true, severity: true },
    }),
    db.testExecution.findMany({
      where: { testRun: { projectId, releaseId } },
      select: { status: true },
    }),
  ]);
  const quality = calculateReleaseQuality({
    testsTotal: tests.length,
    testsPassed: tests.filter((t) => t.status === "PASSED").length,
    testsFailed: tests.filter((t) => t.status === "FAILED").length,
    testsBlocked: tests.filter((t) => t.status === "BLOCKED").length,
    openCriticalBugs: bugs.filter(
      (b) => active(b.status) && b.priority === "CRITICAL",
    ).length,
    openHighBugs: bugs.filter((b) => active(b.status) && b.priority === "HIGH")
      .length,
    reopenedBugs: bugs.filter((b) => b.status === "REOPENED").length,
    unresolvedRegressions: bugs.filter(
      (b) => active(b.status) && b.severity === "BLOCKER",
    ).length,
  });
  return {
    ...quality,
    testsTotal: tests.length,
    testsPassed: tests.filter((t) => t.status === "PASSED").length,
    testsFailed: tests.filter((t) => t.status === "FAILED").length,
    testsBlocked: tests.filter((t) => t.status === "BLOCKED").length,
    openCriticalBugs: bugs.filter(
      (b) => active(b.status) && b.priority === "CRITICAL",
    ).length,
    bugCount: bugs.length,
    canPublish:
      quality.status === "READY" &&
      tests.length > 0 &&
      tests.every((t) => t.status === "PASSED") &&
      !bugs.some((b) => active(b.status) && b.severity === "BLOCKER"),
  };
}

export async function projectSummary(projectId: string) {
  const [bugs, executions, releases, cases] = await Promise.all([
    prisma.bug.findMany({
      where: { projectId },
      select: {
        friendlyId: true,
        title: true,
        status: true,
        priority: true,
        module: true,
        qualityScore: true,
        createdAt: true,
        resolvedAt: true,
        updatedAt: true,
        assignee: { select: { name: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.testExecution.findMany({
      where: { testRun: { projectId } },
      select: { status: true, executedAt: true },
    }),
    prisma.release.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        version: true,
        status: true,
        releasedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.testCase.count({ where: { projectId } }),
  ]);
  const resolved = bugs.filter((b) => b.resolvedAt);
  const executed = executions.filter((t) => t.status !== "NOT_TESTED");
  const passRate = executed.length
    ? Math.round(
        (100 * executed.filter((t) => t.status === "PASSED").length) /
          executed.length,
      )
    : null;
  const resolutionHours = resolved.length
    ? Math.round(
        (resolved.reduce(
          (sum, b) =>
            sum + (b.resolvedAt!.getTime() - b.createdAt.getTime()) / 3600000,
          0,
        ) /
          resolved.length) *
          10,
      ) / 10
    : null;
  const modules = [...new Set(bugs.map((b) => b.module))]
    .map((module) => {
      const records = bugs.filter((b) => b.module === module);
      const open = records.filter((b) => active(b.status));
      const critical = open.filter((b) => b.priority === "CRITICAL").length;
      const high = open.filter((b) => b.priority === "HIGH").length;
      return {
        module,
        open: open.length,
        critical,
        total: records.length,
        risk: Math.min(
          100,
          critical * 25 + high * 12 + (open.length - critical - high) * 4,
        ),
      };
    })
    .sort((a, b) => b.risk - a.risk);
  const statuses = [...new Set(bugs.map((b) => b.status))].map((name) => ({
    name,
    value: bugs.filter((b) => b.status === name).length,
  }));
  const trend = Array.from({ length: 6 }, (_, i) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (5 - i) * 7 - 6);
    const end = new Date(start.getTime() + 7 * 86400000);
    return {
      week: start.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }),
      abertos: bugs.filter((b) => b.createdAt >= start && b.createdAt < end)
        .length,
      resolvidos: bugs.filter(
        (b) => b.resolvedAt && b.resolvedAt >= start && b.resolvedAt < end,
      ).length,
    };
  });
  return {
    bugs,
    activeBugs: bugs.filter((b) => active(b.status)).length,
    criticalBugs: bugs.filter(
      (b) => active(b.status) && b.priority === "CRITICAL",
    ).length,
    testCases: cases,
    executions: executions.length,
    passRate,
    resolutionHours,
    modules,
    statuses,
    trend,
    evidenceCoverage: bugs.length
      ? Math.round(
          (100 * bugs.filter((b) => b._count.attachments > 0).length) /
            bugs.length,
        )
      : null,
    releases: await Promise.all(
      releases.map(async (release) => ({
        ...release,
        readiness: await releaseReadiness(projectId, release.id),
      })),
    ),
  };
}
