# Registro de Decisões de Arquitetura e Negócio (ADR) - Central de Implantações

Este documento registra as decisões formais de arquitetura, tecnologia, governança e alinhamento com a NOP 001/2026 e o modelo de ata corporativa da Centi Soluções.

---

## Decisão 01: A #TK059 como Única Fonte da Verdade (Single Source of Truth)
- **Contexto:** A NOP 001/2026 estabelece que a tela #TK059 concentra o histórico oficial e jurídico da implantação.
- **Decisão:** A Central de Implantações atua como ferramenta de apoio operacional e cockpit de gestão do Líder de Implantação. O sistema **não** se auto-intitula a fonte primária nem afirma sincronização automática com a Centi sem integração homologada. Todo registro possui estado de conciliação com a #TK059 (Não registrado, Preparado para registro, Registro manual declarado, Conferido, Divergência identificada).
- **Consequência:** Uploads no site não equivalem à aba Documento da #TK059. O sistema oferece pacote de conciliação determinístico para preenchimento oficial.

---

## Decisão 02: Autenticação Mantida e Isolamento em Quatro Camadas
- **Contexto:** Necessidade de sessões seguras com cookies HttpOnly, revogação ativa e isolamento estrito de dados para evitar IDOR e vazamento entre municípios e entidades.
- **Decisão:** Uso da biblioteca `NextAuth.js` (Auth.js) integrada ao Prisma com modelo `Session` persistido no PostgreSQL. O modelo de autorização implementa 4 camadas: Organização → Projeto → Entidade → Departamento (`DepartmentAssignment`).
- **Consequência:** Perfis de acesso têm papéis funcionais estritos (Líder, Analista, BA, QA, CRM, DC, Representante Municipal e Leitor). Representantes municipais jamais acessam notas internas (`isInternal: true`), riscos corporativos ou níveis de escalonamento internos.

---

## Decisão 03: Controle de Concorrência Otimista (OCC)
- **Contexto:** Múltiplos analistas e o líder podem editar a mesma pendência, ata ou processo em momentos próximos.
- **Decisão:** Inclusão de `version Int @default(1)` em todas as entidades mutáveis. A atualização só é persistida se `version == expectedVersion`. Em caso de divergência, o servidor retorna HTTP 409 com os dados mais recentes para comparação, impedindo sobrescrita silenciosa.

---

## Decisão 04: Motor Determinístico de Semáforos e Indicadores
- **Contexto:** O líder precisa de visibilidade real; percentual alto de tarefas e semáforos clicáveis geram falsas impressões de prontidão.
- **Decisão:** O cálculo de status operacional é 100% determinístico no servidor:
  1. `BLOQUEADO`: pendência com `isOperationalBlocker: true` ativa.
  2. `NAO_AVALIADO`: zero processos críticos ou ausência de diagnóstico inicial.
  3. `EM_PREPARACAO`: dados legados pendentes ou processo crítico não validado.
  4. `OPERACAO_ASSISTIDA`: processos críticos aprovados, mas pendente de autonomia ou validação do líder.
  5. `OPERACIONAL`: exige cumulativamente migração validada, parametrização validada, capacitação atestada, processos críticos aprovados e vigentes, 100% de autonomia e validação técnica formal do Líder.
- **Consequência:** Reteste expirado (> 7 dias) ou diagnóstico > 2 dias úteis dispara `REVALIDACAO_NECESSARIA` e rebaixa a situação automaticamente. Denominador zero resulta em "Não definido", nunca 100%.

---

## Decisão 05: Tratamento Estrito de Caducidade no GPH
- **Contexto:** A NOP 001/2026 prevê caducidade por falta de adjacência operacional ou resistência municipal superior a 3 dias úteis consecutivos.
- **Decisão:** O alerta de caducidade é acionado **exclusivamente** quando há intervenção GPH formalmente ativa (`status == 'EM_ANDAMENTO'`) e registro contínuo de resistência/impedimento prático à equipe por mais de 3 dias úteis consecutivos. Pendências comuns de prefeitura ou ausência de assinaturas normais **não** disparam alerta de caducidade do GPH. O sistema nunca decreta caducidade automaticamente; a decisão é privativa do DC.

---

## Decisão 06: Congelamento Imutável de Atas (`MeetingSnapshot`)
- **Contexto:** Alterações no projeto ou no plano de ação após a emissão de uma ata semanal não podem alterar retroativamente o documento assinado.
- **Decisão:** Na transição para o estado `EMITIDA`, grava-se um snapshot imutável com cabeçalho corporativo, lista de presentes, texto completo das seções 1 a 6, métricas do momento, decisões, plano de ação e hashes SHA-256 dos documentos anexados. Tarefas geradas são vinculadas de forma idempotente. Revisões posteriores exigem emissão de nova versão formal (Aditamento).

---

## Decisão 07: Ambientes de Execução e Armazenamento
- **Contexto:** Suporte a implantação padrão em contêineres e execução local flexível sem dependências pagas.
- **Decisão:** `Docker Compose` (PostgreSQL 16 + MinIO S3) é o caminho principal documentado. Para desenvolvimento rápido sem Docker ativo, é fornecido suporte com PostgreSQL via `embedded-postgres` em `./data/postgres` e armazenamento local seguro em `./data/storage`. O sistema imprime claramente na inicialização qual driver está ativo, garantindo integridade e ausência de troca silenciosa.
