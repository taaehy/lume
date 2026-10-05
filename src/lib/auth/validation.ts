import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim(),
  password: z.string().min(1, "Informe sua senha.").max(128),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  email: z.email("Informe um e-mail profissional válido.").trim(),
  password: z
    .string()
    .min(10, "A senha deve ter pelo menos 10 caracteres.")
    .max(128, "A senha deve ter no máximo 128 caracteres."),
});

export type AuthFormState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};
