import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  PrismaClient,
  DepartmentStatus,
  IssueType,
  IssuePriority,
  IssueStatus,
  EntityType,
  TestModality,
  TestResult,
  UserRole,
} from "@prisma/client";
import { evaluateDepartmentOperationalStatus } from "../../src/lib/domain/operational-status";

const prisma = new PrismaClient();

describe("Incremento Vertical 1: Fluxo Completo Ponta a Ponta", () => {
  let orgId: string;
  let liderUserId: string;
  let projectId: string;
  let entityId: string;
  let departmentId: string;
  let processId: string;
  let personId: string;
  let blockerIssueId: string;

  beforeAll(async () => {
    const org = await prisma.organization.findFirst();
    orgId = org!.id;

    const lider = await prisma.user.findFirst({ where: { role: UserRole.LIDER_PROJETO } });
    liderUserId = lider!.id;
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.project.delete({ where: { id: projectId } });
    }
    await prisma.$disconnect();
  });

  it("Passo 1: Criar projeto e associar Líder de Implantação", async () => {
    const mun = await prisma.municipality.findFirst();

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        municipalityId: mun!.id,
        name: "Projeto Vertical Slice 1",
        codePrefix: "VS1",
        memberships: {
          create: [{ userId: liderUserId, role: UserRole.LIDER_PROJETO }],
        },
      },
    });

    projectId = project.id;
    expect(project.id).toBeDefined();

    // Registro na trilha de auditoria
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        projectId: project.id,
        actorId: liderUserId,
        actorName: "Alexandre (Líder)",
        action: "CREATE",
        targetType: "Project",
        targetId: project.id,
        justification: "Abertura do projeto de implantação",
      },
    });
  });

  it("Passo 2: Cadastrar Entidade e Departamento com Módulo de Folha de Pagamento", async () => {
    const entity = await prisma.entity.create({
      data: {
        projectId,
        name: "Prefeitura Municipal",
        type: EntityType.PREFEITURA,
      },
    });
    entityId = entity.id;

    // Servidor-chave para autonomia
    const person = await prisma.person.create({
      data: {
        name: "Clara Santos",
        roleTitle: "Chefe do Setor de Pessoal",
        isMunicipal: true,
      },
    });
    personId = person.id;

    const dept = await prisma.department.create({
      data: {
        entityId: entity.id,
        name: "Recursos Humanos / Folha",
        operationalStatus: DepartmentStatus.NAO_AVALIADO,
        criticality: IssuePriority.CRITICA,
        municipalResponsibleId: person.id,
      },
    });
    departmentId = dept.id;

    expect(dept.id).toBeDefined();
    expect(dept.operationalStatus).toBe(DepartmentStatus.NAO_AVALIADO);
  });

  it("Passo 3: Definir Processo Crítico e requisitos de autonomia", async () => {
    const proc = await prisma.criticalProcess.create({
      data: {
        departmentId,
        name: "Processamento e Fechamento da Folha",
        criticality: IssuePriority.CRITICA,
        evidenceRequired: true,
      },
    });
    processId = proc.id;

    await prisma.autonomyRequirement.create({
      data: {
        processId: proc.id,
        personId,
        isApproved: false,
      },
    });

    // Registra diagnóstico inicial
    await prisma.department.update({
      where: { id: departmentId },
      data: {
        lastDiagnosisAt: new Date(),
        lastDiagnosisNote: "Diagnóstico inicial realizado com levantamento das tabelas salariais.",
      },
    });

    // Avaliação: deve ir para EM_PREPARACAO (tem diagnóstico e processo, mas faltam testes)
    const evalResult = evaluateDepartmentOperationalStatus({
      hasDiagnosis: true,
      lastDiagnosisAt: new Date(),
      isDataMigrationValidated: false,
      isParametrizationValidated: false,
      isTrainingCompleted: false,
      isLeaderValidated: false,
      criticalProcesses: [{ id: proc.id, name: proc.name, evidenceRequired: true, latestTest: null }],
      autonomyRequirements: [{ id: "auto_1", processId: proc.id, personId, isApproved: false }],
      activeBlockers: [],
    });

    expect(evalResult.status).toBe(DepartmentStatus.EM_PREPARACAO);
  });

  it("Passo 4: Registrar Bloqueio Operacional em Processo Crítico -> Atualiza para BLOQUEADO", async () => {
    const issue = await prisma.issue.create({
      data: {
        projectId,
        codeNumber: 1,
        departmentId,
        criticalProcessId: processId,
        title: "Inconsistência de cálculo previdenciário no ERP Centi",
        description: "Alíquota patronal do RPPS calculando valor divergente da Lei Municipal.",
        type: IssueType.ERRO,
        priority: IssuePriority.CRITICA,
        status: IssueStatus.EM_EXECUCAO,
        isOperationalBlocker: true, // BLOQUEIO OPERACIONAL
        authorId: liderUserId,
      },
    });
    blockerIssueId = issue.id;

    // Avaliação: bloqueio ativo força BLOQUEADO
    const evalResult = evaluateDepartmentOperationalStatus({
      hasDiagnosis: true,
      lastDiagnosisAt: new Date(),
      isDataMigrationValidated: false,
      isParametrizationValidated: false,
      isTrainingCompleted: false,
      isLeaderValidated: false,
      criticalProcesses: [{ id: processId, name: "Folha", evidenceRequired: true, latestTest: null }],
      autonomyRequirements: [{ id: "auto_1", processId, personId, isApproved: false }],
      activeBlockers: [{ id: issue.id, codeNumber: issue.codeNumber, title: issue.title, criticalProcessId: processId }],
    });

    expect(evalResult.status).toBe(DepartmentStatus.BLOQUEADO);
    expect(evalResult.activeBlockersCount).toBe(1);

    // Persiste no banco de dados
    await prisma.department.update({
      where: { id: departmentId },
      data: { operationalStatus: DepartmentStatus.BLOQUEADO },
    });
  });

  it("Passo 5: Concluir a correção do bloqueio -> Atualiza para EM_PREPARACAO (não vai direto para OPERACIONAL)", async () => {
    await prisma.issue.update({
      where: { id: blockerIssueId },
      data: {
        status: IssueStatus.CONCLUIDA,
        resolvedAt: new Date(),
        resolvedBy: "Alexandre",
        resolutionSummary: "Tabela de alíquotas corrigida na parametrização do RPPS.",
      },
    });

    // Avaliação: sem bloqueio ativo, mas ainda sem testes aprovados -> EM_PREPARACAO
    const evalResult = evaluateDepartmentOperationalStatus({
      hasDiagnosis: true,
      lastDiagnosisAt: new Date(),
      isDataMigrationValidated: true,
      isParametrizationValidated: true,
      isTrainingCompleted: true,
      isLeaderValidated: false,
      criticalProcesses: [{ id: processId, name: "Folha", evidenceRequired: true, latestTest: null }],
      autonomyRequirements: [{ id: "auto_1", processId, personId, isApproved: false }],
      activeBlockers: [], // Bloqueio concluído
    });

    expect(evalResult.status).toBe(DepartmentStatus.EM_PREPARACAO);
    expect(evalResult.status).not.toBe(DepartmentStatus.OPERACIONAL);
  });

  it("Passo 6: Registrar teste autônomo da usuária-chave com aprovação e validação técnica do Líder -> OPERACIONAL", async () => {
    // 1. Registra teste autônomo
    const testExec = await prisma.testExecution.create({
      data: {
        processId,
        executorName: "Clara Santos (Servidora Municipal)",
        evaluatorName: "Alexandre (Líder Centi)",
        executedAt: new Date(),
        environment: "HOMOLOGACAO",
        modality: TestModality.AUTONOMA,
        result: TestResult.APROVADO,
        observedResult: "Servidora realizou o fechamento da folha espelho e gerou relatório sem suporte.",
      },
    });

    // 2. Atualiza autonomia
    await prisma.autonomyRequirement.updateMany({
      where: { processId, personId },
      data: { isApproved: true, approvedAt: new Date() },
    });

    // 3. Validação técnica do Líder
    await prisma.department.update({
      where: { id: departmentId },
      data: {
        isDataMigrationValidated: true,
        dataMigrationValidatedAt: new Date(),
        isParametrizationValidated: true,
        parametrizationValidatedAt: new Date(),
        isTrainingCompleted: true,
        trainingCompletedAt: new Date(),
        isLeaderValidated: true,
        leaderValidatedAt: new Date(),
        leaderValidatorName: "Alexandre - Líder de Implantação",
      },
    });

    // Avaliação com os 5 critérios atendidos
    const evalResult = evaluateDepartmentOperationalStatus({
      hasDiagnosis: true,
      lastDiagnosisAt: new Date(),
      isDataMigrationValidated: true,
      isParametrizationValidated: true,
      isTrainingCompleted: true,
      isLeaderValidated: true,
      criticalProcesses: [
        {
          id: processId,
          name: "Folha",
          evidenceRequired: true,
          latestTest: {
            id: testExec.id,
            result: "APROVADO",
            executedAt: testExec.executedAt,
            modality: "AUTONOMA",
          },
        },
      ],
      autonomyRequirements: [
        {
          id: "auto_1",
          processId,
          personId,
          isApproved: true,
          latestAutonomousTest: {
            id: testExec.id,
            result: "APROVADO",
            executedAt: testExec.executedAt,
          },
        },
      ],
      activeBlockers: [],
    });

    expect(evalResult.status).toBe(DepartmentStatus.OPERACIONAL);
    expect(evalResult.missingOperationalCriteria.length).toBe(0);

    // Persiste no banco
    const updatedDept = await prisma.department.update({
      where: { id: departmentId },
      data: { operationalStatus: DepartmentStatus.OPERACIONAL },
    });
    expect(updatedDept.operationalStatus).toBe(DepartmentStatus.OPERACIONAL);

    // Trilha de auditoria da homologação
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        projectId,
        actorId: liderUserId,
        actorName: "Alexandre",
        action: "VALIDATE",
        targetType: "Department",
        targetId: departmentId,
        justification: "Homologação técnica de prontidão operacional concedida pelo Líder",
      },
    });

    const auditLogs = await prisma.auditLog.findMany({ where: { projectId } });
    expect(auditLogs.length).toBeGreaterThanOrEqual(2);
  });
});
