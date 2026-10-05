import { PageHeader } from "@/components/product/page-header";
import { RecordPanel } from "@/components/product/record-panel";
import { ApiForm } from "@/components/product/api-form";
import { workspaceScope } from "@/lib/data/scope";
import { prisma } from "@/lib/db/prisma";

import { releaseReadiness } from "@/lib/data/summary";
export default async function ReleasesPage() {
  const scope = await workspaceScope();
  const records = await prisma.release.findMany({
    where: { projectId: scope.projectId },
    orderBy: { createdAt: "desc" },
  });
  const releases = await Promise.all(
    records.map(async (release) => ({
      ...release,
      readiness: await releaseReadiness(scope.projectId, release.id),
    })),
  );
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        title="Releases"
        eyebrow={scope.projectName}
        description="Decida a publicação com base nos testes e bugs vinculados à versão."
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {releases.length ? (
            releases.map((release) => (
              <RecordPanel
                key={release.id}
                title={`${release.version} · ${release.name}`}
              >
                <div className="flex flex-wrap gap-6 text-sm">
                  <span>
                    Pontuação:{" "}
                    <strong>
                      {release.releasedAt
                        ? release.qualityScore
                        : release.readiness.score}
                      /100
                    </strong>
                  </span>
                  <span>
                    {release.readiness.testsPassed}/
                    {release.readiness.testsTotal} testes aprovados
                  </span>
                  <span>{release.readiness.bugCount} bugs vinculados</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {release.readiness.blockers.join(" · ") ||
                    "Nenhum bloqueador encontrado."}
                </p>
                {release.releasedAt ? (
                  <p className="mt-4 text-sm text-accent-foreground">
                    Publicada em {release.releasedAt.toLocaleString("pt-BR")}
                  </p>
                ) : (
                  <div className="mt-4">
                    <ApiForm
                      endpoint={`/api/releases/${release.id}/publish`}
                      submitLabel="Publicar release"
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      É necessário ter testes vinculados, pontuação mínima de 90
                      e nenhum teste falho ou bloqueado.
                    </p>
                  </div>
                )}
              </RecordPanel>
            ))
          ) : (
            <RecordPanel title="Suas releases">
              <p className="text-sm text-muted-foreground">
                Nenhuma versão criada. Cadastre a primeira ao lado.
              </p>
            </RecordPanel>
          )}
        </div>
        <RecordPanel title="Nova release">
          <ApiForm
            endpoint="/api/releases"
            submitLabel="Criar release"
            fields={[
              { name: "name", label: "Nome", required: true },
              { name: "version", label: "Versão", required: true },
            ]}
          />
        </RecordPanel>
      </div>
    </div>
  );
}
