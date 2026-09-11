import { PrismaClient, UserRole, ProjectPhase, ProjectStatus, EntityType, DepartmentStatus, IssueType, IssuePriority, IssueStatus, WaitingCondition, WaitingType, TestModality, TestResult, TrainingStatus, RuleStatus, DiaryStatus, MeetingStatus, DocumentType, SignatureMethod, OfficialSystem, ReconciliationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const isDemo = process.argv.includes("--demo");
  console.log(`Iniciando seed no banco de dados (${isDemo ? "MODO DEMONSTRAÇÃO" : "MODO REAL"} - Idempotente)...`);

  const passwordHash = await bcrypt.hash("Admin@Centi2026", 12);
  const userPasswordHash = await bcrypt.hash("Centi@123456", 12);

  // 1. Organização Centi Soluções
  const org = await prisma.organization.upsert({
    where: { cnpj: "14.419.896/0001-52" },
    update: {},
    create: {
      name: "CENTI SOLUÇÕES LTDA",
      cnpj: "14.419.896/0001-52",
      address: "Rua 94, nº 816, Qd. F16, Lt. 98/100, Sala 03, Térreo/Pavimento Superior, Setor Sul, Goiânia/GO, CEP 74.080-075",
    },
  });

  // 2. Catálogo Oficial de Módulos ERP Centi
  const moduleCatalogData = [
    { name: "Folha/RH", code: "FOLHA", description: "Gestão de Recursos Humanos e Folha de Pagamento" },
    { name: "Contabilidade", code: "CONTABILIDADE", description: "Contabilidade Pública e Execução Orçamentária" },
    { name: "Compras/Licitações", code: "COMPRAS", description: "Compras, Licitações e Contratos" },
    { name: "Almoxarifado", code: "ALMOXARIFADO", description: "Controle e Movimentação de Materiais" },
    { name: "Patrimônio", code: "PATRIMONIO", description: "Gestão e Tombamento de Bens Móveis e Imóveis" },
    { name: "Frotas", code: "FROTAS", description: "Gestão de Veículos, Abastecimento e Manutenção" },
    { name: "Arrecadação", code: "ARRECADACAO", description: "Tributação, IPTU, ISS e Dívida Ativa" },
    { name: "Protocolo", code: "PROTOCOLO", description: "Abertura e Tramitação de Processos Administrativos" },
  ];

  const modulesMap = new Map<string, string>();
  for (const mod of moduleCatalogData) {
    const saved = await prisma.moduleCatalog.upsert({
      where: { code: mod.code },
      update: {},
      create: mod,
    });
    modulesMap.set(mod.code, saved.id);
  }

  // 3. Usuários Institucionais Centi
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@centi.com.br" },
    update: {},
    create: {
      name: "Administrador PMO",
      email: "admin@centi.com.br",
      passwordHash,
      role: UserRole.ADMIN_GERAL,
      organizationId: org.id,
    },
  });

  const liderUser = await prisma.user.upsert({
    where: { email: "alexandre.lider@centi.com.br" },
    update: {},
    create: {
      name: "Alexandre - Líder de Implantação",
      email: "alexandre.lider@centi.com.br",
      passwordHash: userPasswordHash,
      role: UserRole.LIDER_PROJETO,
      organizationId: org.id,
    },
  });

  const analistaUser = await prisma.user.upsert({
    where: { email: "bruno.analista@centi.com.br" },
    update: {},
    create: {
      name: "Bruno - Analista Centi",
      email: "bruno.analista@centi.com.br",
      passwordHash: userPasswordHash,
      role: UserRole.ANALISTA,
      organizationId: org.id,
    },
  });

  const baUser = await prisma.user.upsert({
    where: { email: "carlos.ba@centi.com.br" },
    update: {},
    create: {
      name: "Carlos - Business Analyst (BA)",
      email: "carlos.ba@centi.com.br",
      passwordHash: userPasswordHash,
      role: UserRole.BA,
      organizationId: org.id,
    },
  });

  const qaUser = await prisma.user.upsert({
    where: { email: "mariana.qa@centi.com.br" },
    update: {},
    create: {
      name: "Mariana - Quality Assurance (QA)",
      email: "mariana.qa@centi.com.br",
      passwordHash: userPasswordHash,
      role: UserRole.QA,
      organizationId: org.id,
    },
  });

  const crmUser = await prisma.user.upsert({
    where: { email: "daniel.crm@centi.com.br" },
    update: {},
    create: {
      name: "Daniel - CRM / Bridge",
      email: "daniel.crm@centi.com.br",
      passwordHash: userPasswordHash,
      role: UserRole.CRM_BRIDGE,
      organizationId: org.id,
    },
  });

  const dcUser = await prisma.user.upsert({
    where: { email: "eduardo.dc@centi.com.br" },
    update: {},
    create: {
      name: "Eduardo - Coordenador de Implantação (DC)",
      email: "eduardo.dc@centi.com.br",
      passwordHash: userPasswordHash,
      role: UserRole.DC,
      organizationId: org.id,
    },
  });

  // Contato de Ponto Focal Municipal (Registrado apenas como Person, sem usuário e sem login)
  let robertoFocalPoint = await prisma.person.findFirst({
    where: { email: "roberto.secretario@saopatricio.go.gov.br" },
  });
  if (!robertoFocalPoint) {
    robertoFocalPoint = await prisma.person.create({
      data: {
        name: "Roberto Silva - Secretário de Administração",
        email: "roberto.secretario@saopatricio.go.gov.br",
        roleTitle: "Secretário de Administração",
        isMunicipal: true,
      },
    });
  }

  // 4. Município Real: São Patrício / GO
  const munSaoPatricio = await prisma.municipality.upsert({
    where: {
      name_state_organizationId: {
        name: "São Patrício",
        state: "GO",
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      name: "São Patrício",
      state: "GO",
      timezone: "America/Sao_Paulo",
      organizationId: org.id,
    },
  });

  // 5. Projeto Real: São Patrício (Inicia como Rascunho / Não Avaliado, sem dados fictícios)
  let projReal = await prisma.project.findFirst({
    where: {
      municipalityId: munSaoPatricio.id,
      isDemo: false,
    },
  });

  if (!projReal) {
    projReal = await prisma.project.create({
      data: {
        organizationId: org.id,
        municipalityId: munSaoPatricio.id,
        name: "Implantação ERP Centi - São Patrício",
        codePrefix: "SP",
        description: "Projeto real de implantação do Sistema de Gestão Integrada Centi no município de São Patrício/GO.",
        isDemo: false,
        phase: ProjectPhase.PLANEJAMENTO,
        status: ProjectStatus.PLANEJAMENTO,
        testValidityDays: 7,
        diagnosisWarningDays: 2,
        memberships: {
          create: [
            { userId: liderUser.id, role: UserRole.LIDER_PROJETO },
            { userId: analistaUser.id, role: UserRole.ANALISTA },
            { userId: baUser.id, role: UserRole.BA },
            { userId: qaUser.id, role: UserRole.QA },
            { userId: crmUser.id, role: UserRole.CRM_BRIDGE },
            { userId: dcUser.id, role: UserRole.DC },
          ],
        },
        entities: {
          create: [
            {
              name: "Prefeitura Municipal de São Patrício",
              type: EntityType.PREFEITURA,
              departments: {
                create: [
                  { name: "Recursos Humanos / Folha de Pagamento", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                  { name: "Contabilidade e Finanças", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                  { name: "Compras e Licitações", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                  { name: "Almoxarifado", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                  { name: "Patrimônio", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                  { name: "Frotas", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                  { name: "Arrecadação e Tributos", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                  { name: "Protocolo Geral", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                ],
              },
            },
            {
              name: "Câmara Municipal de São Patrício",
              type: EntityType.CAMARA,
              departments: {
                create: [
                  { name: "Contabilidade Legislativa", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                  { name: "Recursos Humanos Legislativo", operationalStatus: DepartmentStatus.NAO_AVALIADO },
                ],
              },
            },
          ],
        },
      },
    });
    console.log("Projeto Real de São Patrício criado com sucesso.");
  }

  // 6. Projeto de Demonstração com Dados Ricos
  if (isDemo) {
    console.log("Gerando dados persistidos para o Projeto de Demonstração...");
    let projDemo = await prisma.project.findFirst({
      where: {
        name: "DEMONSTRAÇÃO — Gestão de Implantação ERP Centi",
        isDemo: true,
      },
    });

    if (!projDemo) {
      projDemo = await prisma.project.create({
        data: {
          organizationId: org.id,
          municipalityId: munSaoPatricio.id,
          name: "DEMONSTRAÇÃO — Gestão de Implantação ERP Centi",
          codePrefix: "DEMO",
          description: "PROJETO DE DEMONSTRAÇÃO — Dados fictícios para simulação de cenários operacionais, governança e testes.",
          isDemo: true,
          phase: ProjectPhase.EXECUCAO,
          status: ProjectStatus.EXECUCAO,
          dZeroDate: new Date(2026, 9, 1),
          plannedStart: new Date(2026, 7, 1),
          plannedEnd: new Date(2026, 11, 15),
          memberships: {
            create: [
              { userId: liderUser.id, role: UserRole.LIDER_PROJETO },
              { userId: analistaUser.id, role: UserRole.ANALISTA },
              { userId: baUser.id, role: UserRole.BA },
              { userId: qaUser.id, role: UserRole.QA },
              { userId: crmUser.id, role: UserRole.CRM_BRIDGE },
              { userId: dcUser.id, role: UserRole.DC },
            ],
          },
        },
      });

      // Entidade Prefeitura
      const prefEntity = await prisma.entity.create({
        data: {
          projectId: projDemo.id,
          name: "Prefeitura Municipal (Demonstração)",
          type: EntityType.PREFEITURA,
        },
      });

      // Entidade Câmara
      const camaraEntity = await prisma.entity.create({
        data: {
          projectId: projDemo.id,
          name: "Câmara Municipal (Demonstração)",
          type: EntityType.CAMARA,
        },
      });

      // Servidor fictício para autonomia
      const servidorFolha = await prisma.person.create({
        data: {
          name: "Maria Ferreira - Coordenadora de RH",
          email: "maria.rh@demo.gov.br",
          roleTitle: "Coordenadora de Recursos Humanos",
          isMunicipal: true,
        },
      });

      // 6.1 Departamento 1: Folha de Pagamento (OPERACIONAL)
      const deptFolha = await prisma.department.create({
        data: {
          entityId: prefEntity.id,
          name: "Recursos Humanos / Folha",
          operationalStatus: DepartmentStatus.OPERACIONAL,
          criticality: IssuePriority.CRITICA,
          isDataMigrationValidated: true,
          dataMigrationValidatedAt: new Date(),
          isParametrizationValidated: true,
          parametrizationValidatedAt: new Date(),
          isTrainingCompleted: true,
          trainingCompletedAt: new Date(),
          isLeaderValidated: true,
          leaderValidatedAt: new Date(),
          leaderValidatorName: "Alexandre - Líder de Implantação",
          municipalResponsibleId: servidorFolha.id,
          lastDiagnosisAt: new Date(),
          modules: {
            create: [{ moduleId: modulesMap.get("FOLHA")! }],
          },
        },
      });

      const procFolha = await prisma.criticalProcess.create({
        data: {
          departmentId: deptFolha.id,
          name: "Processamento e Fechamento da Folha Mensal",
          objective: "Geração de contracheques, proventos, descontos e arquivo de remessa bancária",
          criticality: IssuePriority.CRITICA,
          evidenceRequired: true,
        },
      });

      const autoReqFolha = await prisma.autonomyRequirement.create({
        data: {
          processId: procFolha.id,
          personId: servidorFolha.id,
          isApproved: true,
          approvedAt: new Date(),
        },
      });

      await prisma.testExecution.create({
        data: {
          processId: procFolha.id,
          autonomyReqId: autoReqFolha.id,
          executorName: "Maria Ferreira (Servidora)",
          evaluatorName: "Alexandre (Líder Centi)",
          executedAt: new Date(),
          environment: "HOMOLOGACAO",
          modality: TestModality.AUTONOMA,
          result: TestResult.APROVADO,
          observedResult: "Servidora executou o cálculo completo, conferiu os relatórios e gerou o arquivo de remessa sem intervenção externa.",
        },
      });

      await prisma.deliverable.create({
        data: {
          departmentId: deptFolha.id,
          name: "Conferência e Fechamento da Folha Espelho",
          isMandatory: true,
          isValidated: true,
          validatedAt: new Date(),
          validatedBy: "Alexandre",
        },
      });

      // 6.2 Departamento 2: Almoxarifado (BLOQUEADO)
      const deptAlmox = await prisma.department.create({
        data: {
          entityId: prefEntity.id,
          name: "Almoxarifado Central",
          operationalStatus: DepartmentStatus.BLOQUEADO,
          criticality: IssuePriority.ALTA,
          isDataMigrationValidated: false,
          isParametrizationValidated: true,
          lastDiagnosisAt: new Date(),
          modules: {
            create: [{ moduleId: modulesMap.get("ALMOXARIFADO")! }],
          },
        },
      });

      const procAlmox = await prisma.criticalProcess.create({
        data: {
          departmentId: deptAlmox.id,
          name: "Entrada e Baixa de Materiais de Consumo",
          criticality: IssuePriority.ALTA,
          evidenceRequired: true,
        },
      });

      // Pendência que gera o bloqueio operacional
      await prisma.issue.create({
        data: {
          projectId: projDemo.id,
          codeNumber: 1,
          departmentId: deptAlmox.id,
          criticalProcessId: procAlmox.id,
          title: "Divergência crítica no inventário inicial de materiais farmacêuticos",
          description: "O saldo migrado do sistema legado difere em mais de 30% da contagem física do almoxarifado de saúde.",
          type: IssueType.MIGRACAO,
          priority: IssuePriority.CRITICA,
          status: IssueStatus.EM_EXECUCAO,
          isOperationalBlocker: true, // Bloqueio operacional
          authorId: analistaUser.id,
          assigneeId: analistaUser.id,
          dueDate: new Date(2026, 8, 18),
          nextAction: "Conferência física conjunta com o farmacêutico responsável",
          waitingCondition: WaitingCondition.AGUARDANDO_MUNICIPIO,
          waitingType: WaitingType.PLANILHA,
          waitingReason: "Aguardando assinatura da comissão de inventário na planilha de retificação",
          waitingStartedAt: new Date(2026, 8, 8),
        },
      });

      // 6.3 Departamento 3: Compras e Licitações (OPERAÇÃO ASSISTIDA)
      const deptCompras = await prisma.department.create({
        data: {
          entityId: prefEntity.id,
          name: "Compras e Licitações",
          operationalStatus: DepartmentStatus.OPERACAO_ASSISTIDA,
          criticality: IssuePriority.ALTA,
          isDataMigrationValidated: true,
          isParametrizationValidated: true,
          isTrainingCompleted: true,
          lastDiagnosisAt: new Date(),
          modules: {
            create: [{ moduleId: modulesMap.get("COMPRAS")! }],
          },
        },
      });

      const procCompras = await prisma.criticalProcess.create({
        data: {
          departmentId: deptCompras.id,
          name: "Emissão de Processo Licitatório e Dispensa",
          criticality: IssuePriority.ALTA,
        },
      });

      await prisma.testExecution.create({
        data: {
          processId: procCompras.id,
          executorName: "Bruno (Analista Centi)",
          evaluatorName: "Alexandre (Líder)",
          executedAt: new Date(),
          environment: "HOMOLOGACAO",
          modality: TestModality.ASSISTIDA,
          result: TestResult.APROVADO,
          observedResult: "Processo executado com auxílio do analista. Falta teste autônomo do comprador municipal.",
        },
      });

      // 6.4 Departamento 4: Contabilidade (EM PREPARAÇÃO)
      await prisma.department.create({
        data: {
          entityId: prefEntity.id,
          name: "Contabilidade Geral",
          operationalStatus: DepartmentStatus.EM_PREPARACAO,
          criticality: IssuePriority.CRITICA,
          lastDiagnosisAt: new Date(),
          modules: {
            create: [{ moduleId: modulesMap.get("CONTABILIDADE")! }],
          },
        },
      });

      // 6.5 Departamento 5: Protocolo (NÃO AVALIADO)
      await prisma.department.create({
        data: {
          entityId: prefEntity.id,
          name: "Protocolo Central",
          operationalStatus: DepartmentStatus.NAO_AVALIADO,
          criticality: IssuePriority.MEDIA,
          modules: {
            create: [{ moduleId: modulesMap.get("PROTOCOLO")! }],
          },
        },
      });

      // 6.6 Riscos de Demonstração
      await prisma.risk.create({
        data: {
          projectId: projDemo.id,
          description: "Atraso no fornecimento dos arquivos de restos a pagar pelo fornecedor do ERP legado",
          probability: 4,
          impact: 4,
          exposure: 16,
          responsible: "Alexandre (Líder Centi) / Carlos (BA)",
          responsePlan: "Notificação extrajudicial emitida pelo município com prazo de 48 horas.",
          contingencyPlan: "Digitação manual dos empenhos ativos a partir dos relatórios em PDF.",
          status: "MONITORADO",
          isInternal: true,
        },
      });

      // 6.7 Regra da Wiki do Cliente
      await prisma.businessRuleVersion.create({
        data: {
          projectId: projDemo.id,
          title: "Adicional de Insalubridade dos Motoristas de Ambulância",
          category: "CALCULO",
          departmentCode: "FOLHA",
          clientVerbalText: "O Secretário informou verbalmente que todos os motoristas de saúde recebem 40% de insalubridade sobre o salário base.",
          technicalOpinion: "A legislação municipal (Lei 1.234/2018) prevê 20% sobre o salário mínimo para a categoria geral e 40% apenas mediante laudo pericial individual. Recomendado solicitar o laudo formal antes de parametrizar.",
          status: RuleStatus.EM_VALIDACAO,
          informantName: "Roberto Silva (Secretário)",
          validatorName: "Carlos (BA Centi)",
        },
      });

      // 6.8 Diário de Campo
      await prisma.diaryEntry.create({
        data: {
          projectId: projDemo.id,
          authorId: analistaUser.id,
          departmentId: deptFolha.id,
          activity: "Acompanhamento presencial do fechamento da folha espelho",
          workedContent: "Conferência das tabelas do INSS e parametrização do plano de previdência própria (RPPS).",
          resultObserved: "Servidora operou o ERP com segurança. Restou pendente apenas conferir 3 servidores cedidos.",
          findings: "Dois servidores com acúmulo legal de cargos possuem teto remuneratório específico.",
          nextSteps: "Ajustar rubrica de corte do teto constitucional na segunda-feira.",
          status: DiaryStatus.PUBLICADO,
        },
      });

      // 6.9 Ata de Governança Emitida com Snapshot Congelado
      const meetingDemo = await prisma.meeting.create({
        data: {
          projectId: projDemo.id,
          title: "ATA DE REUNIÃO SEMANAL DE GOVERNANÇA",
          meetingDate: new Date(2026, 8, 10),
          startTime: "09:00",
          endTime: "10:30",
          location: "Gabinete do Prefeito e Sala de Reuniões Virtual",
          executionLeader: "Alexandre - Líder de Implantação Centi",
          status: MeetingStatus.EMITIDA,
          participantsCenti: "Alexandre (Líder de Implantação)\nCarlos (Business Analyst)\nMariana (QA)",
          participantsClient: "Roberto Silva (Secretário de Administração)\nAna Souza (Gestora de RH)",
          section1ScheduleStatus: "Módulo de Folha em operação assistida com aprovação da folha espelho. Compras em preparação.",
          section2CriticalPoints: "Inconsistência de saldos no Almoxarifado aguardando retificação formal do município.",
          section3StrategicRealignments: "Prioridade absoluta para o saneamento dos dados de almoxarifado até 18/09.",
          section4ActionPlanSummary: "Plano de ação pactuado com prazos fatais improrrogáveis.",
          section5GeneralSafeguards: "A Centi formaliza notificação sobre o risco de atraso na virada D+0 caso os dados do almoxarifado não sejam entregues.",
        },
      });

      const dec1 = await prisma.meetingDecision.create({
        data: {
          meetingId: meetingDemo.id,
          number: 1,
          description: "Designar comissão especial para recontagem do estoque farmacêutico.",
        },
      });

      await prisma.task.create({
        data: {
          originDecisionId: dec1.id,
          title: "Entregar relatório assinado da recontagem física do almoxarifado",
          responsibleName: "Roberto Silva (Secretário)",
          dueDateFatal: new Date(2026, 8, 18),
        },
      });

      await prisma.meetingSnapshot.create({
        data: {
          meetingId: meetingDemo.id,
          frozenBy: "Alexandre - Líder de Implantação",
          templateVersion: "NOP-001/2026-v12.5",
          snapshotDataJson: JSON.stringify({
            title: "ATA DE REUNIÃO SEMANAL DE GOVERNANÇA",
            projectName: "DEMONSTRAÇÃO — Gestão de Implantação ERP Centi",
            municipalityName: "São Patrício",
            status: "EMITIDA",
            actionPlan: [
              {
                title: "Entregar relatório assinado da recontagem física do almoxarifado",
                responsibleName: "Roberto Silva (Secretário)",
                dueDateFatal: "18/09/2026",
              },
            ],
          }),
        },
      });

      console.log("Projeto de Demonstração criado com sucesso com todos os cenários.");
    }
  }

  console.log("Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
