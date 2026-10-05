import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    id: "demo-marina",
    name: "Marina Costa",
    email: "marina@norte.dev",
    role: "QA",
  },
  {
    id: "demo-caio",
    name: "Caio Ribeiro",
    email: "caio@norte.dev",
    role: "DEVELOPER",
  },
  {
    id: "demo-bianca",
    name: "Bianca Nunes",
    email: "bianca@norte.dev",
    role: "QA",
  },
  {
    id: "demo-rafael",
    name: "Rafael Lima",
    email: "rafael@norte.dev",
    role: "DEVELOPER",
  },
];

const bugs = [
  {
    friendlyId: "LUM-142",
    title: "Checkout PIX retorna erro após confirmação",
    description:
      "Clientes concluem o pagamento via PIX, mas o checkout mantém o pedido como pendente e exibe uma resposta 500.",
    module: "Checkout",
    environment: "Produção · Chrome 128 · Windows 11",
    version: "2.4.0-rc.3",
    priority: "CRITICAL",
    severity: "BLOCKER",
    status: "READY_FOR_QA",
    authorId: "demo-bianca",
    assigneeId: "demo-marina",
    reproductionSteps: [
      "Adicionar um produto ao carrinho.",
      "Selecionar PIX e confirmar o pedido.",
      "Pagar o QR Code e aguardar o webhook.",
    ],
    expectedResult: "O pedido deve ser confirmado e o recibo exibido.",
    actualResult: "A API responde 500 e o pedido permanece pendente.",
    technicalContext: "POST /api/orders retorna PAYMENT_PROVIDER_TIMEOUT.",
    qualityScore: 94,
  },
  {
    friendlyId: "LUM-139",
    title: "Sessão expira durante upload de avatar",
    description:
      "O upload interrompe a sessão quando a imagem demora mais que o tempo esperado.",
    module: "Identidade",
    environment: "Homologação · Safari 18",
    version: "2.4.0-rc.3",
    priority: "HIGH",
    severity: "MAJOR",
    status: "IN_PROGRESS",
    authorId: "demo-marina",
    assigneeId: "demo-caio",
    reproductionSteps: [
      "Abrir o perfil.",
      "Selecionar uma imagem com mais de 5 MB.",
      "Aguardar a conclusão do upload.",
    ],
    expectedResult: "O avatar deve ser atualizado sem encerrar a sessão.",
    actualResult: "A sessão expira e o usuário retorna para o login.",
    technicalContext: "A renovação do token não ocorre durante o upload.",
    qualityScore: 88,
  },
  {
    friendlyId: "LUM-137",
    title: "Filtro de pedidos ignora intervalo final",
    description:
      "Pedidos criados no último dia do intervalo não aparecem no resultado da busca.",
    module: "Pedidos",
    environment: "Produção · Chrome 128",
    version: "2.3.9",
    priority: "MEDIUM",
    severity: "MAJOR",
    status: "INVESTIGATING",
    authorId: "demo-bianca",
    assigneeId: "demo-bianca",
    reproductionSteps: [
      "Abrir a lista de pedidos.",
      "Selecionar um intervalo de sete dias.",
      "Comparar o último dia com o relatório diário.",
    ],
    expectedResult: "Todos os pedidos do intervalo devem ser exibidos.",
    actualResult: "O último dia não é incluído no resultado.",
    technicalContext: "O limite superior da consulta é exclusivo.",
    qualityScore: 91,
  },
  {
    friendlyId: "LUM-131",
    title: "Notificação duplicada após reprocessamento",
    description:
      "O reprocessamento de um evento envia a mesma notificação duas vezes.",
    module: "Mensageria",
    environment: "Produção",
    version: "2.3.8",
    priority: "HIGH",
    severity: "MAJOR",
    status: "REOPENED",
    authorId: "demo-marina",
    assigneeId: "demo-rafael",
    reproductionSteps: [
      "Publicar um evento de pedido.",
      "Forçar uma falha temporária no consumidor.",
      "Reprocessar a mensagem.",
    ],
    expectedResult: "Somente uma notificação deve ser enviada.",
    actualResult: "Duas notificações idênticas são recebidas.",
    technicalContext: "A chave de idempotência não é reutilizada no retry.",
    qualityScore: 90,
  },
];

async function main() {
  const salt = randomBytes(24).toString("hex");
  const passwordHash = `scrypt:${salt}:${scryptSync(process.env.LUME_DEMO_PASSWORD ?? "lume-demo", salt, 64).toString("hex")}`;
  const seededUsers = await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash,
        },
      }),
    ),
  );
  const userIdByEmail = new Map(
    seededUsers.map((user) => [user.email, user.id]),
  );

  function seededUserId(email) {
    const userId = userIdByEmail.get(email);
    if (!userId) throw new Error(`Usuário inicial não encontrado: ${email}`);
    return userId;
  }

  const organization = await prisma.organization.upsert({
    where: { slug: "norte-commerce" },
    update: {},
    create: { name: "Norte Commerce", slug: "norte-commerce" },
  });

  await Promise.all(
    users.map((user) =>
      prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: seededUserId(user.email),
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          userId: seededUserId(user.email),
          role: user.role,
        },
      }),
    ),
  );

  const project = await prisma.project.upsert({
    where: {
      organizationId_key: { organizationId: organization.id, key: "LUM" },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Atlas",
      key: "LUM",
      description: "Plataforma principal da Norte Commerce",
      bugSequence: 142,
    },
  });

  await Promise.all(
    users.map((user) =>
      prisma.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: seededUserId(user.email),
          },
        },
        update: {},
        create: {
          projectId: project.id,
          userId: seededUserId(user.email),
          role: user.role === "OWNER" ? "ADMIN" : user.role,
        },
      }),
    ),
  );

  for (const bug of bugs) {
    const author = users.find((user) => user.id === bug.authorId);
    const assignee = users.find((user) => user.id === bug.assigneeId);
    if (!author || !assignee) {
      throw new Error("Responsável da base demonstrativa não encontrado.");
    }
    const qualityBreakdown = {
      version: 1,
      source: "seed",
      score: bug.qualityScore,
    };
    const data = {
      projectId: project.id,
      ...bug,
      authorId: seededUserId(author.email),
      assigneeId: seededUserId(assignee.email),
      qualityBreakdown,
    };

    await prisma.bug.upsert({
      where: { friendlyId: bug.friendlyId },
      update: {},
      create: {
        ...data,
        history: {
          create: {
            actorId: data.authorId,
            type: "CREATED",
            toValue: bug.status,
          },
        },
      },
    });
  }

  console.log("Base demonstrativa do Lume criada com sucesso.");
}

main()
  .catch((error) => {
    console.error("Falha ao criar a base demonstrativa.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
