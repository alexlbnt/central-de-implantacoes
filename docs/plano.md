# Plano de Implementação por Fases - Central de Implantações

Este documento orienta a execução técnica sequencial e modular da aplicação nas fases A a E.

---

## Incremento Vertical 1 (Primeira Demonstração Funcional Completa)
Comprovação do fluxo essencial de ponta a ponta:
1. Autenticação e sessão real com papel de Líder.
2. Criação do projeto São Patrício no banco de dados.
3. Cadastro de Entidade (Prefeitura) e Departamento (Folha de Pagamento).
4. Definição de Processo Crítico ("Processamento e Fechamento da Folha").
5. Registro de Bloqueio Operacional (pendência crítica vinculada) → Atualização do painel para **Bloqueado**.
6. Conclusão da pendência com resolução técnica → Atualização do painel para **Em preparação**.
7. Registro de teste autônomo com usuário-chave e aprovação.
8. Registro de validação técnica do Líder de Implantação.
9. Recálculo automático do servidor e atualização do painel para **Operacional**, com trilha de auditoria (`AuditLog`).

---

## Fase A — Fundação
- Setup da aplicação Next.js 15, TypeScript estrito, Tailwind CSS e componentes baseados em shadcn/ui.
- Configuração do Prisma ORM com schema completo (44 modelos relacionais), constraints e índices.
- Mecanismo de autenticação mantida (NextAuth.js) com login, sessões ativas revogáveis, script de provisionamento de admin (`npm run auth:provision-admin`) e recuperação segura de senha.
- Design System: layout com sidebar retrátil, barra superior com seletor de projeto/entidade, responsividade a 390px, acessibilidade por teclado e contraste visual.
- Assistente de cadastro de novos projetos e mecanismo de clonagem estrutural (sem dados reais ou pessoas).
- Modo Duplo: Projeto Real São Patrício (inicialmente rascunho/não avaliado) e Projeto Demonstração (com dados persistidos no banco e banner de identificação).

---

## Fase B — Operação
- Gestão de Entidades e Departamentos com isolamento estrito (Prefeitura vs. Câmara).
- Modelagem de Processos Críticos e Grafo de Dependências com validação acíclica (DAG).
- Motor de cálculo de semáforos operacionais (Bloqueado > Não avaliado > Em preparação > Operação assistida > Operacional) e sinal de Revalidação Necessária.
- Fórmulas de indicadores: Progresso ponderado, Autonomia acumulada e contadores sem distorção por denominador zero.
- Lista e Kanban unificados de pendências, com suporte a condições de espera independentes (município, interna, terceiro) e contagem de intervalos.
- Matriz de Riscos 5x5 e rito de escalonamento N1 a N5.
- Dashboard executivo completo com listas "Precisa da sua atenção" e "Meu dia".

---

## Fase C — Campo
- Agenda diária/semanal/mensal com detecção de conflitos de horário de analistas entre múltiplos projetos.
- Gestão de Treinamentos com listas de presença individuais e vinculação direta aos requisitos de autonomia.
- Wiki do Cliente: base de conhecimento de regras municipais com diferenciação formal entre relato verbal do cliente e parecer técnico do analista/BA.
- Diário de Campo com controle de rascunho, publicação, histórico de correções e criação direta de pendências vinculadas.
- Armazenamento seguro de anexos com upload real, validação de MIME/extensão, limite de 20 MB, cálculo de hash SHA-256 e streaming autenticado.

---

## Fase D — Governança
- Reuniões semanais de governança com resumo determinístico pré-reunião.
- Reprodução fidedigna do modelo de ata corporativa da Centi Soluções (cabeçalho oficial, seções 1 a 6, termos de validação e blocos de assinatura).
- Emissão de ata com congelamento de snapshot imutável (`MeetingSnapshot`) e geração idempotente de ações.
- Exportadores funcionais: DOCX editável, PDF formatado e CSV sanitizado contra injeção de fórmulas.
- Painel de Conciliação com a #TK059 para as abas Módulos, Ticket, Observação, Documento e Checklist.
- Checklist de Handover/Prontidão, acompanhamento do ciclo Bridge (20 dias) e rito de intervenção do GPH (com convocação e caducidade privativas do DC).

---

## Fase E — Qualidade e Entrega
- Execução da suíte completa de testes automatizados (Vitest e Playwright) cobrindo todos os 22 critérios de aceite.
- Inspeção responsiva detalhada (desktop 1440px e mobile 390px).
- Scripts de backup e restauração (`scripts/backup.ps1` e `scripts/restore.ps1`) com validação de integridade por hash.
- Documentação final consolidada: `README.md`, `docs/manual-do-lider.md` e `docs/relatorio-validacao.md`.
