"use client";

import { GripVertical, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/components/product/api-form";

import { Badge } from "@/components/ui/badge";
import {
  allowedTransitions,
  type BugStatus,
  validateTransition,
} from "@/lib/domain/bug-workflow";

type BoardBug = {
  id: string;
  title: string;
  module: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assignee: string;
  status: BugStatus;
};

const columns: Array<{ status: BugStatus; label: string }> = [
  { status: "BACKLOG", label: "Backlog" },
  { status: "OPEN", label: "Aberto" },
  { status: "INVESTIGATING", label: "Investigação" },
  { status: "IN_PROGRESS", label: "Desenvolvimento" },
  { status: "READY_FOR_QA", label: "Pronto para QA" },
  { status: "TESTING", label: "Em teste" },
  { status: "RESOLVED", label: "Resolvido" },
  { status: "REOPENED", label: "Reaberto" },
  { status: "CLOSED", label: "Fechado" },
];

const priorityLabels = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export function KanbanBoard({ initialBugs }: { initialBugs: BoardBug[] }) {
  const router = useRouter();
  const items = initialBugs;
  const [pending, setPending] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(
    "Arraste um cartão ou use o seletor de status.",
  );

  async function moveBug(id: string, to: BugStatus) {
    if (pending) return;
    const bug = items.find((item) => item.id === id);
    if (!bug || bug.status === to) return;

    const reason =
      to === "REOPENED"
        ? (window.prompt(
            "Informe o motivo da reabertura (mínimo de 10 caracteres)",
          ) ?? "")
        : undefined;
    const result = validateTransition({ from: bug.status, to, reason });
    if (!result.valid) {
      setFeedback(result.error ?? "Movimento não permitido.");
      return;
    }

    setPending(true);
    try {
      await apiRequest(`/api/bugs/${id}/status`, "PATCH", {
        status: to,
        reason,
      });
      setFeedback(
        `${id} salvo em ${columns.find((column) => column.status === to)?.label}. Histórico registrado.`,
      );
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div
        role="status"
        className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground"
      >
        <ShieldAlert className="h-4 w-4 text-primary" />
        {feedback}
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-[2160px] grid-cols-9 gap-3">
          {columns.map((column) => {
            const columnItems = items.filter(
              (item) => item.status === column.status,
            );
            return (
              <section
                key={column.status}
                className="min-h-[520px] rounded-xl border border-border bg-muted/30 p-2.5"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedId) moveBug(draggedId, column.status);
                  setDraggedId(null);
                }}
              >
                <div className="flex items-center justify-between px-1 py-2">
                  <h2 className="text-xs font-semibold">{column.label}</h2>
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-background px-1.5 font-mono text-[9px] text-muted-foreground">
                    {columnItems.length}
                  </span>
                </div>
                <div className="mt-1 space-y-2">
                  {columnItems.map((bug) => (
                    <article
                      key={bug.id}
                      draggable={!pending}
                      onDragStart={() => setDraggedId(bug.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className="cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-[opacity,transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {bug.id}
                        </span>
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                      <p className="mt-2 text-xs font-medium leading-5">
                        {bug.title}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {bug.module}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge>{priorityLabels[bug.priority]}</Badge>
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 font-mono text-[9px] font-semibold text-primary">
                          {bug.assignee}
                        </span>
                      </div>
                      <label className="mt-3 block">
                        <span className="sr-only">Mover {bug.id}</span>
                        <select
                          disabled={pending}
                          value={bug.status}
                          onChange={(event) =>
                            moveBug(bug.id, event.target.value as BugStatus)
                          }
                          className="h-7 w-full rounded-md border border-border bg-background px-2 text-[10px] text-muted-foreground outline-none focus:border-primary"
                        >
                          <option value={bug.status}>{column.label}</option>
                          {allowedTransitions(bug.status).map((status) => (
                            <option key={status} value={status}>
                              {columns.find((item) => item.status === status)
                                ?.label ?? status}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
