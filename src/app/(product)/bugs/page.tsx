import { AlertTriangle, Link2, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

import { BugsTable } from "@/components/product/bugs-table";
import { PageHeader } from "@/components/product/page-header";
import { getCurrentProjectContext, listProjectBugs } from "@/lib/data/bugs";

export default async function BugsPage() {
  const project = await getCurrentProjectContext();
  const records = await listProjectBugs({
    organizationId: project.organizationId,
    projectId: project.projectId,
  });
  const bugs = records.map((bug) => ({
    id: bug.friendlyId,
    title: bug.title,
    module: bug.module,
    status: bug.status,
    priority: bug.priority,
    assignee: bug.assignee?.name ?? "Não atribuído",
    updated: new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(bug.updatedAt),
  }));
  return (
    <div className="mx-auto max-w-[1540px] px-4 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Operação / bugs"
        title="Bugs"
        description="Acompanhe problemas, responsáveis e sinais de risco em um único fluxo."
        actions={
          <Link
            href="/bugs/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-px"
          >
            <Plus className="h-4 w-4" />
            Novo bug
          </Link>
        }
      />

      <div className="grid gap-5 pb-12 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <BugsTable initialBugs={bugs} />
        </section>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Resumo da fila</p>
                <p className="text-xs text-muted-foreground">
                  Resumo da fila atual
                </p>
              </div>
            </div>
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-xs text-muted-foreground">Sinal principal</p>
              <p className="mt-2 text-sm font-medium leading-6">
                {
                  bugs.filter(
                    (bug) =>
                      bug.priority === "CRITICAL" &&
                      !["CLOSED", "RESOLVED"].includes(bug.status),
                  ).length
                }{" "}
                bugs críticos exigem revisão antes da próxima release.
              </p>
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Possíveis duplicados</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Compare título, módulo e contexto antes de abrir um novo
                  registro.
                </p>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                <p className="text-sm font-semibold">Risco de regressão</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Confira os módulos e os bugs reabertos no mapa de qualidade.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
