import Link from "next/link";
import { configuredProviders } from "@/lib/auth/providers";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/product/page-header";
import { RecordPanel } from "@/components/product/record-panel";
import { ApiForm } from "@/components/product/api-form";
import { workspaceScope } from "@/lib/data/scope";

export default async function ProfilePage() {
  const scope = await workspaceScope();
  const providers = configuredProviders();
  const accounts = await prisma.oAuthAccount.findMany({
    where: { userId: scope.user.id },
    select: { provider: true },
  });
  return (
    <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
      <PageHeader
        title="Seu perfil"
        eyebrow={scope.organizationName}
        description="Atualize seus dados e sua senha."
      />
      <RecordPanel title="Dados da conta">
        <ApiForm
          endpoint="/api/profile"
          method="PATCH"
          fields={[
            {
              name: "name",
              label: "Nome",
              value: scope.user.name,
              required: true,
            },
            {
              name: "email",
              label: "E-mail",
              type: "email",
              value: scope.user.email,
              required: true,
            },
            {
              name: "currentPassword",
              label: "Senha atual (para alterar e-mail ou senha)",
              type: "password",
            },
            {
              name: "password",
              label: "Nova senha (mínimo de 10 caracteres)",
              type: "password",
            },
          ]}
        />
      </RecordPanel>
      <RecordPanel title="Contas conectadas">
        <p className="mb-4 text-sm text-muted-foreground">
          Vincule uma conta externa com o mesmo e-mail do seu perfil.
        </p>
        <div className="flex flex-wrap gap-4">
          {(["google", "github"] as const).map((provider) =>
            accounts.some((a) => a.provider === provider) ? (
              <span key={provider} className="text-sm">
                {provider === "google" ? "Google" : "GitHub"} conectado
              </span>
            ) : providers[provider] ? (
              <Link
                prefetch={false}
                key={provider}
                href={`/api/auth/${provider}`}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Conectar {provider === "google" ? "Google" : "GitHub"}
              </Link>
            ) : (
              <span key={provider} className="text-sm text-muted-foreground">
                {provider === "google" ? "Google" : "GitHub"} aguarda
                configuração
              </span>
            ),
          )}
        </div>
      </RecordPanel>
    </div>
  );
}
