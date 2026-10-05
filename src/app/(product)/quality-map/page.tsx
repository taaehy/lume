import { PageHeader } from "@/components/product/page-header";
import { RecordPanel } from "@/components/product/record-panel";
import { workspaceScope } from "@/lib/data/scope";

import { projectSummary } from "@/lib/data/summary";
export default async function QualityMapPage() {
  const scope = await workspaceScope();
  const summary = await projectSummary(scope.projectId);
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        title="Mapa de qualidade"
        eyebrow={scope.projectName}
        description="Risco calculado a partir dos bugs ativos de cada módulo."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {summary.modules.map((module) => (
          <RecordPanel key={module.module} title={module.module}>
            <p className="text-4xl font-bold">
              {module.risk}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                /100
              </span>
            </p>
            <div className="my-5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${module.risk}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {module.open} bugs ativos · {module.critical} críticos
            </p>
          </RecordPanel>
        ))}
      </div>
      {!summary.modules.length && (
        <RecordPanel title="Sem dados de risco">
          <p className="text-sm text-muted-foreground">
            Os módulos aparecerão quando o projeto tiver bugs cadastrados.
          </p>
        </RecordPanel>
      )}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Cada bug crítico soma 25 pontos, alta prioridade soma 12, e os demais
        ativos somam 4. O indicador é limitado a 100; bugs resolvidos ou
        fechados não somam risco.
      </p>
    </div>
  );
}
