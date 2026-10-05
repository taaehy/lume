import { PageHeader } from "@/components/product/page-header";
import { KanbanBoard } from "@/components/product/kanban-board";
import { workspaceScope } from "@/lib/data/scope";
import { prisma } from "@/lib/db/prisma";

export default async function KanbanPage() {
  const scope = await workspaceScope();
  const records = await prisma.bug.findMany({
    where: { projectId: scope.projectId },
    select: {
      friendlyId: true,
      title: true,
      module: true,
      priority: true,
      status: true,
      assignee: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-[1800px] px-4 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Operação / fluxo"
        title="Kanban"
        description="Movimente bugs entre etapas sem ignorar as regras do workflow. Cada transição válida gera um evento de histórico."
      />
      <div className="py-5">
        <KanbanBoard
          initialBugs={records.map((bug) => ({
            ...bug,
            id: bug.friendlyId,
            assignee: bug.assignee?.name ?? "Não atribuído",
          }))}
        />
      </div>
    </div>
  );
}
