# Arquitetura de Software e Infraestrutura - Central de Implantações

## 1. Visão Arquitetural
A aplicação segue uma arquitetura modular moderna e coesa baseada em **Next.js 15 com App Router**, integrando camadas de apresentação, serviços de aplicação, motor de regras de domínio, controle de autorização e persistência relacional com PostgreSQL e Prisma ORM.

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router UI                    │
│  (Tailwind CSS, Radix UI, Lucide Icons, Responsivo 390px)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Server Actions / API Routes
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Camada de Serviços & Domínio                │
│  - RBAC & ABAC Guards (Org / Projeto / Entidade / Depto)    │
│  - Motor de Semáforos e Precedência de Situação             │
│  - Motor de Indicadores (Progresso, Autonomia, Totais)      │
│  - Validador DAG de Dependências Acíclicas                  │
│  - Gerador de Snapshots Imutáveis de Atas                   │
│  - Rotina Determinística de Alertas e Vencimentos           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌──────────────────────────────┐┌─────────────────────────────┐
│    Prisma ORM (44 Modelos)   ││       Storage Service       │
│ - Migrações Versionadas      ││ - Driver S3 (MinIO/AWS)     │
│ - Concorrência Otimista (OCC)││ - Driver Local Disk Seguro  │
│ - Transações ACID            ││ - Validação MIME / Hash 256 │
└──────────────┬───────────────┘└──────────────┬──────────────┘
               │                               │
               ▼                               ▼
      PostgreSQL 16 Engine            Object / File Storage
   (Docker Compose / Embedded)       (MinIO / Local Private)
```

---

## 2. Padrões de Projeto e Camadas de Código
A organização do código em `src/` obedece à separação estrita de responsabilidades:

- `src/app/(auth)/`: Telas públicas de autenticação (Login, Recuperação de Acesso, Redefinição de Senha).
- `src/app/(dashboard)/`: Telas autenticadas e autorizadas com layout central, sidebar retrátil, barra superior com seletor de projeto e navegação completa.
- `src/app/api/`: Endpoints seguros para downloads de arquivos privados, relatórios exportados e cron de alertas.
- `src/lib/auth/`: Lógica de autenticação com NextAuth.js, estratégias de credenciais, controle de sessões ativas e funções de verificação de permissão (`checkProjectAccess`, `checkDepartmentAccess`, `requireRole`).
- `src/lib/domain/`:
  - `operational-status.ts`: Cálculo determinístico da situação operacional dos departamentos e regras de revalidação.
  - `indicator-calculator.ts`: Fórmulas seguras de progresso global, taxa de autonomia e contadores com proteção contra divisão por zero.
  - `dag-validator.ts`: Algoritmo de detecção de ciclos e cálculo de impacto a jusante para processos críticos.
  - `calendar.ts`: Cálculo de prazos, dias úteis, horas úteis e feriados municipais no fuso `America/Sao_Paulo`.
  - `governance-snapshot.ts`: Serialização e congelamento imutável de atas de reunião emitidas.
  - `tk059-mapper.ts`: Matriz de conciliação e geração de pacote de texto oficial.
- `src/lib/storage/`: Serviço abstrato com drivers S3 e Local, realizando upload com validação de extensão/MIME, limite de 20 MB e integridade via SHA-256.
- `src/lib/exports/`:
  - `docx-generator.ts`: Montagem de documento Word estruturado baseado na NOP 001/2026.
  - `pdf-generator.ts`: Renderização no servidor de atas, diários e relatórios executivos.
  - `csv-generator.ts`: Exportação RFC-4180 com codificação UTF-8 BOM e escape de injeção de fórmulas (`=`, `+`, `-`, `@`).

---

## 3. Estratégia de Persistência e Ambientes
O sistema oferece duas modalidades de persistência rigorosamente equivalentes em termos de contratos de banco e regras de negócio:

### 3.1 Modalidade 1: Docker Compose (Caminho Principal)
- **PostgreSQL 16:** Executado em contêiner com volume persistente montado (`pgdata`). Porta padrão `5432`.
- **MinIO:** Servidor de objetos compatível com S3 nas portas `9000` (API) e `9001` (Console Web).
- Inicialização simples: `docker compose up -d`.

### 3.2 Modalidade 2: Ambiente Local Standalone
- **PostgreSQL Integrado:** Gerenciado via `embedded-postgres` sob o diretório `./data/postgres`.
- **Armazenamento de Arquivos Local:** Diretório privado `./data/storage`.
- Ambos os caminhos executam as mesmas migrações Prisma (`prisma migrate deploy`), usam o mesmo cliente e passam pelos mesmos testes de domínio e segurança.
- Ao inicializar, o sistema emite um log explícito identificando o motor de banco e o driver de armazenamento ativos.

---

## 4. Segurança, Auditoria e Integridade
- **Proteção Contra IDOR:** Todas as operações que aceitam IDs externos (projetos, departamentos, pendências, atas, documentos) verificam explicitamente o pertencimento do usuário à organização e ao projeto correspondente.
- **Trilha de Auditoria (Append-Only):** A tabela `AuditLog` armazena todos os eventos relevantes com ator, instante, tipo de ação, entidade alvo, diff de atributos alterados e justificativa. Registros de auditoria são imutáveis.
- **Prevenção de Conflitos (OCC):** Atualizações utilizam verificação de versão (`version`), impedindo sobrescritas concorrentes acidentais.
- **Sessões e Cookies:** Cookies de autenticação configurados com `HttpOnly`, `SameSite=Lax` (ou `Strict`) e flag `Secure` em ambientes de produção ou HTTPS.
