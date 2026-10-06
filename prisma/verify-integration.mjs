import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { del } from "@vercel/blob";

const db = new PrismaClient();
const base = process.env.LUME_TEST_URL ?? "http://localhost:3000";
const suffix = randomBytes(8).toString("hex");
const accounts = [];
let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}
class Client {
  cookies = new Map();
  async fetch(route, options = {}) {
    const headers = new Headers(options.headers);
    headers.set(
      "Cookie",
      [...this.cookies].map(([k, v]) => k + "=" + v).join("; "),
    );
    if (options.method && options.method !== "GET") headers.set("Origin", base);
    const response = await fetch(base + route, {
      ...options,
      headers,
      redirect: "manual",
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const split = pair.indexOf("=");
      this.cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    return response;
  }
  async api(route, method = "GET", values, expected = 200) {
    const response = await this.fetch("/api/" + route, {
      method,
      ...(values !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          }
        : {}),
    });
    const body = await response.json();
    assert.equal(response.status, expected, JSON.stringify(body));
    checks++;
    return body.data;
  }
  async form(route, values) {
    const page = await this.fetch(route);
    const html = await page.text();
    const form = new FormData();
    for (const tag of html.matchAll(/<input\b[^>]*>/g)) {
      const name = tag[0].match(/name="([^"]+)"/)?.[1];
      const value = tag[0].match(/value="([^"]*)"/)?.[1] ?? "";
      if (name?.startsWith("$ACTION"))
        form.set(
          name,
          value.replaceAll("&quot;", '"').replaceAll("&amp;", "&"),
        );
    }
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    const response = await this.fetch(route, { method: "POST", body: form });
    assert.equal(response.status, 303, (await response.text()).slice(0, 600));
    checks++;
    return response.headers.get("location");
  }
}
async function register(label) {
  const email = `integration-${suffix}-${label}@example.test`;
  accounts.push(email);
  const client = new Client();
  await client.form("/cadastro", {
    name: "Teste Integração " + label,
    email,
    password: "Lume-test-" + suffix,
  });
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  check(
    user.passwordHash?.startsWith("scrypt:"),
    "Senha precisa estar protegida.",
  );
  check(
    !user.passwordHash.includes("Lume-test"),
    "Senha não pode estar em texto puro.",
  );
  return { client, email, user };
}
try {
  const owner = await register("owner");
  const outsider = await register("outsider");
  const { client } = owner;
  const scope = await client.api("workspace");
  await new Client().api("health", "GET", undefined, 401);
  await client.api("health");
  await outsider.client.api(
    "bugs?projectId=" + scope.projectId,
    "GET",
    undefined,
    404,
  );
  await client.api("workspace", "PATCH", {
    organizationName: "Workspace verificado",
    projectName: "Projeto verificado",
  });
  await client.api("bugs", "POST", { title: "curto" }, 422);
  const report = {
    title: "Falha no checkout de integração",
    description: "Pagamento confirmado não retorna confirmação ao cliente.",
    module: "Checkout",
    priority: "CRITICAL",
    severity: "MAJOR",
    environment: "Homologação",
    version: "1.0.0",
    reproductionSteps: ["Abrir o checkout", "Confirmar o pagamento"],
    expectedResult: "Pedido confirmado",
    actualResult: "Resposta incorreta",
    technicalContext: "Teste isolado de persistência",
    evidenceCount: 0,
  };
  const bug = await client.api("bugs", "POST", report, 201);
  await client.api(
    "bugs/" + bug.friendlyId + "/status",
    "PATCH",
    { status: "CLOSED" },
    422,
  );
  const release = await client.api(
    "releases",
    "POST",
    { name: "Versão de teste", version: "1.0.0" },
    201,
  );
  await client.api("bugs/" + bug.friendlyId, "PATCH", {
    releaseId: release.id,
  });
  await client.api(
    "bugs/" + bug.friendlyId + "/comments",
    "POST",
    { body: "Comentário de integração" },
    201,
  );
  const upload = new FormData();
  upload.set(
    "file",
    new Blob(["Evidência de integração"], { type: "text/plain" }),
    "evidence.txt",
  );
  const uploaded = await client.fetch(
    "/api/bugs/" + bug.friendlyId + "/attachments",
    { method: "POST", body: upload },
  );
  assert.equal(uploaded.status, 201, await uploaded.clone().text());
  checks++;
  const attachment = (await uploaded.json()).data;
  const download = await client.fetch("/api/attachments/" + attachment.id);
  check(
    (await download.text()) === "Evidência de integração",
    "Arquivo deve ser recuperado sem alteração.",
  );
  await outsider.client.api(
    "attachments/" + attachment.id,
    "GET",
    undefined,
    404,
  );
  const test = await client.api(
    "tests",
    "POST",
    {
      title: "Pagamento confirmado",
      module: "Checkout",
      priority: "HIGH",
      steps: [
        { action: "Efetuar pagamento", expectedResult: "Confirmação exibida" },
      ],
    },
    201,
  );
  const run = await client.api(
    "runs",
    "POST",
    { name: "Ciclo de validação", releaseId: release.id },
    201,
  );
  const runs = await client.api("runs");
  const execution = runs.find((r) => r.id === run.id).executions[0];
  check(
    execution.testCase.friendlyId === test.friendlyId,
    "Execução deve referenciar o caso persistido.",
  );
  await client.api("executions/" + execution.id, "PATCH", {
    status: "FAILED",
    notes: "Erro reproduzido",
  });
  await client.api("releases/" + release.id + "/publish", "POST", {}, 422);
  await client.api("executions/" + execution.id, "PATCH", { status: "PASSED" });
  await client.api("releases/" + release.id + "/publish", "POST", {}, 422);
  for (const status of [
    "IN_PROGRESS",
    "READY_FOR_QA",
    "TESTING",
    "RESOLVED",
    "CLOSED",
  ])
    await client.api("bugs/" + bug.friendlyId + "/status", "PATCH", { status });
  await client.api("releases/" + release.id + "/publish", "POST", {});
  await client.api(
    "executions/" + execution.id,
    "PATCH",
    { status: "FAILED" },
    409,
  );
  await client.api(
    "runs",
    "POST",
    { name: "Ciclo após publicação", releaseId: release.id },
    422,
  );
  await client.api("releases/" + release.id + "/publish", "POST", {}, 409);
  const detail = await client.api("bugs/" + bug.friendlyId);
  check(
    detail.comments.length === 1 && detail.attachments.length === 1,
    "Detalhes devem incluir evidência e comentário.",
  );
  check(
    detail.history.length >= 8,
    "Histórico precisa registrar as operações.",
  );
  const summary = await client.api("summary");
  check(
    summary.activeBugs === 0 && summary.passRate === 100,
    "Indicadores devem refletir os registros.",
  );
  const invitation = await client.api(
    "team",
    "POST",
    { email: outsider.email, role: "VIEWER" },
    201,
  );
  const token = invitation.invitationUrl.split("/").at(-1);
  await outsider.client.api("invitations/" + token, "POST", {});
  await outsider.client.api("bugs", "POST", report, 403);
  await outsider.client.api(
    "team",
    "POST",
    { email: "forbidden@example.test", role: "OWNER" },
    403,
  );
  await outsider.client.api("invitations/" + token, "POST", {}, 410);
  const notifications = await client.api("notifications");
  check(
    notifications.some((n) => n.type === "RELEASE"),
    "Publicação deve gerar notificação.",
  );
  await client.api("notifications", "PATCH", {});
  check(
    (await client.api("notifications")).every((n) => n.readAt),
    "Notificações devem ser marcadas como lidas.",
  );
  for (const route of [
    "/dashboard",
    "/bugs",
    "/bugs/" + bug.friendlyId,
    "/kanban",
    "/testes",
    "/releases",
    "/analytics",
    "/quality-map",
    "/projetos",
    "/equipe",
    "/perfil",
    "/configuracoes",
    "/notificacoes",
  ]) {
    const response = await client.fetch(route);
    check(response.status === 200, route + " deve abrir.");
    const html = await response.text();
    check(
      !html.includes("NEXT_HTTP_ERROR_FALLBACK;500"),
      route + " não pode ter erro interno.",
    );
  }
  const oldSession = client.cookies.get("lume_session");
  await client.api("profile", "PATCH", {
    name: "Conta atualizada",
    email: owner.email,
    currentPassword: "Lume-test-" + suffix,
    password: "Updated-test-" + suffix,
  });
  const expired = new Client();
  expired.cookies.set("lume_session", oldSession);
  await expired.api("profile", "GET", undefined, 401);
  const login = new Client();
  await login.form("/login", {
    email: owner.email,
    password: "Updated-test-" + suffix,
  });
  await login.api("health");
  const recoveryToken = randomBytes(32).toString("hex");
  await db.passwordReset.create({
    data: {
      userId: owner.user.id,
      tokenHash: createHash("sha256").update(recoveryToken).digest("hex"),
      expiresAt: new Date(Date.now() + 300000),
    },
  });
  await login.api(
    "auth/reset",
    "POST",
    { token: "inválido", password: "Recovery-test-" + suffix },
    422,
  );
  await login.api("auth/reset", "POST", {
    token: recoveryToken,
    password: "Recovery-test-" + suffix,
  });
  await login.api("health", "GET", undefined, 401);
  await login.api(
    "auth/reset",
    "POST",
    { token: recoveryToken, password: "Recovery-test-" + suffix },
    410,
  );
  const recovered = new Client();
  await recovered.form("/login", {
    email: owner.email,
    password: "Recovery-test-" + suffix,
  });
  await recovered.api("health");
  const wrongOrigin = await fetch(base + "/api/bugs", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
      Cookie: [...recovered.cookies].map(([k, v]) => k + "=" + v).join("; "),
    },
    body: JSON.stringify(report),
  });
  check(
    wrongOrigin.status === 403,
    "Requisição de outro site deve ser recusada.",
  );
  console.log(`Integração concluída: ${checks} verificações passaram.`);
} finally {
  // Exclusão restrita aos IDs associados aos e-mails aleatórios criados neste teste.
  const users = await db.user.findMany({ where: { email: { in: accounts } } });
  const orgs = await db.organization.findMany({
    where: {
      members: {
        some: { userId: { in: users.map((u) => u.id) }, role: "OWNER" },
      },
    },
    select: { id: true },
  });
  const orgIds = orgs.map((o) => o.id);
  const files = await db.bugAttachment.findMany({
    where: { bug: { project: { organizationId: { in: orgIds } } } },
    select: { storageKey: true },
  });
  for (const file of files) {
    if (file.storageKey && /^blob:[a-f0-9-]{36}$/.test(file.storageKey)) {
      await del(`evidencias/${file.storageKey.slice(5)}`);
    }
    if (file.storageKey && /^[a-f0-9-]{36}$/.test(file.storageKey)) {
      await unlink(
        path.join(
          process.env.LUME_STORAGE_PATH || path.join(process.cwd(), ".storage"),
          file.storageKey,
        ),
      ).catch(() => {});
    }
  }
  await db.$transaction(async (tx) => {
    await tx.testRun.deleteMany({
      where: { project: { organizationId: { in: orgIds } } },
    });
    await tx.invitation.deleteMany({
      where: { organizationId: { in: orgIds } },
    });
    await tx.organization.deleteMany({ where: { id: { in: orgIds } } });
    await tx.user.deleteMany({
      where: { id: { in: users.map((u) => u.id) }, email: { in: accounts } },
    });
  });
  await db.$disconnect();
}
