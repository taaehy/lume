import {
  ArrowRight,
  Map,
  ScanLine,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { LumeLogo } from "@/components/lume-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: ScanSearch,
    title: "Problemas melhor descritos",
    text: "Quality Score e análise local mostram o que falta antes de um bug chegar ao time.",
  },
  {
    icon: Map,
    title: "Risco visível por módulo",
    text: "O Quality Map combina bugs, severidade, reaberturas e falhas de teste.",
  },
  {
    icon: ShieldCheck,
    title: "Histórico em que confiar",
    text: "Transições, autoria e decisões ficam registradas em uma timeline imutável.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="mx-auto flex h-20 max-w-7xl items-center px-5 sm:px-8">
        <LumeLogo />
        <nav className="ml-auto hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#produto">Produto</a>
          <a href="#qualidade">Quality Map</a>
          <a href="#arquitetura">Arquitetura</a>
        </nav>
        <div className="ml-auto md:ml-6">
          <ThemeToggle />
        </div>
        <Link
          href="/dashboard"
          className="ml-2 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Explorar demo
        </Link>
      </header>
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-24 pt-14 sm:px-8 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
            <div className="py-12 lg:py-20">
              <p className="eyebrow flex items-center gap-3 text-primary">
                <span className="h-px w-8 bg-primary" />
                Operação de qualidade / sistema 01
              </p>
              <h1 className="mt-7 max-w-3xl text-balance text-5xl font-bold leading-[1.01] tracking-[-0.06em] sm:text-6xl lg:text-[68px]">
                Qualidade clara, da triagem até a release.
              </h1>
              <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
                Bugs, testes, evidências e releases conectados em uma operação
                clara — da descoberta à decisão de publicar.
              </p>
              <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center">
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center gap-3 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                >
                  Abrir demonstração
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#produto"
                  className="text-sm underline decoration-primary decoration-2 underline-offset-4"
                >
                  Conhecer o método
                </a>
              </div>
            </div>
            <aside className="rounded-2xl border border-border bg-card p-7 lg:self-center">
              <div className="flex items-start justify-between border-b border-border pb-5">
                <div>
                  <p className="eyebrow">Sinal de release</p>
                  <p className="mt-2 text-sm font-medium">Atlas / 2.4.0</p>
                </div>
                <span className="border border-amber-500/35 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-amber-600 dark:text-amber-300">
                  Em risco
                </span>
              </div>
              <div className="divide-y divide-border">
                {[
                  ["87", "Quality Score"],
                  ["94,5%", "Testes aprovados"],
                  ["03", "Bugs críticos"],
                  ["18h", "Tempo médio"],
                ].map(([value, label], index) => (
                  <div
                    key={label}
                    className="flex items-end justify-between py-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-primary">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                    </div>
                    <span className="font-mono text-2xl font-medium tracking-tight">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
        <section id="produto" className="border-y border-border bg-muted/45">
          <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 sm:px-8 lg:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="rounded-xl border border-border bg-card p-7 shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-primary">
                    0{index + 1}
                  </span>
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mt-8 max-w-[15rem] text-xl font-semibold leading-tight">
                  {feature.title}
                </h2>
                <p className="mt-3 max-w-xs leading-7 text-muted-foreground">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="qualidade"
          className="mx-auto max-w-7xl px-5 py-24 sm:px-8"
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-primary">Decisões explicáveis</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Qualidade não deveria ser uma caixa-preta.
              </h2>
              <p className="mt-5 max-w-xl leading-8 text-muted-foreground">
                Cada score mostra os sinais que o formaram. Cada mudança
                preserva autoria e contexto. O time ganha velocidade sem perder
                confiança.
              </p>
              <ul className="mt-8 divide-y divide-border border-y border-border text-sm">
                {[
                  "Fórmulas determinísticas e versionadas",
                  "RBAC validado no servidor",
                  "Provider local para análise de bugs",
                  "Histórico append-only",
                ].map((item, index) => (
                  <li key={item} className="flex items-center gap-4 py-3.5">
                    <span className="font-mono text-[9px] text-primary">
                      0{index + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div id="arquitetura" className="border-y border-border px-1 py-6">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <ScanLine className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  quality-map / risco por módulo
                </span>
              </div>
              {[
                ["Checkout", 82],
                ["Identidade", 58],
                ["Pedidos", 41],
                ["Perfil", 17],
              ].map(([module, value]) => (
                <div key={module} className="mt-5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{module}</span>
                    <span className="font-mono text-muted-foreground">
                      {value}%
                    </span>
                  </div>
                  <div className="h-1 bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-8 text-xs text-muted-foreground sm:px-8">
          <span>© 2026 Lume</span>
          <span>Qualidade com contexto.</span>
        </div>
      </footer>
    </div>
  );
}
