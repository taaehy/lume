import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { appOrigin } from "@/lib/auth/providers";
import { emailConfigured, sendTransactionalEmail } from "@/lib/email";
import { HttpError } from "@/lib/http-error";
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const response = (data: unknown) =>
  Response.json({ data }, { headers: { "Cache-Control": "no-store" } });
export async function passwordRecovery(request: Request, reset = false) {
  try {
    if (
      request.headers.get("origin") !== appOrigin() ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new HttpError(403, "Origem não autorizada.");
    if (!request.headers.get("content-type")?.includes("application/json"))
      throw new HttpError(415, "Envie JSON.");
    if (Number(request.headers.get("content-length") ?? 0) > 4096)
      throw new HttpError(413, "Requisição muito grande.");
    let raw;
    try {
      raw = await request.json();
    } catch {
      throw new HttpError(400, "JSON inválido.");
    }
    if (!reset) {
      if (!emailConfigured())
        throw new HttpError(
          503,
          "A recuperação de senha aguarda configuração do serviço de e-mail.",
        );
      const { email } = z
        .object({ email: z.email().transform((v) => v.toLowerCase()) })
        .parse(raw);
      await consumeRateLimit("recover", email, 3, 3600000);
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (user) {
        const token = randomBytes(32).toString("hex");
        const record = await prisma.passwordReset.create({
          data: {
            userId: user.id,
            tokenHash: digest(token),
            expiresAt: new Date(Date.now() + 1800000),
          },
        });
        try {
          await sendTransactionalEmail({
            to: email,
            subject: "Redefinir sua senha no Lume",
            text: `Você solicitou uma nova senha no Lume. Abra o link abaixo em até 30 minutos:\n\n${appOrigin()}/redefinir-senha?token=${token}\n\nSe não fez essa solicitação, ignore esta mensagem.`,
            idempotencyKey: "password-reset-" + record.id,
          });
        } catch (error) {
          await prisma.passwordReset.delete({ where: { id: record.id } });
          throw error;
        }
      }
      return response({
        message:
          "Se houver uma conta com esse e-mail, você receberá as instruções para redefinir sua senha.",
      });
    }
    const { token, password } = z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        password: z.string().min(10).max(128),
      })
      .parse(raw);
    await consumeRateLimit("reset", token, 8);
    const hash = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const record = await tx.passwordReset.findUnique({
        where: { tokenHash: digest(token) },
      });
      if (!record || record.usedAt || record.expiresAt <= new Date())
        throw new HttpError(
          410,
          "Link inválido, utilizado ou expirado. Solicite outro.",
        );
      const consumed = await tx.passwordReset.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (!consumed.count)
        throw new HttpError(410, "Este link já foi utilizado.");
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: hash,
          sessionVersion: { increment: 1 },
          emailVerified: new Date(),
        },
      });
      await tx.passwordReset.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    return response({
      message: "Senha atualizada. Entre novamente com sua nova senha.",
    });
  } catch (error) {
    if (error instanceof HttpError)
      return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError)
      return Response.json(
        { error: error.issues[0]?.message ?? "Confira os dados." },
        { status: 422 },
      );
    console.error(
      "Falha na recuperação de senha",
      error instanceof Error ? error.name : "UnknownError",
    );
    return Response.json(
      { error: "Não foi possível concluir. Tente novamente." },
      { status: 500 },
    );
  }
}
