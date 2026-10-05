import { PageHeader } from "@/components/product/page-header";
import { workspaceScope } from "@/lib/data/scope";
import { prisma } from "@/lib/db/prisma";

import { TestRunner } from "@/components/product/test-runner";
export default async function TestsPage() {
  const scope = await workspaceScope();
  const [cases, runs, releases] = await Promise.all([
    prisma.testCase.findMany({
      where: { projectId: scope.projectId },
      include: { steps: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.testRun.findMany({
      where: { projectId: scope.projectId },
      include: {
        executions: {
          select: {
            id: true,
            status: true,
            notes: true,
            generatedBugId: true,
            testCase: { select: { title: true, friendlyId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.release.findMany({
      where: { projectId: scope.projectId, releasedAt: null },
      select: { id: true, version: true },
    }),
  ]);
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        title="Central de testes"
        eyebrow={scope.projectName}
        description="Crie casos, inicie execuções e registre resultados no projeto."
      />
      <TestRunner cases={cases} runs={runs} releases={releases} />
    </div>
  );
}
