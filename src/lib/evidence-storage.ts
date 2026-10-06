import "server-only";
import { put, get, del } from "@vercel/blob";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { HttpError } from "@/lib/http-error";

const localStorage = path.resolve(
  /* turbopackIgnore: true */
  process.env.LUME_STORAGE_PATH || path.join(process.cwd(), ".storage"),
);
const validKey =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export async function saveEvidence(
  key: string,
  bytes: Buffer,
  contentType: string,
) {
  if (!validKey.test(key)) throw new HttpError(422, "Identificador inválido.");
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(`evidencias/${key}`, bytes, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType,
    });
    return `blob:${key}`;
  }
  if (process.env.VERCEL === "1") {
    throw new HttpError(
      503,
      "O armazenamento de evidências não está configurado.",
    );
  }
  await mkdir(localStorage, { recursive: true });
  await writeFile(
    path.join(/* turbopackIgnore: true */ localStorage, key),
    bytes,
    { flag: "wx" },
  );
  return key;
}

export async function loadEvidence(storageKey: string) {
  const remote = storageKey.startsWith("blob:");
  const key = remote ? storageKey.slice(5) : storageKey;
  if (!validKey.test(key)) throw new HttpError(404, "Arquivo não encontrado.");
  if (remote) {
    const result = await get(`evidencias/${key}`, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200)
      throw new HttpError(404, "Arquivo não encontrado.");
    return result.stream;
  }
  return readFile(
    /* turbopackIgnore: true */
    path.join(/* turbopackIgnore: true */ localStorage, key),
  );
}

export async function removeEvidence(storageKey: string) {
  const remote = storageKey.startsWith("blob:");
  const key = remote ? storageKey.slice(5) : storageKey;
  if (!validKey.test(key)) return;
  if (remote) await del(`evidencias/${key}`);
  else await unlink(path.join(/* turbopackIgnore: true */ localStorage, key));
}
