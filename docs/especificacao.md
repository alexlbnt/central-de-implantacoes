# Especificação Funcional e de Domínio - Central de Implantações

## 1. Visão Geral e Propósito
A Central de Implantações é a plataforma de gestão e apoio à liderança de implantação de ERP para municípios atendidos pela Centi Soluções. Seu propósito primário é dar visibilidade fidedigna ao Líder de Implantação, permitindo identificar com precisão:
- Quais departamentos estão operacionais e quais estão bloqueados.
- Quem é o responsável direto por cada ação pendente (Centi ou Município).
- Quais prazos estão ameaçados e quais entregas possuem evidências reais.
- A comprovação prática da autonomia dos usuários-chave municipais.
- A preparação dos registros oficiais para a tela #TK059 da Centi.

---

## 2. Hierarquia de Escopo e Entidades
O sistema modela a estrutura de gestão pública em seis níveis hierárquicos:
1. **Organização:** Instância Centi ou ambiente corporativo gestor.
2. **Município:** Município contratante (ex.: São Patrício/GO), com UF, dados de contato e fuso horário.
3. **Projeto de Implantação:** Instância temporal da implantação do ERP Centi, vinculada ao município.
4. **Entidade:** Divisões jurídicas/administrativas do município (ex.: Prefeitura Municipal, Câmara de Vereadores, Fundos Municipais, Autarquias).
5. **Departamento:** Unidade setorial dentro de uma entidade (ex.: Recursos Humanos / Folha de Pagamento, Contabilidade, Compras/Licitações, Almoxarifado, Patrimônio, Frotas, Arrecadação, Protocolo).
6. **Processos Críticos:** Rotinas finalísticas essenciais do departamento que precisam ter operação funcional assistida e autônoma atestadas (ex.: "Fechamento da Folha Mensal", "Empenho, Liquidação e Pagamento", "Ordem de Fornecimento").

---

## 3. Matriz de Perfis e Autorização (RBAC & ABAC)
O acesso é governado pela combinação de papel corporativo e atribuição por entidade/departamento:

- **ADMIN_GERAL (Administrador da Organização):**
  - Gerencia usuários, configurações globais e organizações.
  - Não possui prerrogativa de aprovação técnica em projetos onde não é Líder designado.
- **LIDER_PROJETO (Líder do Projeto):**
  - Autoridade técnica máxima sobre os projetos atribuídos.
  - Define o escopo de processos críticos, autoriza dispensas com justificativa, homologa testes de autonomia e assina a validação técnica de prontidão operacional.
- **ANALISTA (Analista de Implantação Centi):**
  - Vinculado a departamentos específicos via `DepartmentAssignment`.
  - Registra diagnósticos, execuções de testes, treinamentos, pendências operacionais e notas no diário de campo.
  - Não altera a estrutura de escopo global nem concede privilégios.
- **BA (Business Analyst):**
  - Realiza o diagnóstico técnico e regras de negócio para a tela #TK090.
  - Homologa as particularidades da Wiki do Cliente e realiza a validação técnica no GPH.
- **QA (Quality Assurance):**
  - Realiza auditoria de conformidade processual com base na NOP 001/2026.
  - Valida a qualidade das evidências registradas para a #TK059 e #TK090.
- **CRM_BRIDGE (CRM / Laço de Transição):**
  - Conduz o relacionamento político de alto escalão (Prefeito/Secretários).
  - Gerencia o ciclo Bridge (20 dias corridos) e atua na triagem de insatisfações institucionais.
- **DC (Coordenador de Implantação / Diretor de Contas):**
  - Autoridade de governança corporativa da Centi.
  - Emite a Convocação formal do GPH e homologa a eventual caducidade ou encerramento da intervenção.
- **PONTOS FOCAIS DO MUNICÍPIO (Gestores, Secretários e Servidores Municipais):**
  - **Uso Interno Exclusivo Centi:** Servidores municipais e clientes NÃO possuem conta de usuário (`User`) e NÃO acessam o sistema.
  - São cadastrados exclusivamente como pessoas de contato e titulares de setores (`Person` com `isMunicipal: true` e `userId: null`) para registro de presenças em treinamentos e avaliação prática de autonomia operacional.
- **LEITOR:**
  - Perfil interno de consulta e auditoria, com acesso de leitura aos projetos autorizados e sem permissão para visualização de notas confidenciais.
  - Consulta restrita a projetos e relatórios autorizados, sem permissão de gravação.

---

## 4. Situação Operacional dos Departamentos (Máquina de Estados)
O estado operacional de um departamento é recalculado deterministicamente pelo servidor no momento de cada mutação relevante ou consulta:

```
[Início] 
   │
   ▼
Possui bloqueio crítico ativo? (Issue.isOperationalBlocker == true)
   ├── SIM ──► [BLOQUEADO]
   └── NÃO ──► Processos críticos cadastrados == 0 OU sem diagnóstico?
                  ├── SIM ──► [NAO_AVALIADO]
                  └── NÃO ──► Processos críticos não testados OU dados/parametrização pendentes?
                                ├── SIM ──► [EM_PREPARACAO]
                                └── NÃO ──► Todos os processos aprovados, mas autonomia < 100% OU sem validação do Líder?
                                              ├── SIM ──► [OPERACAO_ASSISTIDA]
                                              └── NÃO ──► Atendeu todos os 5 critérios cumulativos?
                                                            ├── SIM ──► [OPERACIONAL]
                                                            └── NÃO ──► [EM_PREPARACAO]
```

### Critérios Cumulativos para "Operacional":
1. Migração de dados legados do módulo validada formalmente.
2. Parametrizações obrigatórias do ERP atestadas.
3. Capacitação teórica/prática ministrada com registro de participantes.
4. 100% dos processos críticos com testes funcionais aprovados e dentro do prazo de validade (7 dias corridos).
5. 100% dos requisitos de autonomia (processo + usuário-chave) com teste autônomo aprovado e vigente.
6. Ausência de qualquer bloqueio operacional ativo.
7. Validação técnica explícita do Líder de Implantação registrada para a revisão atual do escopo.

### Revalidação Necessária:
- Flag independente acionada se:
  - Algum teste funcional/autônomo foi realizado há mais de 7 dias corridos.
  - O setor está sem atualização de diagnóstico há mais de 2 dias úteis.
- O vencimento do teste invalida o estado "Operacional", provocando recálculo justificado no histórico.

---

## 5. Fórmulas de Indicadores Confiáveis
1. **Progresso de Entregas Obrigatórias (%):**
   $$\text{Progresso} = \frac{\text{Entregas obrigatórias ativas validadas}}{\text{Entregas obrigatórias ativas previstas}} \times 100$$
   *Se denominador for 0, o indicador é "Não definido" (nunca 100%).*
   *Progresso global é a razão direta entre o somatório das entregas validadas e o somatório das entregas previstas no escopo ativo (nunca média simples das médias dos departamentos).*

2. **Índice de Autonomia (%):**
   $$\text{Autonomia} = \frac{\text{Requisitos de autonomia aprovados com teste autônomo válido}}{\text{Total de requisitos de autonomia previstos}} \times 100$$
   *Cada requisito é o par (Processo Crítico + Usuário-Chave/Função). Retestes não aumentam o denominador.*

3. **Departamentos Operacionais:**
   Contagem absoluta dos departamentos que satisfazem simultaneamente todas as exigências do estado `OPERACIONAL`. Jamais inferido a partir de tarefas concluídas.

---

## 6. Governança e Modelo Corporativo de Atas
A ata semanal reproduz rigorosamente a ordem e terminologia do modelo corporativo Centi Soluções:
- **Cabeçalho PMO:** CENTI SOLUÇÕES LTDA (CNPJ 14.419.896/0001-52), Goiânia/GO, Escritório de Projetos e Governança Corporativa.
- **Identificação do Projeto:** Implantação do Sistema de Gestão Integrada (ERP Centi) - [Município].
- **Participantes da Reunião:** CONTRATADA (Centi) e CONTRATANTE (Município).
- **Seção 1:** STATUS ATUAL DO CRONOGRAMA.
- **Seção 2:** PONTOS CRÍTICOS E IMPEDIMENTOS IDENTIFICADOS.
- **Seção 3:** DECISÕES E REALINHAMENTOS ESTRATÉGICOS.
- **Seção 4:** PLANO DE AÇÃO PARA A PRÓXIMA SEMANA (Tarefa/Ação Requerida, Responsável, Prazo Fatal).
- **Seção 5:** OBSERVAÇÕES GERAIS E SALVAGUARDAS.
- **Seção 6:** VALIDAÇÃO E ASSINATURAS (com texto padrão normatizado e blocos de assinatura).

### Congelamento de Snapshot:
A transição para `EMITIDA` congela a ata em registro imutável com todos os textos, métricas, participantes, decisões, plano de ação e hashes de documentos anexados. Tarefas geradas são idempotentes. Alterações posteriores geram aditamento/nova versão.

---

## 7. Conciliação com a Tela #TK059
O sistema prepara pacotes de atualização para as abas oficiais:
- **#TK059 - Módulos:** Diagnóstico e status operacional dos módulos e setores.
- **#TK059 - Ticket:** Treinamentos ministrados, participantes e agenda executada.
- **#TK059 - Observação:** Particularidades e regras da Wiki do Cliente e tentativas de formalização.
- **#TK059 - Documento:** Atas de governança, termos de abertura/encerramento e checklists assinados.
- **#TK059 - Checklist:** Certificações de autonomia comprovada dos servidores municipais.
- **#TK090:** Acompanhamento CRM e diagnóstico técnico do BA.
- **#TK102:** Acompanhamento de chamados de urgência.
