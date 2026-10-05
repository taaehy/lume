import { PageHeader } from "@/components/product/page-header";
import { RecordPanel } from "@/components/product/record-panel";
import { ApiForm } from "@/components/product/api-form";
import { workspaceScope } from "@/lib/data/scope";

export default async function SettingsPage() {
  const scope = await workspaceScope();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
      <PageHeader
        title="Configurações"
        eyebrow={scope.organizationName}
        description="Preferências do espaço de trabalho."
      />
      <RecordPanel title="Organização e projeto ativo">
        <ApiForm
          endpoint="/api/workspace"
          method="PATCH"
          fields={[
            {
              name: "organizationName",
              label: "Nome da organização",
              value: scope.organizationName,
              required: true,
            },
            {
              name: "projectName",
              label: "Nome do projeto ativo",
              value: scope.projectName,
              required: true,
            },
          ]}
        />
      </RecordPanel>
      <p className="mt-5 text-sm text-muted-foreground">
        Apenas a pessoa proprietária pode alterar a organização. Para trocar o
        tema, use o controle na barra superior.
      </p>
    </div>
  );
}
