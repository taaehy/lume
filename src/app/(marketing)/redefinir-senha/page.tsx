import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ApiForm } from "@/components/product/api-form";
export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthShell
      eyebrow="Acesso"
      title="Nova senha"
      description="Escolha uma senha com pelo menos 10 caracteres."
      footer={<Link href="/login">Voltar para entrar</Link>}
    >
      {token && /^[a-f0-9]{64}$/.test(token) ? (
        <ApiForm
          endpoint="/api/auth/reset"
          submitLabel="Redefinir senha"
          fields={[
            {
              name: "token",
              label: "Código de recuperação",
              type: "hidden",
              value: token,
            },
            {
              name: "password",
              label: "Nova senha",
              type: "password",
              required: true,
            },
          ]}
        />
      ) : (
        <p className="text-sm">
          Abra o link recebido no e-mail ou{" "}
          <Link href="/recuperar-senha" className="underline">
            solicite um novo
          </Link>
          .
        </p>
      )}
    </AuthShell>
  );
}
