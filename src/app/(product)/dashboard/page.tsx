import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { RecordPanel } from "@/components/product/record-panel";
import { AnalyticsCharts } from "@/components/product/analytics-charts";
import { workspaceScope } from "@/lib/data/scope";
import { projectSummary } from "@/lib/data/summary";

export default async function DashboardPage() {
  const scope = await workspaceScope();
  const data = await projectSummary(scope.projectId);
  const attention = data.bugs
    .filter((b) => !["RESOLVED", "CLOSED"].includes(b.status))
    .slice(0, 8);
  return (
    <div className="mx-auto max-w-[1540px] space-y-6 px-4 py-9 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {scope.organizationName} / {scope.projectName}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Visão geral da qualidade
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dados do projeto, atualizados a cada consulta.
          </p>
        </div>
        <Link href="/projetos" className="rounded-xl border px-4 py-2 text-sm">
          Trocar projeto
        </Link>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Bugs ativos", data.activeBugs],
          ["Críticos ativos", data.criticalBugs],
          [
            "Aprovação dos testes",
            data.passRate === null ? "Sem execuções" : data.passRate + "%",
          ],
          [
            "Tempo médio de resolução",
            data.resolutionHours === null
              ? "Sem resoluções"
              : data.resolutionHours + "h",
          ],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`rounded-2xl border p-6 ${index === 0 ? "bg-sidebar text-white" : "bg-card"}`}
          >
            <p className="text-sm opacity-70">{label}</p>
            <p className="mt-4 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <RecordPanel title="Exigem atenção">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3">Problema</th>
                  <th>Status</th>
                  <th>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {attention.map((b) => (
                  <tr key={b.friendlyId} className="border-b">
                    <td className="py-4 pr-4">
                      <Link
                        href={`/bugs/${b.friendlyId}`}
                        className="hover:text-primary"
                      >
                        <span className="block text-xs text-muted-foreground">
                          {b.friendlyId} · {b.module}
                        </span>
                        {b.title}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td>{b.assignee?.name ?? "Não atribuído"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!attention.length && (
              <p className="py-8 text-muted-foreground">
                Nenhum bug ativo neste projeto.
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-between text-sm">
            <Link href="/bugs">Ver todos os bugs</Link>
            <Link href="/bugs/new" className="text-primary">
              Novo bug
            </Link>
          </div>
        </RecordPanel>
        <RecordPanel title="Próximas releases">
          {data.releases
            .filter((r) => !r.releasedAt)
            .slice(0, 3)
            .map((r) => (
              <div key={r.id} className="border-b py-4">
                <p className="font-semibold">
                  {r.version} · {r.name}
                </p>
                <p className="mt-2 text-sm">
                  {r.readiness.canPublish
                    ? "Pronta para publicação"
                    : "Validação pendente"}{" "}
                  · {r.readiness.score}/100
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.readiness.testsPassed}/{r.readiness.testsTotal} testes
                  aprovados
                </p>
              </div>
            ))}
          {!data.releases.some((r) => !r.releasedAt) && (
            <p className="py-5 text-sm text-muted-foreground">
              Nenhuma release em preparação.
            </p>
          )}
          <Link
            href="/releases"
            className="mt-5 inline-block text-sm text-primary"
          >
            Gerenciar releases
          </Link>
        </RecordPanel>
      </div>
      <AnalyticsCharts
        statusData={data.statuses}
        trendData={data.trend}
        releaseData={data.releases.map((r) => ({
          release: r.version,
          bugs: r.readiness.bugCount,
          score: r.readiness.score,
        }))}
      />
    </div>
  );
}
