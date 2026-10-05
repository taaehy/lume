import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { HttpError } from "@/lib/http-error";
export async function consumeRateLimit(
  label: string,
  identity: string,
  limit = 8,
  windowMs = 900000,
) {
  const bucket = Math.floor(Date.now() / windowMs);
  await prisma.rateWindow.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  const key = createHash("sha256")
    .update(label + ":" + identity + ":" + bucket)
    .digest("hex");
  const result = await prisma.rateWindow.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date((bucket + 1) * windowMs) },
    update: { count: { increment: 1 } },
  });
  if (result.count > limit)
    throw new HttpError(
      429,
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    );
}
