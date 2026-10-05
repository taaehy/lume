import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Nova conta"
      title="Comece seu workspace"
      description="Crie sua conta e configure a primeira organização em poucos passos."
      footer={
        <>
          Já possui conta?{" "}
          <Link href="/login" className="font-medium text-primary">
            Entrar
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
