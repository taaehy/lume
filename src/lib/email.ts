import "server-only";
import { HttpError } from "@/lib/http-error";
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}
export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}) {
  if (!emailConfigured())
    throw new HttpError(503, "O envio de e-mails ainda não foi configurado.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new HttpError(
      502,
      "O serviço de e-mail não aceitou o envio. Confira a configuração.",
    );
}
