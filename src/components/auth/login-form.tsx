"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Github, LockKeyhole, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";

export function LoginForm({
  providers,
  error,
}: {
  providers: { google: boolean; github: boolean };
  error?: string;
}) {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <Label htmlFor="login-email" className="sr-only">
          E-mail de trabalho
        </Label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-amber-600" />
          <Input
            id="login-email"
            name="email"
            type="email"
            placeholder="Seu e-mail de trabalho"
            autoComplete="email"
            aria-describedby="login-email-error"
            className="h-15 rounded-full border-amber-300/65 bg-white/65 pl-14 pr-6 text-base shadow-none focus-visible:ring-amber-500"
            required
          />
        </div>
        {state.errors?.email?.[0] && (
          <p
            id="login-email-error"
            className="mt-2 px-4 text-xs text-destructive"
          >
            {state.errors.email[0]}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="login-password" className="sr-only">
          Senha
        </Label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-amber-600" />
          <Input
            id="login-password"
            name="password"
            type="password"
            placeholder="Sua senha"
            autoComplete="current-password"
            aria-describedby="login-password-error"
            className="h-15 rounded-full border-amber-300/65 bg-white/65 pl-14 pr-6 text-base shadow-none focus-visible:ring-amber-500"
            required
          />
        </div>
        {state.errors?.password?.[0] && (
          <p
            id="login-password-error"
            className="mt-2 px-4 text-xs text-destructive"
          >
            {state.errors.password[0]}
          </p>
        )}
        <div className="mt-3 text-right">
          <Link
            href="/recuperar-senha"
            className="text-sm font-semibold text-[#28334a] hover:text-amber-700"
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>
      {(state.message || error) && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-xs text-destructive"
        >
          {state.message || error}
        </p>
      )}
      <Button
        type="submit"
        className="auth-submit h-15 w-full rounded-full text-base font-bold"
        disabled={pending}
      >
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <div className="flex items-center gap-4 py-2" aria-hidden="true">
        <span className="h-px flex-1 bg-[#e4e2d9]" />
        <span className="text-sm font-bold text-[#101a35]">OU</span>
        <span className="h-px flex-1 bg-[#e4e2d9]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {providers.google ? (
          <Link
            prefetch={false}
            href="/api/auth/google"
            className="flex h-13 items-center justify-center gap-3 rounded-full border bg-white text-sm font-semibold text-[#28334a]"
          >
            <span className="text-xl font-bold text-amber-600">G</span>Google
          </Link>
        ) : (
          <button
            disabled
            title="Google aguarda configuração."
            className="h-13 rounded-full border bg-white text-sm text-muted-foreground"
          >
            Google
          </button>
        )}
        {providers.github ? (
          <Link
            prefetch={false}
            href="/api/auth/github"
            className="auth-github flex h-13 items-center justify-center gap-3 rounded-full text-sm font-semibold"
          >
            <Github className="size-5" />
            GitHub
          </Link>
        ) : (
          <button
            disabled
            title="GitHub aguarda configuração."
            className="auth-github h-13 rounded-full text-sm opacity-50"
          >
            GitHub
          </button>
        )}
      </div>
      {(!providers.google || !providers.github) && (
        <p className="text-center text-xs text-muted-foreground">
          Os provedores indisponíveis aguardam configuração. Entre com e-mail e
          senha.
        </p>
      )}
    </form>
  );
}
