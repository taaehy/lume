import { z } from "zod";

export const bugReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, "Use um título com pelo menos 8 caracteres.")
    .max(160, "O título deve ter no máximo 160 caracteres."),
  description: z
    .string()
    .trim()
    .min(20, "Explique o contexto e o impacto do problema.")
    .max(4_000, "A descrição deve ter no máximo 4.000 caracteres."),
  module: z.string().trim().min(2, "Selecione um módulo."),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  severity: z.enum(["TRIVIAL", "MINOR", "MAJOR", "CRITICAL", "BLOCKER"]),
  environment: z.string().trim().max(120),
  version: z.string().trim().max(80),
  reproductionSteps: z
    .array(z.string().trim().min(3))
    .min(1, "Inclua pelo menos um passo para reprodução."),
  expectedResult: z.string().trim().max(2_000),
  actualResult: z.string().trim().max(2_000),
  technicalContext: z.string().trim().max(4_000),
  evidenceCount: z.number().int().min(0).max(10),
});

export type BugReportValues = z.infer<typeof bugReportSchema>;
