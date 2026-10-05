import { AnalyticsCharts } from "@/components/product/analytics-charts";
import { PageHeader } from "@/components/product/page-header";
import { workspaceScope } from "@/lib/data/scope";
import { projectSummary } from "@/lib/data/summary";
export default async function AnalyticsPage() {
  const scope = await workspaceScope();
  const data = await projectSummary(scope.projectId);
  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={scope.projectName}
        title="Indicadores de qualidade"
        description="Métricas calculadas a partir dos registros do projeto. Ausência de dados não é tratada como resultado positivo."
      />
      <div className="grid gap-4 py-6 sm:grid-cols-3">
        {[
          ["Casos de teste", data.testCases],
          ["Execuções registradas", data.executions],
          [
            "Bugs com evidência",
            data.evidenceCoverage === null
              ? "Sem bugs"
              : data.evidenceCoverage + "%",
          ],
        ].map(([label, value]) => (
          <section key={label} className="rounded-2xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-bold">{value}</p>
          </section>
        ))}
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
      <p className="mt-6 text-sm text-muted-foreground">
        Aprovação: testes aprovados ÷ testes executados. Resolução: média do
        tempo entre criação e resolução. Evidências: bugs com arquivo anexado ÷
        total de bugs.
      </p>
    </div>
  );
}
