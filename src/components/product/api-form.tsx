"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ApiField = {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "textarea" | "select" | "hidden";
  value?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

export async function apiRequest(
  endpoint: string,
  method: string,
  values?: unknown,
) {
  const response = await fetch(endpoint, {
    method,
    ...(values !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "Não foi possível concluir a operação.");
  return result.data;
}

export function ApiForm({
  endpoint,
  method = "POST",
  fields = [],
  submitLabel = "Salvar",
  kind,
  redirectTo,
}: {
  endpoint: string;
  method?: string;
  fields?: ApiField[];
  submitLabel?: string;
  kind?: "test-case";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [invitation, setInvitation] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values: Record<string, unknown> = {};
    new FormData(form).forEach((value, key) => {
      if (typeof value === "string" && value !== "") values[key] = value;
    });
    for (const field of fields)
      if (
        ["assigneeId", "releaseId"].includes(field.name) &&
        !values[field.name]
      )
        values[field.name] = null;
    if (kind === "test-case") {
      const expected = String(values.expectedResult ?? "");
      values.steps = String(values.steps ?? "")
        .split("\n")
        .map((action) => action.trim())
        .filter(Boolean)
        .map((action) => ({ action, expectedResult: expected }));
      delete values.expectedResult;
    }
    setPending(true);
    setFeedback("");
    setFailed(false);
    try {
      const result = await apiRequest(endpoint, method, values);
      setInvitation(result?.invitationUrl ?? "");
      setFeedback(result?.message ?? "Salvo com sucesso.");
      if (method === "POST" && fields.length) form.reset();
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (error) {
      setFailed(true);
      setFeedback(error instanceof Error ? error.message : "Falha na conexão.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map((field) =>
        field.type === "hidden" ? (
          <input
            key={field.name}
            type="hidden"
            name={field.name}
            value={field.value}
          />
        ) : (
          <div className="space-y-2" key={field.name}>
            <Label htmlFor={`${endpoint}-${field.name}`}>{field.label}</Label>
            {field.type === "textarea" ? (
              <Textarea
                id={`${endpoint}-${field.name}`}
                name={field.name}
                defaultValue={field.value}
                required={field.required}
              />
            ) : field.type === "select" ? (
              <select
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                id={`${endpoint}-${field.name}`}
                name={field.name}
                defaultValue={field.value}
                required={field.required}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={`${endpoint}-${field.name}`}
                name={field.name}
                type={field.type ?? "text"}
                defaultValue={field.value}
                required={field.required}
                autoComplete={
                  field.type === "password" ? "new-password" : undefined
                }
              />
            )}
          </div>
        ),
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : submitLabel}
      </Button>
      {feedback && (
        <p
          role={failed ? "alert" : "status"}
          className={`text-sm ${failed ? "text-destructive" : "text-accent-foreground"}`}
        >
          {feedback}
        </p>
      )}
      {invitation && (
        <div className="rounded-lg border border-border bg-muted p-3 text-sm">
          <p className="mb-2">
            Compartilhe este convite com a pessoa convidada:
          </p>
          <a className="break-all text-primary underline" href={invitation}>
            {invitation}
          </a>
        </div>
      )}
    </form>
  );
}
