import { AuthShell } from "@/components/auth/auth-shell";
import { ApiForm } from "@/components/product/api-form";
import { workspaceScope } from "@/lib/data/scope";
export default async function OnboardingPage() {
  const scope = await workspaceScope();
  return (
    <AuthShell
      eyebrow="Configuração"
      title="Seu workspace"
      description="Defina o nome da organização e do primeiro projeto."
      footer="Você poderá criar mais projetos e convidar sua equipe depois."
    >
      <ApiForm
        endpoint="/api/workspace"
        method="PATCH"
        redirectTo="/dashboard"
        submitLabel="Salvar e abrir workspace"
        fields={[
          {
            name: "organizationName",
            label: "Organização",
            value: scope.organizationName,
            required: true,
          },
          {
            name: "projectName",
            label: "Primeiro projeto",
            value: scope.projectName,
            required: true,
          },
        ]}
      />
    </AuthShell>
  );
}
