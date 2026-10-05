"use client";

import {
  Bell,
  Boxes,
  Bug,
  ChartNoAxesCombined,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Plus,
  Search,
  Settings,
  Ship,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LumeLogo } from "@/components/lume-logo";
import { CommandPalette } from "@/components/product/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/lib/auth/actions";
import type { Role } from "@/lib/auth/permissions";

const navigation = [
  { label: "Visão geral", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Bugs", icon: Bug, href: "/bugs" },
  { label: "Kanban", icon: Boxes, href: "/kanban" },
  { label: "Testes", icon: FlaskConical, href: "/testes" },
  { label: "Releases", icon: Ship, href: "/releases" },
  { label: "Quality Map", icon: Map, href: "/quality-map" },
  { label: "Analytics", icon: ChartNoAxesCombined, href: "/analytics" },
];

const roleLabels: Record<Role, string> = {
  OWNER: "Proprietária",
  ADMIN: "Administradora",
  QA: "Líder de QA",
  DEVELOPER: "Desenvolvedora",
  VIEWER: "Observadora",
};

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: Role };
}) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
  const activeNavigation = navigation.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] bg-sidebar text-white lg:flex lg:flex-col">
        <div className="flex h-[88px] items-center border-b border-white/8 px-7">
          <LumeLogo inverted />
        </div>
        <nav className="mt-7 space-y-2" aria-label="Navegação principal">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={
                activeNavigation?.href === item.href ? "page" : undefined
              }
              className={`nav-item ${activeNavigation?.href === item.href ? "nav-item-active" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-white/8 py-4">
          <Link href="/equipe" className="nav-item">
            <Users className="h-4 w-4" />
            Equipe
          </Link>
          <Link href="/configuracoes" className="nav-item">
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
          <div className="mx-5 mt-4 flex items-center gap-2 border-t border-white/8 pt-5">
            <Link
              href="/perfil"
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-teal-500/20 text-[10px] font-semibold text-white">
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-white">
                  {user.name}
                </span>
                <span className="block truncate text-[10px] text-white/45">
                  {roleLabels[user.role]}
                </span>
              </span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sair da conta"
                title="Sair da conta"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-border bg-card px-4 sm:px-7">
          <div className="lg:hidden">
            <LumeLogo compact />
          </div>
          <details className="group relative lg:hidden">
            <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Abrir navegação</span>
            </summary>
            <nav
              className="absolute left-0 top-12 w-56 rounded-xl border border-white/10 bg-sidebar p-2 text-white shadow-xl"
              aria-label="Navegação móvel"
            >
              {navigation.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={
                    activeNavigation?.href === item.href ? "page" : undefined
                  }
                  className={`nav-item ${activeNavigation?.href === item.href ? "nav-item-active" : ""}`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </details>
          <span className="hidden text-sm font-semibold lg:block">
            {activeNavigation?.label ?? "Lume"}
          </span>
          <span className="hidden h-5 w-px bg-border lg:block" />
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden h-10 min-w-80 items-center gap-2 rounded-xl border border-border bg-background px-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground md:flex"
          >
            <Search className="h-4 w-4" />
            Navegação rápida
            <span className="ml-auto rounded-md border border-border bg-card px-1.5 py-0.5 text-[9px]">
              ⌘ K
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/notificacoes"
              aria-label="Abrir notificações"
              className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <form action={logoutAction} className="lg:hidden">
              <button
                type="submit"
                aria-label="Sair da conta"
                title="Sair da conta"
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
            <Link
              href="/bugs/new"
              className="ml-2 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Novo bug
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
