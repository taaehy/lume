import { PageHeader } from "@/components/product/page-header";
import { RecordPanel } from "@/components/product/record-panel";
import { ApiForm } from "@/components/product/api-form";
import { workspaceScope } from "@/lib/data/scope";
import { prisma } from "@/lib/db/prisma";

export default async function TeamPage() {
  const scope = await workspaceScope();
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: scope.organizationId },
    select: {
      id: true,
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const labels = {
    OWNER: "Proprietário",
    ADMIN: "Administrador",
    QA: "QA",
    DEVELOPER: "Desenvolvedor",
    VIEWER: "Leitor",
  };
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        title="Equipe"
        eyebrow={scope.organizationName}
        description="Membros e permissões reais da organização."
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RecordPanel title="Membros">
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
                <span className="text-sm">{labels[member.role]}</span>
              </div>
            ))}
          </div>
        </RecordPanel>
        <RecordPanel title="Convidar pessoa">
          <ApiForm
            endpoint="/api/team"
            submitLabel="Criar convite"
            fields={[
              { name: "email", label: "E-mail", type: "email", required: true },
              {
                name: "role",
                label: "Papel",
                type: "select",
                value: "VIEWER",
                options: Object.entries(labels)
                  .filter(([value]) => value !== "OWNER")
                  .map(([value, label]) => ({ value, label })),
              },
              {
                name: "delivery",
                label: "Entrega do convite",
                type: "select",
                value: "link",
                options: [
                  { value: "link", label: "Gerar link para compartilhar" },
                  { value: "email", label: "Enviar também por e-mail" },
                ],
              },
            ]}
          />
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            O convite vale por sete dias e só pode ser aceito por uma conta com
            o e-mail informado. Compartilhe o link com a pessoa convidada.
          </p>
        </RecordPanel>
      </div>
    </div>
  );
}
