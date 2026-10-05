"use client";

import { ArrowLeft, Check, Clock3, FileText, ImageIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";

import { PageHeader } from "@/components/product/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/components/product/api-form";
import { AttachmentUploader } from "@/components/product/attachment-uploader";
import { allowedTransitions, type BugStatus } from "@/lib/domain/bug-workflow";

const transitionLabels: Record<BugStatus, string> = {
  BACKLOG: "Mover para backlog",
  OPEN: "Abrir bug",
  INVESTIGATING: "Iniciar investigação",
  IN_PROGRESS: "Iniciar desenvolvimento",
  READY_FOR_QA: "Enviar para QA",
  TESTING: "Iniciar reteste",
  RESOLVED: "Marcar como resolvido",
  REOPENED: "Reabrir bug",
  CLOSED: "Fechar bug",
};

const priorityLabels: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const severityLabels: Record<string, string> = {
  TRIVIAL: "Trivial",
  MINOR: "Menor",
  MAJOR: "Maior",
  CRITICAL: "Crítica",
  BLOCKER: "Bloqueadora",
};

export type DetailData = {
  id: string;
  title: string;
  description: string;
  project: string;
  module: string;
  environment: string;
  version: string;
  priority: string;
  severity: string;
  status: BugStatus;
  author: string;
  assignee: string;
  tags: readonly string[];
  reproductionSteps: readonly string[];
  expectedResult: string;
  actualResult: string;
  technicalContext: string;
  qualityScore: number;
  evidence: readonly { id: string; name: string; type: string; size: string }[];
  history: readonly { time: string; actor: string; action: string }[];
};

export function BugDetailView({
  detail,
  children,
}: {
  detail: DetailData;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(detail.status);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const transitions = allowedTransitions(status);

  function moveTo(nextStatus: BugStatus) {
    const reason =
      nextStatus === "REOPENED"
        ? (window.prompt(
            "Por que este bug precisa ser reaberto? (mínimo de 10 caracteres)",
          ) ?? "")
        : undefined;
    setActionError(null);
    startTransition(async () => {
      try {
        await apiRequest(`/api/bugs/${detail.id}/status`, "PATCH", {
          status: nextStatus,
          reason,
        });
        setStatus(nextStatus);
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Não foi possível salvar.",
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8">
      <div className="pt-5">
        <Link
          href="/bugs"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para bugs
        </Link>
      </div>
      <PageHeader
        eyebrow={`${detail.id} · ${detail.project} / ${detail.module}`}
        title={detail.title}
        description={detail.description}
        actions={
          <>
            <StatusBadge status={status} />
            {transitions.map((nextStatus) => (
              <Button
                key={nextStatus}
                size="sm"
                disabled={isPending}
                onClick={() => moveTo(nextStatus)}
              >
                {transitionLabels[nextStatus]}
              </Button>
            ))}
          </>
        }
      />
      {actionError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="grid gap-5 py-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="eyebrow">Passos para reprodução</p>
                <ol className="mt-4 space-y-3">
                  {detail.reproductionSteps.map((step, index) => (
                    <li
                      key={`${index}-${step}`}
                      className="flex gap-3 text-sm leading-6"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted font-mono text-[10px] text-muted-foreground">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="space-y-5">
                <div>
                  <p className="eyebrow">Resultado esperado</p>
                  <p className="mt-2 text-sm leading-6">
                    {detail.expectedResult}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Resultado encontrado</p>
                  <p className="mt-2 text-sm leading-6">
                    {detail.actualResult}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-muted/60 p-4">
              <p className="eyebrow">Contexto técnico</p>
              <code className="mt-2 block font-mono text-xs leading-5">
                {detail.technicalContext}
              </code>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="eyebrow">Evidências</p>
            <h2 className="mt-1 text-base font-semibold">
              Arquivos vinculados
            </h2>
            {detail.evidence.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {detail.evidence.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                      {item.type === "Imagem" ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        <a
                          href={`/api/attachments/${item.id}`}
                          className="underline"
                        >
                          {item.name}
                        </a>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.type} · {item.size}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                Nenhuma evidência anexada.
              </p>
            )}
          </section>

          <AttachmentUploader friendlyId={detail.id} />
          {children}
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Histórico</h2>
            </div>
            <ol className="mt-5 space-y-4">
              {detail.history.map((event, index) => (
                <li key={`${event.time}-${index}`} className="flex gap-3">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm">{event.action}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {event.time} · {event.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Quality Score</p>
              <span className="font-mono text-2xl font-semibold">
                {detail.qualityScore}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${detail.qualityScore}%` }}
              />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-primary">
              <Check className="h-3.5 w-3.5" /> Relatório analisado
            </div>
          </section>
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="eyebrow">Detalhes</p>
            <dl className="mt-4 space-y-3 text-xs">
              {[
                ["Status", <StatusBadge key="status" status={status} />],
                ["Prioridade", priorityLabels[detail.priority]],
                ["Severidade", severityLabels[detail.severity]],
                ["Responsável", detail.assignee],
                ["Autor", detail.author],
                ["Ambiente", detail.environment],
                ["Versão", detail.version],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-start justify-between gap-4"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="max-w-[190px] text-right font-medium">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {detail.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
