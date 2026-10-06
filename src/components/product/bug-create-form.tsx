"use client";

import { AlertCircle, Check, Link2, Paperclip, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateQualityScore } from "@/lib/domain/quality-score";
import { findRelatedBugs } from "@/lib/domain/related-bugs";
import { createBugAction } from "@/lib/data/bug-actions";
import type { RelatedBugCandidate } from "@/lib/domain/related-bugs";
import { bugReportSchema } from "@/lib/validation/bug";
import { evidenceMaxMb, evidenceMaxBytes } from "@/lib/validation/evidence";

const selectClassName =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

export function BugCreateForm({
  candidates,
  executionId,
}: {
  candidates: readonly RelatedBugCandidate[];
  executionId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState({
    title: "",
    description: "",
    module: "Checkout",
    priority: "MEDIUM" as const,
    severity: "MAJOR" as const,
    environment: "",
    version: "",
    steps: "",
    expectedResult: "",
    actualResult: "",
    technicalContext: "",
  });
  const [evidenceFiles, setEvidenceFiles] = useState<readonly File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedFriendlyId, setSavedFriendlyId] = useState<string | null>(null);
  const evidenceCount = evidenceFiles.length;

  const reproductionSteps = useMemo(
    () =>
      report.steps
        .split("\n")
        .map((step) => step.trim())
        .filter(Boolean),
    [report.steps],
  );

  const quality = useMemo(
    () =>
      calculateQualityScore({
        ...report,
        reproductionSteps,
        evidenceCount,
      }),
    [report, evidenceCount, reproductionSteps],
  );

  const related = useMemo(
    () =>
      report.title.trim().length >= 8
        ? findRelatedBugs(report, [...candidates]).slice(0, 2)
        : [],
    [report, candidates],
  );

  function update(field: keyof typeof report, value: string) {
    setFormError(null);
    setReport((current) => ({ ...current, [field]: value }) as typeof report);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      evidenceFiles.length > 10 ||
      evidenceFiles.some((file) => file.size > evidenceMaxBytes)
    ) {
      setFormError(
        `Selecione até 10 arquivos, com no máximo ${evidenceMaxMb} MB cada.`,
      );
      return;
    }
    const result = bugReportSchema.safeParse({
      ...report,
      reproductionSteps,
      evidenceCount,
    });

    if (!result.success) {
      setFormError(
        result.error.issues[0]?.message ?? "Revise os campos do relatório.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const response = savedFriendlyId
          ? { ok: true as const, friendlyId: savedFriendlyId }
          : await createBugAction(result.data);
        if (!response.ok) {
          setFormError(response.message);
          return;
        }
        setSavedFriendlyId(response.friendlyId);
        for (const file of evidenceFiles) {
          const body = new FormData();
          body.set("file", file);
          const uploaded = await fetch(
            `/api/bugs/${response.friendlyId}/attachments`,
            { method: "POST", body },
          );
          if (!uploaded.ok) {
            const failure = await uploaded.json();
            setFormError(
              `Bug ${response.friendlyId} salvo. ${failure.error ?? "Não foi possível enviar uma evidência."} Você também pode anexar o arquivo na página de detalhes.`,
            );
            return;
          }
          setEvidenceFiles((current) =>
            current.filter((item) => item !== file),
          );
        }
        if (executionId) {
          const linked = await fetch(`/api/executions/${executionId}/bug`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ friendlyId: response.friendlyId }),
          });
          if (!linked.ok) {
            setFormError(
              `Bug ${response.friendlyId} salvo, mas o vínculo com o teste não foi concluído. Abra o detalhe para continuar.`,
            );
            return;
          }
        }
        router.push(`/bugs/${response.friendlyId}`);
      } catch {
        setFormError("Não foi possível salvar o bug. Tente novamente.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Contexto do problema</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Comece pelo impacto. O Lume analisa o relatório enquanto você
                escreve.
              </p>
            </div>
            <Badge className="border-primary/25 bg-primary/10 text-primary">
              Lume Analysis
            </Badge>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="bug-title">Título</Label>
              <Input
                id="bug-title"
                required
                value={report.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Ex.: Checkout PIX retorna erro após confirmação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-description">Descrição e impacto</Label>
              <Textarea
                id="bug-description"
                required
                value={report.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Explique quem é afetado, quando ocorre e qual é o impacto."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bug-module">Módulo</Label>
                <select
                  id="bug-module"
                  className={selectClassName}
                  value={report.module}
                  onChange={(event) => update("module", event.target.value)}
                >
                  <option>Checkout</option>
                  <option>Identidade</option>
                  <option>Pedidos</option>
                  <option>Perfil</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-environment">Ambiente</Label>
                <Input
                  id="bug-environment"
                  value={report.environment}
                  onChange={(event) =>
                    update("environment", event.target.value)
                  }
                  placeholder="Produção / Chrome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-version">Versão</Label>
                <Input
                  id="bug-version"
                  value={report.version}
                  onChange={(event) => update("version", event.target.value)}
                  placeholder="2.4.0-rc.3"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bug-priority">Prioridade</Label>
                <select
                  id="bug-priority"
                  className={selectClassName}
                  value={report.priority}
                  onChange={(event) => update("priority", event.target.value)}
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-severity">Severidade</Label>
                <select
                  id="bug-severity"
                  className={selectClassName}
                  value={report.severity}
                  onChange={(event) => update("severity", event.target.value)}
                >
                  <option value="TRIVIAL">Trivial</option>
                  <option value="MINOR">Menor</option>
                  <option value="MAJOR">Maior</option>
                  <option value="CRITICAL">Crítica</option>
                  <option value="BLOCKER">Bloqueadora</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Reprodução e resultados</h2>
          <div className="mt-5 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="bug-steps">Passos para reprodução</Label>
              <Textarea
                id="bug-steps"
                value={report.steps}
                onChange={(event) => update("steps", event.target.value)}
                placeholder={
                  "Um passo por linha\n1. Acesse o checkout\n2. Selecione PIX\n3. Confirme o pedido"
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bug-expected">Resultado esperado</Label>
                <Textarea
                  id="bug-expected"
                  value={report.expectedResult}
                  onChange={(event) =>
                    update("expectedResult", event.target.value)
                  }
                  placeholder="O que deveria acontecer?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-actual">Resultado encontrado</Label>
                <Textarea
                  id="bug-actual"
                  value={report.actualResult}
                  onChange={(event) =>
                    update("actualResult", event.target.value)
                  }
                  placeholder="O que aconteceu de fato?"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-technical">Detalhes técnicos</Label>
              <Textarea
                id="bug-technical"
                value={report.technicalContext}
                onChange={(event) =>
                  update("technicalContext", event.target.value)
                }
                placeholder="Request ID, endpoint, código de erro ou trecho de log."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-evidence">Evidências</Label>
              <label
                htmlFor="bug-evidence"
                className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-border px-4 py-4 text-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <span className="flex items-center gap-3 text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  Imagem, vídeo, arquivo ou link
                </span>
                <span className="text-xs font-medium text-primary">
                  Selecionar
                </span>
              </label>
              <input
                id="bug-evidence"
                type="file"
                className="sr-only"
                multiple
                onChange={(event) => {
                  setFormError(null);
                  setEvidenceFiles(Array.from(event.target.files ?? []));
                }}
              />
              {evidenceCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {evidenceCount}{" "}
                  {evidenceCount === 1
                    ? "arquivo selecionado"
                    : "arquivos selecionados"}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Até 10 arquivos, {evidenceMaxMb} MB por arquivo.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            O ID amigável será gerado ao salvar.
          </p>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Salvando…"
              : savedFriendlyId
                ? "Tentar enviar evidências"
                : "Criar bug"}
          </Button>
        </div>
        {formError && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4" />
            {formError}
          </div>
        )}
      </div>

      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Quality Score</h2>
            </div>
            <span className="font-mono text-2xl font-semibold">
              {quality.score}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${quality.score}%` }}
            />
          </div>
          <div className="mt-5 space-y-3">
            {quality.criteria.map((criterion) => (
              <div key={criterion.key} className="flex gap-3">
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${criterion.earned === criterion.possible ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {criterion.earned === criterion.possible ? (
                    <Check className="h-2.5 w-2.5" />
                  ) : (
                    <AlertCircle className="h-2.5 w-2.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="font-medium">{criterion.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {criterion.earned}/{criterion.possible}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    {criterion.feedback}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Link2 className="h-4 w-4" />
              <h2 className="text-sm font-semibold">
                Possivelmente relacionados
              </h2>
            </div>
            <div className="mt-4 space-y-4">
              {related.map((match) => (
                <div key={match.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {match.id}
                    </span>
                    <span className="text-xs font-medium">
                      {match.similarity}% similar
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-5">
                    {match.title}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Termos: {match.sharedTerms.join(", ") || "mesmo módulo"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>
    </form>
  );
}
