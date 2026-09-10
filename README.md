# Central de Implantações - Gestão de Implantação ERP Centi

> **Aplicação web full-stack corporativa para gestão, governança e acompanhamento tático de implantações de ERP em municípios e câmaras públicas (Padrão NOP 001/2026 v12.5).**  
> Caso piloto e referência técnica: **Município de São Patrício / GO**.

---

## 1. Visão Geral e Princípios Não-Negociáveis

A **Central de Implantações** foi desenvolvida para atender aos mais rigorosos padrões de integridade documental, governança de dados públicos e acompanhamento tático de equipes multidisciplinares da Centi Soluções.

### Princípios Fundamentais:
1. **Fonte Única da Verdade**: O chamado oficial **#TK059** (e correlatos #TK090 / #TK102) é o único repositório contratual oficial. A aplicação apoia a governança tática e gera despachos formatados para inserção manual fidedigna.
2. **Status Operacional Cumulativo**: Um departamento municipal só pode atingir o status `OPERACIONAL` se satisfizer cumulativamente 5 critérios comprovados:
   - Migração de dados legados homologada.
   - Parametrizações obrigatórias validadas.
   - Treinamento prático concluído.
   - Zero impedimentos bloqueadores ativos vinculados ao setor.
   - Homologação técnica expressa e assinada pelo Líder de Implantação.
3. **Imutabilidade e Snapshots**: Atas de reunião emitidas geram snapshots congelados em JSON, vinculados a hashes criptográficos SHA-256 e protegidos contra alterações posteriores.
4. **Resistência Municipal em GPH**: Alertas de caducidade (> 3 dias úteis consecutivos de resistência) só operam em intervenções de Governança Pós-Homologação (GPH) formalmente ativas, notificando a Diretoria de Contas (DC) sem decretação automática arbitrária.
5. **Segurança Multicamadas**:
   - Isolamento estrito de permissões contra vazamento horizontal (IDOR).
   - Armazenamento privado com hashes SHA-256 e validação de tipo MIME.
   - Proteção contra injeção de fórmulas em planilhas (CSV Formula Injection Sanitization).
   - Controle de concorrência otimista (OCC) em registros simultâneos.

---

## 2. Pré-requisitos

- **Node.js**: Versão 20.x ou superior (LTS).
- **Gerenciador de Pacotes**: `npm` (v10+).
- **Opcional (Produção / Ambiente Completo)**:
  - **Docker & Docker Compose** (para PostgreSQL 16 e MinIO S3).

---

## 3. Guia de Inicialização Rápida

O sistema possui suporte documentado a **dois ambientes de persistência e armazenamento**:

### Modo A: Local Standalone (Padrão Zero-Install)
Utiliza banco SQLite local (`prisma/data/central.db`) e armazenamento em disco (`./data/storage`), sem necessidade de Docker ou serviços externos instalados.

```powershell
# 1. Instalar dependências
npm install

# 2. Configurar ambiente para SQLite Local
npx tsx scripts/configure-db.ts --local

# 3. Gerar Prisma Client e aplicar schema
npx prisma db push

# 4. Provisionar o Administrador Geral
npm run auth:provision-admin

# 5. Executar carga inicial de dados
# Para modo real (São Patrício/GO com status não avaliado):
npm run seed
# Ou para modo demonstração (cenários ricos e municípios fictícios):
npm run seed:demo

# 6. Iniciar a aplicação
npm run dev
```

### Modo B: Docker Compose (PostgreSQL 16 + MinIO S3)
Ambiente recomendado para homologação formal e produção.

```powershell
# 1. Subir os serviços de infraestrutura
docker compose up -d

# 2. Configurar ambiente para PostgreSQL
npx tsx scripts/configure-db.ts --postgres

# 3. Aplicar migrations no PostgreSQL
npx prisma db push

# 4. Provisionar o Administrador Geral
npm run auth:provision-admin

# 5. Executar carga inicial
npm run seed

# 6. Iniciar servidor Next.js
npm run dev
```

---

## 4. Credenciais de Acesso Provisionadas

| Perfil | E-mail | Senha Padrão | Escopo de Acesso |
| :--- | :--- | :--- | :--- |
| **Administrador Geral** | `admin@centi.com.br` | `Admin@Centi2026` | Acesso irrestrito a todos os municípios, usuários e configurações |
| **Líder de Implantação** | `alexandre.lider@centi.com.br` | `Centi@123456` | Gestão de São Patrício/GO, emissão de atas, homologação e DAG |
| **Analista Especialista** | `analista.folha@centi.com.br` | `Centi@123456` | Acesso operacional a testes, diário de campo e pendências |

---

## 5. Estrutura de Navegação e Funcionalidades

A aplicação conta com 16 módulos integrados acessíveis pela barra lateral:

- **Visão Geral (`/`)**: Painel executivo com percentual de progresso de entregas, índice de autonomia operacional, matriz de departamentos e cards "Precisa da sua atenção" e "Meu dia".
- **Projetos (`/projetos`)**: Seleção de município/entidade ativa, criação de projetos e distinção explícita entre modo Real e Demo.
- **Departamentos (`/departamentos` e `/departamentos/[id]`)**: Checklist dos 5 critérios, bloqueadores por setor, histórico de auditoria e homologação formal do Líder.
- **Processos e Entregas (`/processos`)**: Grafo Acíclico Direcionado (DAG) com validação de precedência e simulador de impacto a jusante em cascata.
- **Pendências (`/pendencias`)**: Quadro Kanban e lista de impedimentos, alternância de bloqueador operacional e controle independente de intervalos de espera (Waiting Service).
- **Riscos (`/riscos`)**: Matriz 5x5 de Probabilidade vs Impacto, heatmap visual de exposição (1-25), escalação em níveis (N1 a N5) e materialização em pendência bloqueadora.
- **Agenda (`/agenda`)**: Rituais diários obrigatórios (08h Daily Centi, 12h Checkpoint, 17h Fechamento) e detector automático de conflitos de horário.
- **Treinamentos e Autonomia (`/treinamentos`)**: Capacitação prática por módulo, lista de presença individual e notas de avaliação vinculadas ao cálculo de autonomia.
- **Equipe (`/equipe`)**: Articulação entre equipe Centi (Líder, BAs, QA, CRM) e pontos focais do município (secretários, diretores e operadores).
- **Regras do Município (`/wiki`)**: Base de conhecimento com distinção visual rigorosa entre relato verbal do cliente e parecer técnico/base legal da Centi.
- **Diário de Campo (`/diario`)**: Registros diários de trabalho com botão de conversão direta de intercorrências em pendências.
- **Governança e Atas (`/governanca` e `/governanca/[id]`)**: Elaboração de atas no padrão corporativo Centi (NOP 001/2026), congelamento de snapshots imutáveis e geração automática de tarefas.
- **Documentos (`/documentos`)**: Repositório de arquivos privados com checksum SHA-256, controle IDOR e trilha de formalização de assinaturas (CentiSign, Gov.br, Física).
- **Transição (`/transicao`)**: Portões de prontidão técnica (Readiness Gates), acompanhamento do Ciclo Bridge de 20 dias úteis e governança GPH com alerta de resistência municipal.
- **Registros Oficiais (`/conciliacao`)**: Painel de conciliação com a #TK059 e gerador de pacotes de despacho pré-formatados com cópia em 1 clique.
- **Configurações (`/configuracoes`)**: Diagnóstico de banco e armazenamento, calendário de feriados municipais de São Patrício e gestão de usuários.

---

## 6. Rotas de API e Exportações

- `GET /api/exports/docx/[meetingId]`: Gera documento Word (.docx) oficial da ata semanal com cabeçalho corporativo Centi e tabelas formatadas.
- `GET /api/exports/csv/[type]?projectId=...`: Exporta relatórios CSV em UTF-8 com BOM e sanitização rigorosa contra CSV Formula Injection (`type = pendencias | departamentos | acoes`).
- `GET /api/documents/[id]/download`: Stream seguro de arquivos custodiados com validação IDOR.
- `POST /api/cron/check-alerts`: Execução determinística de alertas (prazos fatais vencidos, testes expirados > 7 dias e resistência GPH > 3 dias).

---

## 7. Testes Automatizados

A suíte de testes unitários, de integração de domínio e de segurança é executada com Vitest:

```powershell
# Executar todos os testes
npm test

# Executar testes em modo interativo/watch
npm run test:watch
```

### Cobertura de Testes (15 Suítes, 48 Testes Aprovados):
- `tests/domain/operational-status.test.ts`: 5 critérios cumulativos e cálculo determinístico de status.
- `tests/domain/indicator-formulas.test.ts`: Fórmulas de progresso e índice de autonomia sem distorção.
- `tests/domain/dag-dependencies.test.ts`: Detecção de ciclos direcionados e impacto a jusante no grafo.
- `tests/domain/calendar-business-days.test.ts`: Prazos fatais e feriados municipais.
- `tests/domain/waiting-intervals.test.ts`: Intervalos independentes de espera sem corromper estado da issue.
- `tests/domain/governance-snapshot.test.ts`: Congelamento imutável de atas de reunião.
- `tests/domain/tk059-reconciliation.test.ts`: Avaliação de divergências com o chamado oficial.
- `tests/domain/gph-governance.test.ts`: Alerta de caducidade estritamente em GPH ativo.
- `tests/domain/optimistic-concurrency.test.ts`: Controle de concorrência otimista (OCC).
- `tests/domain/exports-validation.test.ts`: Sanitização de fórmulas CSV e geração DOCX.
- `tests/security/private-storage.test.ts`: Validação de MIME types, limite de 20MB e hash SHA-256.
- `tests/security/idor-isolation.test.ts`: Bloqueio de acesso entre projetos distintos.
- `tests/domain/multi-entity.test.ts`: Prefeitura vs Câmara no mesmo projeto.
- `tests/domain/vertical-slice-1.test.ts`: Demonstração vertical de ciclo de vida completo.
- `tests/domain/alert-checker.test.ts`: Idempotência de notificações e cron determinístico.

---

## 8. Backup e Restauração

Scripts PowerShell inclusos garantem cópias seguras do banco de dados e arquivos com conferência de integridade por manifesto SHA-256:

```powershell
# Criar backup completo
powershell -ExecutionPolicy Bypass -File scripts/backup.ps1

# Restaurar a partir de um backup existente
powershell -ExecutionPolicy Bypass -File scripts/restore.ps1 -BackupZip "backups/backup_2026-09-10_13-00-00.zip"
```

---

## 9. Compilação de Produção

```powershell
# Gerar Prisma Client e compilar build estático Next.js
npm run build

# Iniciar servidor de produção
npm start
```
