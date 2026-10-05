# Lume

O Lume organiza o trabalho de QA e desenvolvimento: bugs com contexto, evidências, casos de teste e decisões de release no mesmo projeto.

A aplicação utiliza PostgreSQL e uma API própria. Cadastro, projetos, bugs, Kanban, testes, releases, equipe, perfil e notificações gravam dados no banco. Os indicadores são calculados a partir desses registros; não há mais uma fonte de dados fictícios na interface.

## Recursos disponíveis

- Cadastro com criação de organização e projeto, login por e-mail e senha e encerramento de sessão.
- Senhas protegidas com scrypt, sessão em cookie HttpOnly e invalidação das sessões após troca de senha.
- Projetos com seleção de contexto e autorização por organização, projeto e papel.
- Bugs com ID sequencial, busca paginada, edição, responsáveis, release vinculada, comentários e histórico.
- Kanban persistente, transições de status verificadas e motivo obrigatório para reabertura.
- Upload privado de evidências e download autenticado. Até 10 arquivos por bug, com limite de 20 MB por arquivo.
- Casos de teste, ciclos de execução e registro dos resultados. Uma falha pode ser vinculada a um bug.
- Releases com critérios de publicação, pontuação registrada e proteção dos resultados após a publicação.
- Convites com prazo e uso único, notificações e atualização do perfil.
- Dashboard, indicadores e risco por módulo calculados com dados reais.

Google, GitHub e recuperação de senha estão implementados, mas exigem credenciais externas. Sem configuração, os provedores ficam indisponíveis e o envio de e-mails retorna uma mensagem clara. Essas integrações ainda não foram validadas com contas externas reais.

O módulo de testes registra execuções de QA. Ele não dispara automaticamente uma suíte de CI/CD nem substitui o executor de testes da aplicação que está sendo avaliada.

## Executar localmente

Requisitos: Node.js 22.9 ou superior, pnpm na versão indicada em package.json e PostgreSQL. O desenvolvimento local foi verificado com PostgreSQL 18.6.

```powershell
corepack pnpm install
Copy-Item .env.example .env
```

Copie o exemplo apenas na primeira configuração. Não sobrescreva um arquivo que já contenha sua conexão ou credenciais. Ajuste DATABASE_URL e AUTH_SECRET; mantenha a conexão consistente se também usar .env.local.

Em um banco novo, aplique as migrações e gere o cliente:

```powershell
corepack pnpm prisma:deploy
corepack pnpm prisma:generate
corepack pnpm dev
```

Abra [localhost:3000](http://localhost:3000) e crie sua conta. O cadastro já cria o primeiro workspace; não é necessário carregar dados de demonstração.

O banco local existente foi atualizado sem exclusão dos registros e já possui a migração inicial registrada. Não execute uma reinicialização do banco para atualizar este ambiente.

### Demonstração opcional

```powershell
corepack pnpm prisma:seed
```

O seed cria o projeto Atlas e os registros de exemplo sem substituir os registros existentes. A conta de QA é marina@norte.dev, com senha lume-demo em uma instalação nova. A variável LUME_DEMO_PASSWORD permite escolher outra senha inicial. O seed não redefine senhas de contas existentes; não use essas credenciais em produção.

O arquivo Compose é uma alternativa à instalação local do PostgreSQL. Não execute ambos na porta 5432.

## Configuração

As variáveis disponíveis estão em [.env.example](.env.example).

| Variável                                | Uso                                                     |
| --------------------------------------- | ------------------------------------------------------- |
| DATABASE_URL                            | Conexão com o PostgreSQL                                |
| AUTH_SECRET                             | Assinatura da sessão; obrigatório em produção           |
| APP_URL                                 | Origem confiável para callbacks, convites e recuperação |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | Login com Google                                        |
| GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET | Login com GitHub                                        |
| RESEND_API_KEY / EMAIL_FROM             | Envio de mensagens transacionais                        |
| LUME_STORAGE_PATH                       | Pasta privada das evidências; padrão .storage           |
| LUME_DEMO_PASSWORD                      | Senha inicial das contas do seed opcional               |

Credenciais devem permanecer em arquivos locais ignorados pelo Git. Nunca coloque segredos em variáveis NEXT_PUBLIC_. O Next.js prioriza .env.local; os comandos do Prisma usam .env.

Para o login externo local, os callbacks são http://localhost:3000/api/auth/google/callback e http://localhost:3000/api/auth/github/callback. Uma conta existente deve entrar por senha e vincular o provedor no perfil. O sistema não vincula identidades apenas por coincidência de e-mail.

## Backend

O backend faz parte do Next.js. A API responde em JSON, valida as entradas e verifica a sessão e os vínculos de acesso antes de consultar o Prisma.

| Endpoint                                           | Operações                          |
| -------------------------------------------------- | ---------------------------------- |
| /api/health                                        | Verificação autenticada da conexão |
| /api/projects                                      | Lista e criação de projetos        |
| /api/projects/:id/select                           | Seleção de projeto                 |
| /api/bugs                                          | Lista paginada e criação           |
| /api/bugs/:id                                      | Detalhes e edição                  |
| /api/bugs/:id/status                               | Alteração de status                |
| /api/bugs/:id/comments                             | Comentários                        |
| /api/bugs/:id/attachments                          | Upload                             |
| /api/attachments/:id                               | Download privado                   |
| /api/tests / /api/runs / /api/executions/:id       | Casos, ciclos e resultados         |
| /api/releases / /api/releases/:id/publish          | Planejamento e publicação          |
| /api/team / /api/invitations/:token                | Convites e aceite                  |
| /api/profile / /api/workspace / /api/notifications | Conta, workspace e notificações    |
| /api/summary                                       | Indicadores do projeto             |

As respostas usam data para sucesso e error para falha. A lista de bugs aceita page, limit, search, status e priority. O parâmetro projectId permite escolher explicitamente um projeto ao qual a conta tenha acesso.

A API foi verificada localmente; isso não representa uma garantia de latência ou capacidade sob carga.

## Verificação

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Com o servidor local em execução:

```powershell
corepack pnpm test:integration
```

O teste de integração cria contas e projetos isolados, percorre os fluxos reais e remove apenas os registros temporários que criou. Não envia e-mails nem usa contas reais nos provedores externos.

## Organização

src/app contém as rotas públicas, a área autenticada e a API. src/components reúne a interface. src/lib/auth trata contas, sessões e provedores; src/lib/data concentra consultas e operações persistentes; src/lib/domain contém as regras de pontuação e workflow.

prisma contém o esquema, as migrações, o seed opcional e o teste de integração. [docs/architecture.md](docs/architecture.md) registra as decisões técnicas.

## Antes de publicar

Configure as credenciais dos provedores, confirme o remetente de e-mail e use HTTPS com um segredo de sessão forte. O armazenamento de evidências precisa de um volume persistente e backup junto ao banco.

Ainda são necessários testes de carga, monitoramento de produção, política de retenção de arquivos e revisão de segurança do ambiente de implantação. O projeto não foi publicado durante esta implementação.

## Licença

O repositório ainda não possui uma licença de distribuição.
