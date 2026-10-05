import { BugCreateForm } from "@/components/product/bug-create-form";
import { PageHeader } from "@/components/product/page-header";
import { workspaceScope } from "@/lib/data/scope";
import { prisma } from "@/lib/db/prisma";

export default async function NewBugPage({
  searchParams,
}: {
  searchParams: Promise<{ executionId?: string }>;
}) {
  const { executionId } = await searchParams;
  const scope = await workspaceScope();
  const records = await prisma.bug.findMany({
    where: { projectId: scope.projectId },
    select: { friendlyId: true, title: true, description: true, module: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Bugs / novo relatório"
        title="Registrar problema"
        description="Descreva o problema com contexto. O Quality Score e a busca por similares são determinísticos e funcionam localmente."
      />
      <div className="py-5">
        <BugCreateForm
          executionId={executionId}
          candidates={records.map((bug) => ({ ...bug, id: bug.friendlyId }))}
        />
      </div>
    </div>
  );
}
