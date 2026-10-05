import { PageHeader } from "@/components/product/page-header";
import { RecordPanel } from "@/components/product/record-panel";
import { ApiForm } from "@/components/product/api-form";
import { workspaceScope } from "@/lib/data/scope";
import { prisma } from "@/lib/db/prisma";

export default async function ProjectsPage() {
  const scope = await workspaceScope();
  const projects = await prisma.project.findMany({
    where: {
      organizationId: scope.organizationId,
      members: { some: { userId: scope.user.id } },
    },
    include: {
      _count: { select: { bugs: true, testCases: true, members: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        title="Projetos"
        eyebrow={scope.organizationName}
        description="Crie projetos e escolha o contexto da sua operação."
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5 md:grid-cols-2">
          {projects.map((project) => (
            <RecordPanel key={project.id} title={project.name}>
              <p className="mb-4 text-sm text-muted-foreground">
                {project.description ?? "Sem descrição"} · {project.key}
              </p>
              <p className="mb-5 text-sm">
                {project._count.bugs} bugs · {project._count.testCases} testes ·{" "}
                {project._count.members} membros
              </p>
              <ApiForm
                endpoint={`/api/projects/${project.id}/select`}
                submitLabel={
                  project.id === scope.projectId
                    ? "Projeto ativo"
                    : "Usar este projeto"
                }
              />
              <details className="mt-5">
                <summary className="cursor-pointer text-sm text-primary">
                  Editar projeto
                </summary>
                <div className="mt-4">
                  <ApiForm
                    method="PATCH"
                    endpoint={`/api/projects/${project.id}`}
                    fields={[
                      {
                        name: "name",
                        label: "Nome",
                        value: project.name,
                        required: true,
                      },
                      {
                        name: "description",
                        label: "Descrição",
                        type: "textarea",
                        value: project.description ?? "",
                      },
                    ]}
                  />
                </div>
              </details>
            </RecordPanel>
          ))}
        </div>
        <RecordPanel title="Novo projeto">
          <ApiForm
            endpoint="/api/projects"
            submitLabel="Criar projeto"
            fields={[
              { name: "name", label: "Nome", required: true },
              {
                name: "key",
                label: "Identificador único (ex.: APP)",
                required: true,
              },
              { name: "description", label: "Descrição", type: "textarea" },
            ]}
          />
        </RecordPanel>
      </div>
    </div>
  );
}
