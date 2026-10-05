"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";

type BugListItem = {
  id: string;
  title: string;
  module: string;
  status: string;
  priority: string;
  assignee: string;
  updated: string;
};

const priorityLabel: Record<string, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

const statusLabel: Record<string, string> = {
  BACKLOG: "Backlog",
  OPEN: "Aberto",
  INVESTIGATING: "Investigando",
  IN_PROGRESS: "Em progresso",
  READY_FOR_QA: "Pronto para QA",
  TESTING: "Em teste",
  RESOLVED: "Resolvido",
  REOPENED: "Reaberto",
  CLOSED: "Fechado",
};

export function BugsTable({
  initialBugs,
}: {
  initialBugs: readonly BugListItem[];
}) {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [allBugs, setAllBugs] = useState(initialBugs);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialBugs.length);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPending(true);
      setError("");
      const query = new URLSearchParams({ page: String(page), limit: "20" });
      if (search.trim()) query.set("search", search.trim());
      if (priority !== "ALL") query.set("priority", priority);
      if (status !== "ALL") query.set("status", status);
      try {
        const response = await fetch("/api/bugs?" + query, {
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Não foi possível carregar a lista.");
        const records = body.data.items as {
          friendlyId: string;
          title: string;
          module: string;
          status: string;
          priority: string;
          updatedAt: string;
          assignee: { name: string } | null;
        }[];
        setAllBugs(
          records.map((b) => ({
            id: b.friendlyId,
            title: b.title,
            module: b.module,
            status: b.status,
            priority: b.priority,
            assignee: b.assignee?.name ?? "Não atribuído",
            updated: new Date(b.updatedAt).toLocaleString("pt-BR"),
          })),
        );
        setTotal(body.data.total);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Falha na conexão.",
          );
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, priority, status, page, initialBugs]);

  const visibleBugs = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return allBugs.filter((bug) => {
      const matchesSearch =
        !normalizedSearch ||
        [bug.id, bug.title, bug.module].some((value) =>
          value.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        );
      const matchesPriority = priority === "ALL" || bug.priority === priority;
      const matchesStatus = status === "ALL" || bug.status === status;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [allBugs, priority, search, status]);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground lg:max-w-md">
          <Search className="h-4 w-4" />
          <span className="sr-only">Buscar bugs</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por ID, título ou módulo"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            aria-label="Filtrar por status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground outline-none focus:border-primary"
          >
            <option value="ALL">Todos os status</option>
            {Object.entries(statusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por prioridade"
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground outline-none focus:border-primary"
          >
            <option value="ALL">Todas as prioridades</option>
            {Object.entries(priorityLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-muted-foreground lg:ml-auto">
          {visibleBugs.length} de {allBugs.length} exibidos
        </span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-border bg-muted/55 text-[11px] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Problema</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Prioridade</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 text-right font-medium">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleBugs.map((bug) => (
              <tr key={bug.id} className="transition-colors hover:bg-muted/35">
                <td className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground">
                      {bug.id}
                    </span>
                    <div>
                      <Link
                        href={`/bugs/${bug.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {bug.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bug.module}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={bug.status} />
                </td>
                <td className="px-4 py-4">
                  <Badge>{priorityLabel[bug.priority] ?? bug.priority}</Badge>
                </td>
                <td className="px-4 py-4 text-xs text-muted-foreground">
                  {bug.assignee}
                </td>
                <td className="px-4 py-4 text-right text-xs text-muted-foreground">
                  {bug.updated}
                </td>
              </tr>
            ))}
            {visibleBugs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  Nenhum bug corresponde aos filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>
          {total} bugs · página {page} de {Math.max(1, Math.ceil(total / 20))}
          {pending ? " · Atualizando…" : ""}
        </span>
        <div className="flex gap-2">
          <button
            disabled={pending || page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            disabled={pending || page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </>
  );
}
