"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "@/lib/auth/actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, {});

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="register-name">Nome</Label>
        <Input
          id="register-name"
          name="name"
          placeholder="Seu nome completo"
          autoComplete="name"
          aria-describedby="register-name-error"
          required
        />
        {state.errors?.name?.[0] && (
          <p id="register-name-error" className="text-xs text-destructive">
            {state.errors.name[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-email">E-mail profissional</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          aria-describedby="register-email-error"
          required
        />
        {state.errors?.email?.[0] && (
          <p id="register-email-error" className="text-xs text-destructive">
            {state.errors.email[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-password">Senha</Label>
        <Input
          id="register-password"
          name="password"
          type="password"
          placeholder="Mínimo de 10 caracteres"
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          aria-describedby="register-password-error"
          required
        />
        {state.errors?.password?.[0] && (
          <p id="register-password-error" className="text-xs text-destructive">
            {state.errors.password[0]}
          </p>
        )}
      </div>
      {state.message && (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>
      <p className="text-center text-[11px] leading-5 text-muted-foreground">
        Sua conta e seu espaço de trabalho serão criados ao continuar.
      </p>
    </form>
  );
}
