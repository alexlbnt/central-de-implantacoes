import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../../src/lib/db/prisma";
import { UserRole, IssuePriority, IssueStatus, IssueType, WaitingCondition, EntityType, DepartmentStatus } from "@prisma/client";

// Mocks para execução das Server Actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockCurrentUser: any = null;
vi.mock("@/lib/auth/server-session", () => ({
  getCurrentUser: vi.fn(async () => mockCurrentUser),
}));

import {
  createIssueAction,
  updateIssueAction,
  updateIssueStatusAction,
  deleteIssueAction,
} from "../../src/lib/actions/issue-actions";

describe("Gestão e Edição de Pendências e Ações de Campo (/pendencias)", () => {
  let orgA: any;
  let orgB: any;
  let userOrgA: any;
  let userOrgB: any;
  let projectA: any;
  let projectB: any;
  let deptFolha: any;
  let deptContabil: any;
  let deptOutroProjeto: any;

  const createdIssueIds: string[] = [];

  beforeAll(async () => {
    // 1. Organização Principal A
    orgA = await prisma.organization.create({
      data: { name: `Org Testes Pendencias A ${Date.now()}` },
    });

    userOrgA = await prisma.user.create({
      data: {
        name: "Analista Centi Pendencias",
        email: `analista.pendencias.${Date.now()}@centi.com.br`,
        passwordHash: "hash123",
        role: UserRole.ANALISTA,
        organizationId: orgA.id,
      },
    });

    const munA = await prisma.municipality.create({
      data: { name: `Município Pendencias A ${Date.now()}`, state: "GO", organizationId: orgA.id },
    });

    projectA = await prisma.project.create({
      data: {
        name: "Projeto Pendencias Município A",
        codePrefix: "TEST",
        organizationId: orgA.id,
        municipalityId: munA.id,
      },
    });

    const entityPref = await prisma.entity.create({
      data: {
        projectId: projectA.id,
        name: "Prefeitura Teste Pendencias",
        type: EntityType.PREFEITURA,
      },
    });

    deptFolha = await prisma.department.create({
      data: {
        entityId: entityPref.id,
        name: "Recursos Humanos / Folha",
        operationalStatus: DepartmentStatus.EM_PREPARACAO,
      },
    });

    deptContabil = await prisma.department.create({
      data: {
        entityId: entityPref.id,
        name: "Contabilidade Geral",
        operationalStatus: DepartmentStatus.EM_PREPARACAO,
      },
    });

    // 2. Organização Isolada B (Para testes de IDOR)
    orgB = await prisma.organization.create({
      data: { name: `Org Testes Pendencias B ${Date.now()}` },
    });

    userOrgB = await prisma.user.create({
      data: {
        name: "Usuário Org B",
        email: `usuario.orgb.${Date.now()}@outro.gov.br`,
        passwordHash: "hash123",
        role: UserRole.LIDER_PROJETO,
        organizationId: orgB.id,
      },
    });

    const munB = await prisma.municipality.create({
      data: { name: `Município B ${Date.now()}`, state: "MG", organizationId: orgB.id },
    });

    projectB = await prisma.project.create({
      data: {
        name: "Projeto Município B",
        codePrefix: "PRJB",
        organizationId: orgB.id,
        municipalityId: munB.id,
      },
    });

    const entityB = await prisma.entity.create({
      data: {
        projectId: projectB.id,
        name: "Prefeitura B",
        type: EntityType.PREFEITURA,
      },
    });

    deptOutroProjeto = await prisma.department.create({
      data: {
        entityId: entityB.id,
        name: "Tributos Outro Município",
      },
    });

    mockCurrentUser = userOrgA;
  });

  afterAll(async () => {
    if (createdIssueIds.length > 0) {
      await prisma.issueStatusHistory.deleteMany({
        where: { issueId: { in: createdIssueIds } },
      });
      await prisma.issue.deleteMany({
        where: { id: { in: createdIssueIds } },
      });
    }

    if (deptFolha?.id) await prisma.department.delete({ where: { id: deptFolha.id } });
    if (deptContabil?.id) await prisma.department.delete({ where: { id: deptContabil.id } });
    if (deptOutroProjeto?.id) await prisma.department.delete({ where: { id: deptOutroProjeto.id } });

    await prisma.entity.deleteMany({ where: { projectId: { in: [projectA.id, projectB.id] } } });
    await prisma.project.deleteMany({ where: { id: { in: [projectA.id, projectB.id] } } });
    await prisma.municipality.deleteMany({ where: { organizationId: { in: [orgA.id, orgB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userOrgA.id, userOrgB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  });

  it("1. Deve criar uma pendência com número sequencial e departamento vinculado", async () => {
    mockCurrentUser = userOrgA;

    const formData = new FormData();
    formData.set("projectId", projectA.id);
    formData.set("title", "Divergência na Tabela de Rubricas da Saúde");
    formData.set("description", "Identificada rubrica sem incidência de previdência própria");
    formData.set("departmentId", deptFolha.id);
    formData.set("priority", "ALTA");
    formData.set("type", "PARAMETRIZACAO");
    formData.set("isOperationalBlocker", "true");
    formData.set("dueDate", "2026-10-15");
    formData.set("nextAction", "Alinhar com equipe de folha");

    await createIssueAction(formData);

    const issue = await prisma.issue.findFirst({
      where: { projectId: projectA.id, title: "Divergência na Tabela de Rubricas da Saúde" },
      include: { department: true },
    });

    expect(issue).not.toBeNull();
    expect(issue?.codeNumber).toBeGreaterThanOrEqual(1);
    expect(issue?.departmentId).toBe(deptFolha.id);
    expect(issue?.priority).toBe(IssuePriority.ALTA);
    expect(issue?.type).toBe(IssueType.PARAMETRIZACAO);
    expect(issue?.isOperationalBlocker).toBe(true);
    expect(issue?.version).toBe(1);

    createdIssueIds.push(issue!.id);
  });

  it("2. Deve editar a pendência alterando título, descrição, prioridade para CRÍTICA e reatribuindo departamento", async () => {
    mockCurrentUser = userOrgA;
    const issueId = createdIssueIds[0];

    const formData = new FormData();
    formData.set("issueId", issueId);
    formData.set("title", "Divergência Crítica nas Rubricas e Contabilidade");
    formData.set("description", "Ajustada descrição detalhada com parecer técnico");
    formData.set("departmentId", deptContabil.id); // Transfere para Contabilidade
    formData.set("priority", "CRITICA");
    formData.set("type", "ERRO");
    formData.set("status", "EM_ANALISE");
    formData.set("isOperationalBlocker", "true");
    formData.set("dueDate", "2026-10-20");
    formData.set("nextAction", "Conferir empenhos no módulo Contábil");
    formData.set("waitingCondition", "AGUARDANDO_MUNICIPIO");
    formData.set("waitingReason", "Aguardando envio do decreto municipal");

    await updateIssueAction(formData);

    const updated = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { department: true },
    });

    expect(updated?.title).toBe("Divergência Crítica nas Rubricas e Contabilidade");
    expect(updated?.description).toBe("Ajustada descrição detalhada com parecer técnico");
    expect(updated?.departmentId).toBe(deptContabil.id);
    expect(updated?.department?.name).toBe("Contabilidade Geral");
    expect(updated?.priority).toBe(IssuePriority.CRITICA);
    expect(updated?.type).toBe(IssueType.ERRO);
    expect(updated?.status).toBe(IssueStatus.EM_ANALISE);
    expect(updated?.waitingCondition).toBe(WaitingCondition.AGUARDANDO_MUNICIPIO);
    expect(updated?.waitingReason).toBe("Aguardando envio do decreto municipal");
    expect(updated?.version).toBe(2); // OCC incrementado
  });

  it("3. Deve atualizar o status rápido da pendência para CONCLUIDA com resolvedAt", async () => {
    mockCurrentUser = userOrgA;
    const issueId = createdIssueIds[0];

    const formData = new FormData();
    formData.set("issueId", issueId);
    formData.set("status", "CONCLUIDA");

    await updateIssueStatusAction(formData);

    const resolved = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    expect(resolved?.status).toBe(IssueStatus.CONCLUIDA);
    expect(resolved?.resolvedAt).not.toBeNull();
    expect(resolved?.resolvedBy).toBe(userOrgA.name);

    // Histórico de status
    const history = await prisma.issueStatusHistory.findFirst({
      where: { issueId, toStatus: IssueStatus.CONCLUIDA },
    });
    expect(history).not.toBeNull();
  });

  it("4. [Segurança / IDOR] Deve impedir edição de pendência pertencente a outra organização", async () => {
    mockCurrentUser = userOrgB; // Usuário da Org B tentando editar pendência da Org A
    const issueId = createdIssueIds[0];

    const formData = new FormData();
    formData.set("issueId", issueId);
    formData.set("title", "Tentativa de Edição IDOR");

    await expect(updateIssueAction(formData)).rejects.toThrow(
      "Acesso não autorizado para editar esta pendência."
    );
  });

  it("5. [Segurança / IDOR] Deve impedir vincular pendência a departamento de outro município/projeto", async () => {
    mockCurrentUser = userOrgA;
    const issueId = createdIssueIds[0];

    const formData = new FormData();
    formData.set("issueId", issueId);
    formData.set("title", "Tentativa de Vínculo com Dept Alienígena");
    formData.set("departmentId", deptOutroProjeto.id); // Departamento do Projeto B!

    await expect(updateIssueAction(formData)).rejects.toThrow(
      "O departamento selecionado não pertence a este município."
    );
  });

  it("6. Deve excluir uma pendência e auditar a ação", async () => {
    mockCurrentUser = userOrgA;
    const issueId = createdIssueIds[0];

    const formData = new FormData();
    formData.set("issueId", issueId);

    await deleteIssueAction(formData);

    const deleted = await prisma.issue.findUnique({
      where: { id: issueId },
    });
    expect(deleted).toBeNull();
  });
});
