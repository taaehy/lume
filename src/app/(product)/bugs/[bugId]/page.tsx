import { BugDetailView } from "@/components/product/bug-detail-view";
import { getCurrentProjectContext, getProjectBug } from "@/lib/data/bugs";
import { prisma } from "@/lib/db/prisma";
import { ApiForm } from "@/components/product/api-form";
import { RecordPanel } from "@/components/product/record-panel";
import { notFound } from "next/navigation";

export default async function BugDetailPage({
  params,
}: {
  params: Promise<{ bugId: string }>;
}) {
  const { bugId } = await params;
  const project = await getCurrentProjectContext();
  const bug = await getProjectBug({
    organizationId: project.organizationId,
    projectId: project.projectId,
    friendlyId: bugId,
  });
  if (!bug) notFound();

  const [members, releases, record] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: project.projectId },
      select: { user: { select: { id: true, name: true } } },
    }),
    prisma.release.findMany({
      where: { projectId: project.projectId },
      select: { id: true, version: true },
    }),
    prisma.bug.findUniqueOrThrow({
      where: { id: bug.id },
      select: { assigneeId: true, releaseId: true },
    }),
  ]);
  const dateTime = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <BugDetailView
      detail={{
        id: bug.friendlyId,
        title: bug.title,
        description: bug.description,
        project: project.projectName,
        module: bug.module,
        environment: bug.environment ?? "Não informado",
        version: bug.version ?? "Não informada",
        priority: bug.priority,
        severity: bug.severity,
        status: bug.status,
        author: bug.author.name,
        assignee: bug.assignee?.name ?? "Não atribuído",
        tags: [bug.module.toLocaleLowerCase("pt-BR")],
        reproductionSteps: Array.isArray(bug.reproductionSteps)
          ? bug.reproductionSteps.filter(
              (step): step is string => typeof step === "string",
            )
          : [],
        expectedResult: bug.expectedResult ?? "Não informado",
        actualResult: bug.actualResult ?? "Não informado",
        technicalContext: bug.technicalContext ?? "Não informado",
        qualityScore: bug.qualityScore,
        evidence: bug.attachments.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.kind === "IMAGE" ? "Imagem" : "Arquivo",
          size: item.sizeBytes ? `${Math.ceil(item.sizeBytes / 1024)} KB` : "—",
        })),
        history: bug.history.map((event) => ({
          time: dateTime.format(event.createdAt),
          actor: event.actor.name,
          action:
            event.type === "CREATED"
              ? "Criou o bug"
              : `Alterou ${event.field ?? "o registro"} de ${event.fromValue ?? "—"} para ${event.toValue ?? "—"}`,
        })),
      }}
    >
      <RecordPanel title="Editar bug">
        <ApiForm
          endpoint={`/api/bugs/${bug.friendlyId}`}
          method="PATCH"
          fields={[
            {
              name: "title",
              label: "Título",
              value: bug.title,
              required: true,
            },
            {
              name: "description",
              label: "Descrição",
              type: "textarea",
              value: bug.description,
              required: true,
            },
            {
              name: "assigneeId",
              label: "Responsável",
              type: "select",
              value: record.assigneeId ?? "",
              options: [
                { value: "", label: "Não atribuído" },
                ...members.map((m) => ({
                  value: m.user.id,
                  label: m.user.name,
                })),
              ],
            },
            {
              name: "releaseId",
              label: "Release",
              type: "select",
              value: record.releaseId ?? "",
              options: [
                { value: "", label: "Sem release" },
                ...releases.map((r) => ({ value: r.id, label: r.version })),
              ],
            },
          ]}
        />
      </RecordPanel>
      <RecordPanel title="Comentários">
        {bug.comments.map((c) => (
          <article key={c.id} className="mb-4 border-b pb-4">
            <p className="whitespace-pre-wrap text-sm">{c.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {c.author.name} · {dateTime.format(c.createdAt)}
            </p>
          </article>
        ))}
        <ApiForm
          endpoint={`/api/bugs/${bug.friendlyId}/comments`}
          submitLabel="Comentar"
          fields={[
            {
              name: "body",
              label: "Novo comentário",
              type: "textarea",
              required: true,
            },
          ]}
        />
      </RecordPanel>
    </BugDetailView>
  );
}
