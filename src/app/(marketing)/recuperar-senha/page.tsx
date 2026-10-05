import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ApiForm } from "@/components/product/api-form";
export default function RecoverPage() {
  return (
    <AuthShell
      eyebrow="Acesso"
      title="Recuperar senha"
      description="Enviaremos um link para o e-mail da sua conta."
      footer={<Link href="/login">Voltar para entrar</Link>}
    >
      <ApiForm
        endpoint="/api/auth/recover"
        submitLabel="Enviar instruções"
        fields={[
          {
            name: "email",
            label: "E-mail da conta",
            type: "email",
            required: true,
          },
        ]}
      />
    </AuthShell>
  );
}
