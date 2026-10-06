# Lume

Clareza para entregar melhor.

Uma plataforma de gestão de qualidade de software que reúne bugs, evidências, testes e releases em um só lugar. Projeto de portfólio com interface responsiva, API própria e dados persistidos em PostgreSQL.

[Acessar o Lume](https://lume-ecru-two.vercel.app) — crie uma conta para experimentar. A demonstração usa banco online e anexos privados de até 4 MB.

## O que você pode fazer

- Organizar bugs em uma lista ou no Kanban, com responsáveis, comentários e histórico.
- Anexar evidências e registrar resultados de testes.
- Acompanhar indicadores de qualidade e avaliar releases antes da publicação.
- Gerenciar projetos, convites e permissões de acesso.

## Tecnologias

Next.js · React · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Vitest

## Rodar localmente

Você precisa de Node.js 22.9+, pnpm e um banco PostgreSQL criado.

```powershell
corepack pnpm install
Copy-Item .env.example .env
```

Copie o exemplo apenas se ainda não tiver um `.env`. Configure `DATABASE_URL` e um `AUTH_SECRET` aleatório e longo. Em um banco novo:

```powershell
corepack pnpm prisma:deploy
corepack pnpm prisma:generate
corepack pnpm dev
```

Abra [localhost:3000](http://localhost:3000) e crie sua conta. Para carregar exemplos, use `corepack pnpm prisma:seed`.

## Testes

`corepack pnpm test` executa os testes unitários. Com a aplicação rodando, `corepack pnpm test:integration` verifica os fluxos com banco e API usando registros temporários.

## Escopo

O acesso por e-mail e senha está disponível na demonstração. Login com Google/GitHub e envio de e-mails são opcionais e não estão ativados. O módulo de testes registra execuções de QA; não executa pipelines de CI/CD.

As decisões técnicas e os cuidados para hospedagem estão em [Arquitetura](docs/architecture.md).
