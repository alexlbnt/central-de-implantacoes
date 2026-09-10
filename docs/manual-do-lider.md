# Manual Operacional do Líder de Implantação

**Destinatário:** Alexandre (Líder de Implantação)  
**Projeto de Referência:** Implantação ERP Centi - Município de São Patrício / GO  
**Norma Aplicável:** Procedimento Operacional Padrão Centi (NOP 001/2026 v12.5)  

---

## 1. Introdução e Diretrizes do Líder

Prezado Alexandre,

Este manual estabelece as rotinas diárias e os controles obrigatórios que você deve exercer na **Central de Implantações**. Sua função como Líder de Implantação é conduzir a virada de chave no município de São Patrício/GO com segurança jurídica, aderência técnica e autonomia comprovada dos servidores públicos locais.

### Três Regras de Ouro:
1. **Nunca altere percentuais de progresso manualmente**: O progresso é calculado pelo sistema com base em entregas e testes homologados.
2. **Exija os 5 critérios cumulativos para status Operacional**: Nenhum setor pode ser homologado sem migração, parametrização, capacitação, zero bloqueadores e sua assinatura técnica expressa.
3. **Mantenha o chamado #TK059 atualizado**: Toda sexta-feira, utilize o gerador de despachos da Central para atualizar o chamado oficial.

---

## 2. Passo a Passo do Fluxo de Trabalho

### Etapa 1: Acesso Inicial e Ambientação
1. Acesse `http://localhost:3000/login` com suas credenciais:
   - **E-mail:** `alexandre.lider@centi.com.br`
   - **Senha:** `Centi@123456`
2. No topo da tela (Header), certifique-se de que o projeto **São Patrício/GO** está selecionado no dropdown.
3. Acesse a **Visão Geral (`/`)** para verificar os indicadores globais: percentual de entregas, índice de autonomia e alertas do dia.

---

### Etapa 2: Diagnóstico dos Setores e Entidades
1. Acesse o menu **Departamentos (`/departamentos`)**.
2. Você verá as entidades municipais divididas:
   - **Prefeitura Municipal de São Patrício**: Recursos Humanos / Folha, Contabilidade, Tesouraria / Finanças, Tributos / Arrecadação, Compras e Licitações, Almoxarifado e Patrimônio.
   - **Câmara Municipal de São Patrício**: Folha e Contabilidade Legislativa.
3. Entre em cada departamento clicando em **Detalhes**:
   - Defina o **Responsável Municipal Titular** (secretário ou diretor) e o **Substituto Imediato**.
   - Defina a criticidade do setor (`ALTA` ou `CRITICA`).

---

### Etapa 3: Rituais Diários de Campo (Agenda)
Acesse **Agenda (`/agenda`)** e execute os três rituais corporativos da Centi:
- **08:00 - Alinhamento Matinal (Daily Centi)**: Reunião rápida de 15 minutos com os analistas especialistas para alinhar as metas do dia e prioridades de teste.
- **12:00 - Checkpoint Intermediário**: Contato direto com o ponto focal da prefeitura para destravar dados legados e assinaturas.
- **17:00 - Fechamento do Dia e Diário de Campo**:
  - Acesse **Diário de Campo (`/diario`)**.
  - Registre o conteúdo trabalhado, resultado observado e intercorrências.
  - Se houver algum problema que dependa do município, clique no botão **"Gerar Pendência"** diretamente a partir do diário.

---

### Etapa 4: Tratamento de Pendências e Impedimentos
1. Acesse **Pendências (`/pendencias`)**.
2. Se uma ocorrência impedir a operação real de um setor ou a homologação da folha/contabilidade:
   - Marque o botão **"Bloqueador Operacional"** como `SIM` (o card ficará destacado em vermelho).
   - O sistema bloqueará imediatamente o status `OPERACIONAL` do departamento vinculado.
3. Se a pendência estiver paralisada aguardando o município ou terceiro:
   - Selecione a **Condição de Espera**: `AGUARDANDO_MUNICIPIO`, `AGUARDANDO_EQUIPE_INTERNA` ou `AGUARDANDO_TERCEIRO`.
   - Especifique o motivo e o tipo (ex: `BASE_LEGADA`, `LEGISLACAO`, `CERTIFICADO`).
   - O cronômetro de espera acumulará os minutos de paralisação sem apagar o histórico da tarefa.

---

### Etapa 5: Precedência de Processos Críticos (DAG)
1. Acesse **Processos e Entregas (`/processos`)**.
2. Cada processo crítico (ex: *Fechamento Mensal da Folha*, *Geração de Empenhos*) possui dependências.
3. Utilize o **Simulador de Impacto a Jusante**:
   - Clique em **"Simular Impacto"** ao lado de qualquer processo para visualizar instantaneamente quais processos posteriores ficariam paralisados em caso de bloqueio.
4. Ao cadastrar dependências, o sistema rejeitará automaticamente tentativas de criar dependências circulares (loops infinitos).

---

### Etapa 6: Capacitação e Testes Práticos de Autonomia
1. Acesse **Treinamentos (`/treinamentos`)**:
   - Cadastre as sessões de capacitação prática por módulo.
   - Lance a presença dos servidores municipais e a nota prática (0 a 10).
2. Para cada processo crítico:
   - Aplique o teste prático de autonomia no ambiente de homologação.
   - O servidor deve executar o processo do início ao fim **sem intervenção do analista Centi**.
   - Registre o resultado: `APROVADO` ou `REPROVADO`.
   - Somente quando o servidor obtiver aprovação autônoma o requisito é computado no numerador do **Índice de Autonomia**.

---

### Etapa 7: Homologação de Status Operacional
Quando um departamento tiver cumprido os pré-requisitos:
1. Acesse a página do departamento (`/departamentos/[id]`).
2. Marque os 3 pré-requisitos obrigatórios:
   - [x] Migração de Dados Homologada
   - [x] Parametrizações Concluídas
   - [x] Capacitação Operacional Realizada
3. Verifique se o quadro de impedimentos bloqueadores do setor está **zerado**.
4. Clique no botão **"Conceder Homologação Técnica do Líder"**.
5. O sistema atualizará o status para `OPERACIONAL` e registrará um `AuditLog` com seu nome e carimbo de data/hora.

---

### Etapa 8: Reunião Semanal de Governança e Emissão de Ata DOCX
Toda sexta-feira à tarde:
1. Acesse **Governança e Atas (`/governanca`)**.
2. Clique em **"Abertura de Nova Ata Semanal"**.
3. Acesse os detalhes da ata gerada (`/governanca/[id]`).
4. Preencha e revise as seções oficiais (NOP 001/2026):
   - **Seção 1**: Status do Cronograma.
   - **Seção 2**: Pontos Críticos e Impedimentos.
   - **Seção 3**: Decisões Deliberadas (adicione as decisões numeradas #1, #2...).
   - **Seção 4**: Plano de Ação (adicione as tarefas com Responsável e Prazo Fatal).
   - **Seção 5**: Salvaguardas Técnicas e Contratuais.
5. Clique no botão verde **"Emitir e Congelar Ata Oficial"**:
   - O sistema congelará um snapshot imutável em JSON.
   - As tarefas serão inseridas automaticamente no plano de ação.
   - A ata passará para o status `EMITIDA`.
6. Clique em **"Baixar DOCX Oficial"** para gerar o documento Word oficial timbrado da Centi Soluções, pronto para envio para assinatura digital.

---

### Etapa 9: Conciliação Semanal com o #TK059
1. Acesse **Registros Oficiais (`/conciliacao`)**.
2. Selecione o chamado correspondente (#TK059).
3. Clique em **"Gerar Despacho"**.
4. O sistema gerará o texto estruturado no padrão corporativo.
5. Copie o texto e cole diretamente na aba correspondente do chamado oficial no sistema corporativo da Centi.
6. Clique em **"Declarar Registro Efetuado"** ou **"Conferir e Homologar"**.

---

### Etapa 10: Transição e Passagem de Bastão (Bridge)
1. Acesse **Transição (`/transicao`)**.
2. Verifique o cumprimento dos 5 portões de prontidão técnica (Readiness Gates):
   - 100% dos departamentos em status `OPERACIONAL`.
   - Zero impedimentos bloqueadores ativos.
   - Autonomia operacional comprovada >= 80%.
   - Documentação de homologação assinada.
3. Defina o analista CRM responsável e inicie o **Ciclo Bridge de 20 Dias Úteis**.
4. Ao final dos 20 dias, com os primeiros fechamentos mensais de folha e contabilidade executados com sucesso, assine a **Ata de Handover Definitivo**.

---

## 3. Gestão de Crise e Resistência Municipal (GPH)

Se durante a implantação ou operação assistida for identificada resistência sistemática de servidores ou recusa de atendimento por parte do município:
1. Convoque a intervenção de **Governança Pós-Homologação (GPH)** na aba Transição.
2. Registre diariamente os dias úteis consecutivos de resistência.
3. Se a resistência superar **3 dias úteis consecutivos**, o sistema acionará um **Alerta Crítico ao Diretor de Contas (DC)**.
4. O Diretor de Contas analisará formalmente a situação junto à diretoria municipal e, se necessário, decretará a caducidade contratual mediante justificativa fundamentada.
