"use client";

import {
  Bug,
  FlaskConical,
  Gauge,
  Map,
  Plus,
  Search,
  Ship,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const commands = [
  {
    label: "Abrir visão geral",
    hint: "Dashboard",
    href: "/dashboard",
    icon: Gauge,
  },
  { label: "Buscar bugs", hint: "Lista do projeto", href: "/bugs", icon: Bug },
  { label: "Criar novo bug", hint: "Ação", href: "/bugs/new", icon: Plus },
  {
    label: "Executar casos de teste",
    hint: "Suíte principal",
    href: "/testes",
    icon: FlaskConical,
  },
  {
    label: "Gerenciar releases",
    hint: "Versões e publicação",
    href: "/releases",
    icon: Ship,
  },
  {
    label: "Ver Quality Map",
    hint: "Risco por módulo",
    href: "/quality-map",
    icon: Map,
  },
] as const;

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.hint}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalized),
    );
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Fechar busca"
        className="absolute inset-0 bg-foreground/35 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Busca rápida"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
      >
        <label className="flex h-14 items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">
            Buscar bugs, testes, projetos ou releases
          </span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar bugs, testes, projetos ou releases..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            ESC
          </kbd>
        </label>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map((command) => (
            <Link
              key={command.label}
              href={command.href}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                <command.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">
                {command.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {command.hint}
              </span>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </p>
          )}
        </div>
        <footer className="flex items-center gap-4 border-t border-border bg-muted/35 px-4 py-2 font-mono text-[9px] text-muted-foreground">
          <span>ENTER abrir</span>
          <span>ESC fechar</span>
          <span>CTRL K alternar</span>
        </footer>
      </section>
    </div>
  );
}
