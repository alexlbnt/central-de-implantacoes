# Matriz de Rastreabilidade de Requisitos - Central de Implantações

Esta matriz mapeia cada requisito de negócio e critério de aceite aos seus respectivos componentes de banco de dados, lógica de domínio, telas da interface e testes automatizados.

| Critério | Descrição | Modelo(s) de Dados | Serviço / Lógica | Telas / Componentes | Teste de Verificação |
|---|---|---|---|---|---|
| **01** | Multi-entidade isolada (Prefeitura vs. Câmara no mesmo módulo) | `Entity`, `Department`, `DepartmentModule` | `department-service.ts` | `/departamentos`, `/projetos/[id]` | `tests/domain/multi-entity.test.ts` |
| **02** | Persistência íntegra de sessão, dados e anexos pós-logout | `User`, `Session`, `Document` | `auth.ts`, `storage-service.ts` | `/(auth)/login`, layout global | `tests/security/auth-session.test.ts` |
| **03** | Proteção contra IDOR e isolamento por projeto/entidade | `ProjectMembership`, `DepartmentAssignment` | `auth-guards.ts` | Todas as rotas e APIs | `tests/security/idor-isolation.test.ts` |
| **04** | Bloqueio operacional de processo e revalidação após correção | `Issue`, `CriticalProcess`, `Department` | `operational-status.ts` | `/pendencias`, `/departamentos/[id]` | `tests/domain/operational-status.test.ts` |
| **05** | Treinamento realizado sem teste de autonomia não torna operacional | `Training`, `TrainingAttendance`, `AutonomyRequirement` | `operational-status.ts` | `/treinamentos`, `/departamentos` | `tests/domain/autonomy-training.test.ts` |
| **06** | Ateste dos 5 critérios cumulativos para status Operacional | `Department`, `CriticalProcess`, `TestExecution` | `operational-status.ts` | `/departamentos/[id]`, `/dashboard` | `tests/domain/operational-full-criteria.test.ts` |
| **07** | Invalidação por teste reprovado ou expirado sem apagar histórico | `TestExecution`, `ScopeRevision` | `operational-status.ts` | `/departamentos/[id]/testes` | `tests/domain/status-invalidation.test.ts` |
| **08** | Fórmulas confiáveis de progresso e autonomia sem divisão por zero | `Deliverable`, `AutonomyRequirement` | `indicator-calculator.ts` | `/dashboard`, `/projetos/[id]` | `tests/domain/indicator-formulas.test.ts` |
| **09** | Filtro de período não oculta bloqueio operacional ativo anterior | `Issue`, `Department` | `indicator-calculator.ts` | `/dashboard` (Filtros de data) | `tests/domain/dashboard-filters.test.ts` |
| **10** | Espera municipal cronometrada sem falso bloqueio operacional | `WaitingInterval`, `Issue` | `waiting-service.ts` | `/pendencias`, `/pendencias/kanban` | `tests/domain/waiting-intervals.test.ts` |
| **11** | Grafo acíclico de processos (DAG) e impacto a jusante | `CriticalProcess`, `ProcessDependency` | `dag-validator.ts` | `/departamentos/[id]/processos` | `tests/domain/dag-dependencies.test.ts` |
| **12** | Snapshot imutável da ata emitida preservado contra alterações posteriores | `Meeting`, `MeetingSnapshot`, `Task` | `governance-snapshot.ts` | `/governanca`, `/governanca/[id]` | `tests/domain/meeting-snapshot.test.ts` |
| **13** | Geração idempotente de plano de ação a partir de decisões | `MeetingDecision`, `Task` | `meeting-service.ts` | `/governanca/[id]/acoes` | `tests/domain/meeting-idempotency.test.ts` |
| **14** | Assinatura sem referência gera pendência #TK059 e divergência ao alterar | `Document`, `OfficialReference` | `tk059-mapper.ts` | `/conciliacao`, `/documentos` | `tests/domain/tk059-reconciliation.test.ts` |
| **15** | Controle de concorrência otimista (OCC) com alerta comparativo | `Issue`, `Meeting`, `CriticalProcess` (OCC) | `concurrency.ts` | Formulários de edição | `tests/domain/optimistic-concurrency.test.ts` |
| **16** | Armazenamento privado com hash SHA-256 e download autorizado | `Document`, `DocumentVersion` | `storage-service.ts` | `/documentos`, `/api/documents/[id]`| `tests/security/private-storage.test.ts` |
| **17** | Dias úteis, horas úteis e feriados no fuso America/Sao_Paulo | `HolidayCalendar`, `Project` | `calendar.ts` | `/agenda`, `/pendencias` | `tests/domain/calendar-business-days.test.ts` |
| **18** | Rito estrito do GPH: convocação privativa do DC e alerta de caducidade | `GPHIntervention`, `Escalation` | `gph-service.ts` | `/transicao/gph` | `tests/domain/gph-governance.test.ts` |
| **19** | Exportações fiéis em DOCX, PDF e CSV com sanitização de fórmulas | `Meeting`, `Issue`, `Department` | `docx-generator.ts`, `csv-generator.ts` | Botões de exportação | `tests/domain/exports-validation.test.ts` |
| **20** | Interface acessível e responsiva em 390px e desktop | Todos os componentes de UI | Design System, Tailwind CSS | Todas as telas | `tests/e2e/responsive-navigation.test.ts` |
| **21** | Instalação, migração, seeds e build reproduzíveis | Package scripts, Docker, Prisma | `dev-runner.ts`, `seed.ts` | Scripts CLI e README | Verificação de build e seed limpo |
| **22** | Rotinas de backup e restauração com verificação de integridade | Scripts PowerShell e Bash | `backup.ps1`, `restore.ps1` | Linha de comando | Teste de restauração e hash match |
