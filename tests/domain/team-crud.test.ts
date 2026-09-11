import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import prisma from "../../src/lib/db/prisma";
import { AuthGuard, UserSessionContext } from "../../src/lib/auth/auth-guards";
import { UserRole } from "@prisma/client";

// Mocks para execução das Server Actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockCurrentUser: any = null;
vi.mock("@/lib/auth/server-session", () => ({
  getCurrentUser: vi.fn(async () => mockCurrentUser),
}));

import {
  createTeamMemberAction,
  updateTeamMemberAction,
  removeTeamMemberAction,
} from "../../src/lib/actions/team-actions";

describe("Gestão de Membros da Equipe Técnica (Admin Geral e Líder de Implantação)", () => {
  let orgId: string;
  let projectId: string;
  let testDepartmentId: string;
  let testAdminUser: any;
  let testLeaderUser: any;
  let testAnalystUser: any;
  let existingUnassignedUser: any;

  beforeAll(async () => {
    // 1. Busca ou cria organização
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: "Centi Soluções - Testes Equipe" },
      });
    }
    orgId = org.id;

    // 2. Busca ou cria usuários para testes com papéis reais
    testAdminUser = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN_GERAL },
    });
    if (!testAdminUser) {
      testAdminUser = await prisma.user.create({
        data: {
          name: "Admin Geral Teste Equipe",
          email: "admin.equipe.test@centi.com.br",
          passwordHash: "hash123",
          role: UserRole.ADMIN_GERAL,
          organizationId: orgId,
        },
      });
    }
    orgId = testAdminUser.organizationId;

    testLeaderUser = await prisma.user.create({
      data: {
        name: "Líder Alexandre Teste",
        email: `lider.teste.${Date.now()}@centi.com.br`,
        passwordHash: "hash123",
        role: UserRole.LIDER_PROJETO,
        organizationId: orgId,
      },
    });

    testAnalystUser = await prisma.user.create({
      data: {
        name: "Analista Bruno Teste",
        email: `analista.teste.${Date.now()}@centi.com.br`,
        passwordHash: "hash123",
        role: UserRole.ANALISTA,
        organizationId: orgId,
      },
    });

    existingUnassignedUser = await prisma.user.create({
      data: {
        name: "Especialista Carlos Teste",
        email: `especialista.teste.${Date.now()}@centi.com.br`,
        passwordHash: "hash123",
        role: UserRole.BA,
        organizationId: orgId,
      },
    });

    // 3. Município e Projeto
    let mun = await prisma.municipality.findFirst({
      where: { organizationId: orgId },
    });
    if (!mun) {
      mun = await prisma.municipality.create({
        data: { name: "Município Equipe Teste", state: "GO", organizationId: orgId },
      });
    }

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        municipalityId: mun.id,
        name: "Projeto Teste Gestão de Equipe",
        codePrefix: "TEST-EQ",
      },
    });
    projectId = project.id;

    // 4. Cria membresia de Líder no projeto para testLeaderUser
    await prisma.projectMembership.create({
      data: {
        projectId,
        userId: testLeaderUser.id,
        role: UserRole.LIDER_PROJETO,
      },
    });

    // 5. Cria Entidade e Departamento de teste
    const entity = await prisma.entity.create({
      data: {
        projectId,
        name: "Prefeitura Teste Equipe",
      },
    });

    const dept = await prisma.department.create({
      data: {
        entityId: entity.id,
        name: "Recursos Humanos / Folha Teste",
      },
    });
    testDepartmentId = dept.id;
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Matriz de Autorização (AuthGuard)
  // ---------------------------------------------------------------------------
  describe("1. Matriz de Autorização (AuthGuard)", () => {
    it("deve autorizar ADMIN_GERAL mesmo sem membresia explícita", () => {
      const adminCtx: UserSessionContext = {
        userId: testAdminUser.id,
        organizationId: orgId,
        role: UserRole.ADMIN_GERAL,
        projectMemberships: [],
        departmentAssignments: [],
      };

      const check = AuthGuard.canManageTechnicalTeam(adminCtx, projectId);
      expect(check.allowed).toBe(true);
    });

    it("deve autorizar LIDER_PROJETO designado no projeto", () => {
      const leaderCtx: UserSessionContext = {
        userId: testLeaderUser.id,
        organizationId: orgId,
        role: UserRole.LIDER_PROJETO,
        projectMemberships: [{ projectId, role: UserRole.LIDER_PROJETO }],
        departmentAssignments: [],
      };

      const check = AuthGuard.canManageTechnicalTeam(leaderCtx, projectId);
      expect(check.allowed).toBe(true);
    });

    it("deve bloquear outros papéis (Analista, Leitor, QA sem líder, etc.)", () => {
      const rolesToBlock = [
        UserRole.ANALISTA,
        UserRole.LEITOR,
        UserRole.QA,
        UserRole.BA,
        UserRole.CRM_BRIDGE,
      ];

      for (const role of rolesToBlock) {
        const ctx: UserSessionContext = {
          userId: "user_test",
          organizationId: orgId,
          role,
          projectMemberships: [{ projectId, role }],
          departmentAssignments: [],
        };

        const check = AuthGuard.canManageTechnicalTeam(ctx, projectId);
        expect(check.allowed).toBe(false);
        expect(check.reason).toContain("Acesso negado");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Bloqueio no Nível de Server Action
  // ---------------------------------------------------------------------------
  describe("2. Bloqueio no Nível de Server Action", () => {
    it("deve rejeitar chamadas anônimas sem sessão", async () => {
      mockCurrentUser = null;
      const formData = new FormData();
      formData.set("projectId", projectId);

      await expect(createTeamMemberAction(formData)).rejects.toThrow("Não autenticado");
    });

    it("deve rejeitar execução por Analista", async () => {
      mockCurrentUser = testAnalystUser;
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("name", "Usuário Ilegal");

      await expect(createTeamMemberAction(formData)).rejects.toThrow(
        "Acesso negado: Somente o Administrador Geral e o Líder de Implantação"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Criação e Alocação de Membro (Admin Geral e Líder)
  // ---------------------------------------------------------------------------
  describe("3. Criação e Alocação de Membro", () => {
    let createdNewUserId: string;

    it("[Líder de Implantação] deve cadastrar NOVO usuário Centi e alocar no projeto com departamentos", async () => {
      mockCurrentUser = testLeaderUser;

      const newEmail = `mariana.qa.${Date.now()}@centi.com.br`;
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("mode", "new_user");
      formData.set("name", "Mariana QA Centi");
      formData.set("email", newEmail);
      formData.set("password", "Centi@2026");
      formData.set("role", "QA");
      formData.set("departmentIds", JSON.stringify([testDepartmentId]));

      const res = await createTeamMemberAction(formData);
      expect(res.success).toBe(true);
      expect(res.userId).toBeDefined();
      createdNewUserId = res.userId;

      // Validações no Banco de Dados
      const userInDb = await prisma.user.findUnique({
        where: { id: createdNewUserId },
      });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.name).toBe("Mariana QA Centi");
      expect(userInDb?.role).toBe(UserRole.QA);

      const membership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: createdNewUserId } },
      });
      expect(membership).not.toBeNull();
      expect(membership?.role).toBe(UserRole.QA);

      const assignments = await prisma.departmentAssignment.findMany({
        where: { userId: createdNewUserId },
      });
      expect(assignments).toHaveLength(1);
      expect(assignments[0].departmentId).toBe(testDepartmentId);

      // Validação da Trilha de Auditoria
      const audit = await prisma.auditLog.findFirst({
        where: { targetType: "TeamMember", targetId: createdNewUserId, action: "CREATE" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe(testLeaderUser.id);
    });

    it("deve rejeitar tentativa de cadastrar usuário para cliente ou servidor municipal", async () => {
      mockCurrentUser = testLeaderUser;

      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("mode", "new_user");
      formData.set("name", "Roberto Secretário");
      formData.set("email", "roberto@saopatricio.go.gov.br");
      formData.set("role", "ANALISTA");

      await expect(createTeamMemberAction(formData)).rejects.toThrow(
        "servidores e clientes municipais não podem possuir conta de usuário"
      );
    });

    it("[Admin Geral] deve alocar usuário Centi EXISTENTE no projeto", async () => {
      mockCurrentUser = testAdminUser;

      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("mode", "existing_user");
      formData.set("userId", existingUnassignedUser.id);
      formData.set("role", "BA");
      formData.set("departmentIds", JSON.stringify([testDepartmentId]));

      const res = await createTeamMemberAction(formData);
      expect(res.success).toBe(true);

      const membership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: existingUnassignedUser.id } },
      });
      expect(membership).not.toBeNull();
      expect(membership?.role).toBe(UserRole.BA);
    });

    it("deve rejeitar e-mail duplicado na criação de novo usuário", async () => {
      mockCurrentUser = testLeaderUser;

      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("mode", "new_user");
      formData.set("name", "Nome Repetido");
      formData.set("email", testAdminUser.email); // Já existe

      await expect(createTeamMemberAction(formData)).rejects.toThrow(
        "Já existe um usuário cadastrado com este e-mail."
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Edição de Membro da Equipe Técnica
  // ---------------------------------------------------------------------------
  describe("4. Edição de Membro da Equipe Técnica", () => {
    it("[Líder de Implantação] deve atualizar papel do membro e redistribuir departamentos", async () => {
      mockCurrentUser = testLeaderUser;

      const membership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: existingUnassignedUser.id } },
      });
      expect(membership).not.toBeNull();

      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("membershipId", membership!.id);
      formData.set("userId", existingUnassignedUser.id);
      formData.set("name", "Carlos BA Atualizado");
      formData.set("email", existingUnassignedUser.email);
      formData.set("role", "CRM_BRIDGE"); // Mudança de papel
      formData.set("departmentIds", JSON.stringify([])); // Desvincula departamentos

      const res = await updateTeamMemberAction(formData);
      expect(res.success).toBe(true);

      // Verifica papel atualizado
      const updatedMembership = await prisma.projectMembership.findUnique({
        where: { id: membership!.id },
      });
      expect(updatedMembership?.role).toBe(UserRole.CRM_BRIDGE);

      // Verifica departamentos esvaziados
      const assignments = await prisma.departmentAssignment.findMany({
        where: { userId: existingUnassignedUser.id },
      });
      expect(assignments).toHaveLength(0);

      // Trilha de auditoria
      const audit = await prisma.auditLog.findFirst({
        where: { targetType: "TeamMember", targetId: existingUnassignedUser.id, action: "UPDATE" },
      });
      expect(audit).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Remoção de Membro da Equipe Técnica
  // ---------------------------------------------------------------------------
  describe("5. Remoção de Membro da Equipe Técnica", () => {
    it("deve impedir desalocar o ÚNICO líder do projeto sem forçar", async () => {
      mockCurrentUser = testAdminUser;

      const leaderMembership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: testLeaderUser.id } },
      });

      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("membershipId", leaderMembership!.id);
      formData.set("userId", testLeaderUser.id);
      formData.set("force", "false");

      await expect(removeTeamMemberAction(formData)).rejects.toThrow(
        "Este usuário é o único Líder de Projeto designado."
      );
    });

    it("[Admin Geral] deve remover membro com sucesso e limpar alocações departamentais", async () => {
      mockCurrentUser = testAdminUser;

      const membership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: existingUnassignedUser.id } },
      });
      expect(membership).not.toBeNull();

      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("membershipId", membership!.id);
      formData.set("userId", existingUnassignedUser.id);

      const res = await removeTeamMemberAction(formData);
      expect(res.success).toBe(true);

      // Verifica membresia removida
      const checkMembership = await prisma.projectMembership.findUnique({
        where: { id: membership!.id },
      });
      expect(checkMembership).toBeNull();

      // Verifica usuário continua existindo no banco
      const userStillExists = await prisma.user.findUnique({
        where: { id: existingUnassignedUser.id },
      });
      expect(userStillExists).not.toBeNull();

      // Auditoria
      const audit = await prisma.auditLog.findFirst({
        where: { targetType: "TeamMember", targetId: existingUnassignedUser.id, action: "DELETE" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.justification).toContain("Desalocação formal de membro");
    });
  });
});
