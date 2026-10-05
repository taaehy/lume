import Link from "next/link";
import { ApiForm } from "@/components/product/api-form";
import { getAuthenticatedUser } from "@/lib/auth/dal";
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getAuthenticatedUser();
  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <section className="rounded-2xl border bg-card p-8">
        <h1 className="text-3xl font-bold">Convite para o Lume</h1>
        <p className="my-6 text-sm text-muted-foreground">
          Entre ou crie uma conta com o e-mail convidado. Depois, volte a este
          link para aceitar o acesso ao projeto.
        </p>
        {user ? (
          <>
            <p className="mb-6 text-sm">
              Você está conectado como {user.email}.
            </p>
            <ApiForm
              endpoint={`/api/invitations/${token}`}
              fields={[]}
              submitLabel="Aceitar convite"
              redirectTo="/dashboard"
            />
          </>
        ) : (
          <div className="flex gap-6">
            <Link href="/login" className="text-primary">
              Entrar
            </Link>
            <Link href="/cadastro">Criar conta</Link>
          </div>
        )}
      </section>
    </main>
  );
}
