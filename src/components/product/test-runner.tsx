"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiForm, apiRequest } from "@/components/product/api-form";
import { RecordPanel } from "@/components/product/record-panel";
import { Button } from "@/components/ui/button";

type Case = {
  id: string;
  friendlyId: string;
  title: string;
  module: string;
  priority: string;
  steps: { action: string; expectedResult: string }[];
};
type Run = {
  id: string;
  name: string;
  executions: {
    id: string;
    status: string;
    notes: string | null;
    generatedBugId: string | null;
    testCase: { friendlyId: string; title: string };
  }[];
};
const statuses = {
  PASSED: "Aprovado",
  FAILED: "Falhou",
  BLOCKED: "Bloqueado",
  NOT_TESTED: "Não testado",
};
export function TestRunner({
  cases,
  runs,
  releases,
}: {
  cases: Case[];
  runs: Run[];
  releases: { id: string; version: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const run = runs.find((item) => item.id === selected) ?? runs[0];
  async function setStatus(id: string, status: string) {
    if (pending) return;
    setPending(id);
    setError("");
    try {
      await apiRequest(`/api/executions/${id}`, "PATCH", { status });
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setPending("");
    }
  }
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <RecordPanel title="Casos de teste">
          {cases.length ? (
            <div className="divide-y divide-border">
              {cases.map((test) => (
                <details key={test.id} className="py-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {test.friendlyId} · {test.title}
                    <span className="ml-3 text-xs font-normal text-muted-foreground">
                      {test.module}
                    </span>
                  </summary>
                  <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm">
                    {test.steps.map((step, index) => (
                      <li key={index}>
                        <p>{step.action}</p>
                        <p className="mt-1 text-muted-foreground">
                          Esperado: {step.expectedResult}
                        </p>
                      </li>
                    ))}
                  </ol>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum caso criado. Cadastre o primeiro ao lado.
            </p>
          )}
        </RecordPanel>
        <RecordPanel title="Execuções">
          {runs.length ? (
            <>
              <label className="block text-sm">
                Selecionar execução
                <select
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3"
                  value={run?.id}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  {runs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-5 divide-y divide-border">
                {run?.executions.map((item) => (
                  <div key={item.id} className="space-y-3 py-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {item.testCase.friendlyId} · {item.testCase.title}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {statuses[item.status as keyof typeof statuses]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(statuses).map(([status, label]) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant={
                            status === item.status ? "default" : "outline"
                          }
                          disabled={Boolean(pending)}
                          onClick={() => setStatus(item.id, status)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    {item.status === "FAILED" && !item.generatedBugId && (
                      <Link
                        className="inline-block text-sm text-primary underline"
                        href={`/bugs/new?executionId=${item.id}`}
                      >
                        Reportar falha como bug
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Crie uma execução para registrar os resultados.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </RecordPanel>
      </div>
      <aside className="space-y-5">
        <RecordPanel title="Novo caso de teste">
          <ApiForm
            endpoint="/api/tests"
            kind="test-case"
            submitLabel="Criar caso"
            fields={[
              { name: "title", label: "Título", required: true },
              { name: "module", label: "Módulo", required: true },
              {
                name: "priority",
                label: "Prioridade",
                type: "select",
                value: "MEDIUM",
                options: [
                  { value: "LOW", label: "Baixa" },
                  { value: "MEDIUM", label: "Média" },
                  { value: "HIGH", label: "Alta" },
                  { value: "CRITICAL", label: "Crítica" },
                ],
              },
              {
                name: "steps",
                label: "Passos (um por linha)",
                type: "textarea",
                required: true,
              },
              {
                name: "expectedResult",
                label: "Resultado esperado",
                type: "textarea",
                required: true,
              },
            ]}
          />
        </RecordPanel>
        <RecordPanel title="Nova execução">
          <ApiForm
            endpoint="/api/runs"
            submitLabel="Iniciar execução"
            fields={[
              { name: "name", label: "Nome da execução", required: true },
              {
                name: "releaseId",
                label: "Release",
                type: "select",
                options: [
                  { value: "", label: "Sem release" },
                  ...releases.map((r) => ({ value: r.id, label: r.version })),
                ],
              },
            ]}
          />
        </RecordPanel>
      </aside>
    </div>
  );
}
