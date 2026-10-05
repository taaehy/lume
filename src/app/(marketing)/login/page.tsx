import { configuredProviders } from "@/lib/auth/providers";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell
      eyebrow="Acesso"
      title="Entrar no Lume"
      description=""
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-primary">
            Criar conta
          </Link>
        </>
      }
    >
      <LoginForm
        providers={configuredProviders()}
        error={error?.slice(0, 250)}
      />
    </AuthShell>
  );
}
