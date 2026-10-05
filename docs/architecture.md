# Arquitetura do Lume

## Aplicação e dados

O Lume utiliza Next.js App Router, React e TypeScript. Interface e backend são executados no mesmo projeto, em runtime Node.js. Prisma acessa o PostgreSQL por um cliente compartilhado.

Server Components carregam dados autenticados. Client Components enviam alterações à API e atualizam a interface somente após a confirmação do servidor. Cadastro, login e criação de bugs também usam Server Actions.

O projeto selecionado é mantido em cookie HttpOnly. A camada workspaceScope verifica sessão, associação à organização, associação ao projeto e capacidade necessária. Um projectId recebido na requisição não é considerado prova de acesso.

## Autenticação

Contas e vínculos são persistidos. Senhas utilizam scrypt com sal aleatório. A sessão é assinada com HMAC-SHA256, tem validade de sete dias e usa cookie HttpOnly, SameSite=Lax e Secure em produção.

A consulta autenticada confirma a existência da conta e compara sessionVersion com a versão gravada no banco. Alteração ou recuperação de senha incrementa essa versão, invalidando sessões anteriores. O proxy faz o primeiro redirecionamento; a autorização efetiva ocorre no servidor, junto aos dados.

Login e recuperação possuem limitação de tentativas persistida no banco. O controle por conta não substitui proteção contra abuso no ambiente de implantação.

Google e GitHub utilizam autorização por código, PKCE e estado de uso único, associado ao navegador e armazenado no banco com expiração. O servidor consulta a identidade no provedor e exige e-mail verificado. Tokens de acesso externos não são armazenados.

Não há vinculação automática por e-mail. A associação de uma conta existente ocorre a partir de uma sessão autenticada, no perfil.

Recuperação utiliza token aleatório, com hash no banco, prazo de 30 minutos e consumo atômico. Mensagens são enviadas pela API do Resend. A confirmação real de entrega e o login com contas externas aguardam configuração dos serviços.

## Bugs e evidências

A criação incrementa a sequência do projeto e grava bug e histórico em uma transação. Alterações de status validam o workflow e usam status e updatedAt para rejeitar atualizações concorrentes obsoletas. Reabertura exige justificativa.

A edição verifica os vínculos do responsável e da release. Comentários e evidências geram histórico. A pontuação do relato considera anexos efetivamente persistidos, não a quantidade declarada pelo navegador.

Os arquivos são gravados em uma pasta privada, com nome aleatório. A API verifica tipos, tamanho e assinaturas dos formatos binários. O download exige acesso ao projeto, evita caminhos informados pelo cliente e usa Content-Disposition e nosniff. Este armazenamento local requer volume persistente em produção; não há serviço de object storage nem varredura antimalware implementados.

## Testes, releases e indicadores

Casos possuem passos ordenados e IDs sequenciais por projeto. Uma execução cria resultados para os casos existentes naquele momento. Resultados, pessoa executora, horário e observações são persistidos. Uma execução com falha pode referenciar um bug do mesmo projeto.

A publicação considera os bugs e os ciclos vinculados à release. Exige testes registrados e aprovados, pontuação mínima de 90, ausência de críticos ativos e ausência de bloqueadores. Uma transação serializável grava a pontuação, os totais e o momento da publicação. Resultados publicados não podem ser editados, e uma release publicada não recebe novos ciclos.

O dashboard consulta os registros reais. Aprovação é a proporção de resultados aprovados entre os executados. Tempo médio de resolução usa criação e resolução dos bugs. Cobertura de evidências mede a proporção de bugs com anexos. A classificação de risco por módulo é heurística explicável, não uma previsão feita por IA.

Sugestões de similaridade comparam texto e módulo entre registros do projeto. Não há integração com um modelo externo nem execução automática de pipelines de CI/CD.

## API e banco

Route Handlers delegam operações autenticadas à API; as rotas públicas de autenticação têm seus próprios handlers. Entradas são validadas com Zod. Erros de autorização, validação e concorrência usam respostas adequadas sem expor detalhes internos do banco.

O esquema possui índices de acesso por projeto, status, responsável e organização. A migração inicial está versionada. O ambiente já existente foi atualizado preservando registros e recebeu o baseline da migração.

O seed é opcional e não substitui registros, senhas ou sequências existentes.

## Verificação local

Em 5 de outubro de 2026, foram confirmados:

- 18 testes de domínio, sessão, permissões, validação e proteção de senhas.
- 89 verificações de integração sobre cadastro, banco, API, permissões, anexos, comentários, testes, gates de release, convites, notificações e recuperação.
- Navegação no navegador, criação de conta e workspace, criação e execução de testes, persistência após nova consulta e atualização dos indicadores.
- Renderização dos gráficos, busca de bugs e largura do dashboard em tela móvel.

Os testes criaram e removeram seus próprios registros isolados. As contas e bugs que existiam antes foram preservados. Recuperação foi verificada com token de teste inserido no banco; envio real de e-mail e autorização externa não foram simulados como resultados concluídos.

A verificação não substitui testes de carga, auditoria de segurança, monitoramento ou validação no ambiente de produção.
