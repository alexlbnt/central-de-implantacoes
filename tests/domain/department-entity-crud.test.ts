import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import prisma from "../../src/lib/db/prisma";
import { AuthGuard, UserSessionContext } from "../../src/lib/auth/auth-guards";
import { UserRole, EntityType, IssuePriority } from "@prisma/client";

// Mocks para execução das Server Actions em ambiente de teste
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockUser: any = null;
vi.mock("@/lib/auth/server-session", () => ({
  getCurrentUser: vi.fn(async () => mockUser),
}));

import {
  createEntityAction,
  updateEntityAction,
  deleteEntityAction,
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
} from "../../src/lib/actions/department-entity-actions";

describe("Gestão de Departamentos e Instâncias Setoriais por ADMIN_GERAL", () => {
  let orgId: string;
  let projectId: string;
  let moduleCatalogId: string;
  let testAdminUser: any;
  let testAnalistaUser: any;

  beforeAll(async () => {
    // Busca ou cria usuário ADMIN_GERAL real do banco de dados
    testAdminUser = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN_GERAL },
    });
    if (!testAdminUser) {
      let org = await prisma.organization.findFirst();
      if (!org) {
        org = await prisma.organization.create({
          data: { name: "Centi Soluções - Teste" },
        });
      }
      testAdminUser = await prisma.user.create({
        data: {
          name: "Administrador Geral Teste",
          email: "admin.teste.crud@centi.com.br",
          passwordHash: "hash123",
          role: UserRole.ADMIN_GERAL,
          organizationId: org.id,
        },
      });
    }
    orgId = testAdminUser.organizationId;

    testAnalistaUser = await prisma.user.findFirst({
      where: { role: UserRole.ANALISTA },
    });
    if (!testAnalistaUser) {
      testAnalistaUser = await prisma.user.create({
        data: {
          name: "Analista Centi Teste",
          email: "analista.teste.crud@centi.com.br",
          passwordHash: "hash123",
          role: UserRole.ANALISTA,
          organizationId: orgId,
        },
      });
    }

    let mun = await prisma.municipality.findFirst({
      where: { organizationId: orgId },
    });
    if (!mun) {
      mun = await prisma.municipality.create({
        data: { name: "Município Teste CRUD", state: "GO", organizationId: orgId },
      });
    }

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        municipalityId: mun.id,
        name: "Projeto Teste Governança Departamental",
        codePrefix: "TEST-DEP",
      },
    });
    projectId = project.id;

    // Busca ou cria catálogo de módulos
    let mod = await prisma.moduleCatalog.findFirst();
    if (!mod) {
      mod = await prisma.moduleCatalog.create({
        data: { name: "Folha e Recursos Humanos", code: "FOLHA_TEST" },
      });
    }
    moduleCatalogId = mod.id;
  });

  afterAll(async () => {
    // Limpeza do projeto de teste
    if (projectId) {
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Matriz de Autorização (AuthGuard)
  // ---------------------------------------------------------------------------
  describe("1. Matriz de Autorização (AuthGuard)", () => {
    it("deve autorizar exclusivamente ADMIN_GERAL a gerenciar departamentos e instâncias", () => {
      const adminCtx: UserSessionContext = {
        userId: "admin1",
        organizationId: orgId,
        role: UserRole.ADMIN_GERAL,
        projectMemberships: [],
        departmentAssignments: [],
      };

      const check = AuthGuard.canManageDepartmentsAndEntities(adminCtx);
      expect(check.allowed).toBe(true);
      expect(check.reason).toBeUndefined();
    });

    it("deve bloquear todos os outros perfis (Líder, Analista, Representante, Leitor, etc.)", () => {
      const rolesToReject = [
        UserRole.LIDER_PROJETO,
        UserRole.ANALISTA,
        UserRole.LEITOR,
        UserRole.DC,
        UserRole.CRM_BRIDGE,
        UserRole.QA,
        UserRole.BA,
      ];

      for (const role of rolesToReject) {
        const ctx: UserSessionContext = {
          userId: `user_${role}`,
          organizationId: orgId,
          role,
          projectMemberships: [{ projectId, role }],
          departmentAssignments: [],
        };

        const check = AuthGuard.canManageDepartmentsAndEntities(ctx);
        expect(check.allowed).toBe(false);
        expect(check.reason).toContain("Acesso negado: Somente o Administrador Geral");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Bloqueio no Nível de Server Action para Não-Admins
  // ---------------------------------------------------------------------------
  describe("2. Bloqueio no Nível de Server Action para Não-Admins", () => {
    it("deve rejeitar execução anônima (sem sessão)", async () => {
      mockUser = null;
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("name", "Instância Ilegal");

      await expect(createEntityAction(formData)).rejects.toThrow("Acesso negado");
    });

    it("deve rejeitar execução por usuário Analista ou Líder", async () => {
      mockUser = testAnalistaUser;

      const fdEntity = new FormData();
      fdEntity.set("projectId", projectId);
      fdEntity.set("name", "Instância Não Autorizada");

      await expect(createEntityAction(fdEntity)).rejects.toThrow(
        "Acesso negado: Somente o Administrador Geral possui permissão"
      );

      const fdDept = new FormData();
      fdDept.set("name", "Departamento Não Autorizado");
      await expect(createDepartmentAction(fdDept)).rejects.toThrow("Acesso negado");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Operações CRUD de Instância Setorial (Entity) por ADMIN_GERAL
  // ---------------------------------------------------------------------------
  describe("3. Operações CRUD de Instância Setorial (Entity) por ADMIN_GERAL", () => {
    let createdEntityId: string;

    beforeEach(() => {
      mockUser = testAdminUser;
    });

    it("deve criar com sucesso uma Instância Setorial (Autarquia / IPREV) e registrar auditoria", async () => {
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("name", "Instituto de Previdência Municipal - IPREV");
      formData.set("type", "AUTARQUIA");
      formData.set("identifier", "12.345.678/0001-99");
      formData.set("notes", "Autarquia responsável pelo RPPS dos servidores");

      const res = await createEntityAction(formData);
      expect(res.success).toBe(true);
      expect(res.entityId).toBeDefined();
      createdEntityId = res.entityId;

      // Validação no banco de dados
      const entityInDb = await prisma.entity.findUnique({
        where: { id: createdEntityId },
      });
      expect(entityInDb).not.toBeNull();
      expect(entityInDb?.name).toBe("Instituto de Previdência Municipal - IPREV");
      expect(entityInDb?.type).toBe(EntityType.AUTARQUIA);
      expect(entityInDb?.identifier).toBe("12.345.678/0001-99");

      // Validação na Trilha de Auditoria
      const auditLog = await prisma.auditLog.findFirst({
        where: { targetType: "Entity", targetId: createdEntityId, action: "CREATE" },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorId).toBe(testAdminUser.id);
    });

    it("deve editar dados cadastrais da Instância Setorial e registrar trilha de auditoria", async () => {
      const formData = new FormData();
      formData.set("entityId", createdEntityId);
      formData.set("name", "Instituto de Previdência Municipal de São Patrício - IPREV");
      formData.set("type", "AUTARQUIA");
      formData.set("identifier", "12.345.678/0001-00");
      formData.set("notes", "Cadastro atualizado com CNPJ definitivo.");

      const res = await updateEntityAction(formData);
      expect(res.success).toBe(true);

      const entityInDb = await prisma.entity.findUnique({
        where: { id: createdEntityId },
      });
      expect(entityInDb?.name).toBe("Instituto de Previdência Municipal de São Patrício - IPREV");
      expect(entityInDb?.identifier).toBe("12.345.678/0001-00");

      const auditLog = await prisma.auditLog.findFirst({
        where: { targetType: "Entity", targetId: createdEntityId, action: "UPDATE" },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.changedFields).toContain("São Patrício");
    });

    it("deve falhar se os campos obrigatórios estiverem ausentes", async () => {
      const formData = new FormData();
      formData.set("entityId", createdEntityId);
      formData.set("name", ""); // Nome vazio

      await expect(updateEntityAction(formData)).rejects.toThrow(
        "ID da Instância e Nome são obrigatórios."
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Operações CRUD de Departamento por ADMIN_GERAL
  // ---------------------------------------------------------------------------
  describe("4. Operações CRUD de Departamento por ADMIN_GERAL", () => {
    let testEntityId: string;
    let createdDepartmentId: string;

    beforeAll(async () => {
      const entity = await prisma.entity.create({
        data: {
          projectId,
          name: "Câmara Municipal Teste CRUD",
          type: EntityType.CAMARA,
        },
      });
      testEntityId = entity.id;
    });

    beforeEach(() => {
      mockUser = testAdminUser;
    });

    it("deve criar departamento vinculado à entidade, associar módulos e registrar auditoria", async () => {
      const formData = new FormData();
      formData.set("entityId", testEntityId);
      formData.set("name", "Contabilidade da Câmara");
      formData.set("criticality", "CRITICA");
      formData.set("moduleIds", JSON.stringify([moduleCatalogId]));

      const res = await createDepartmentAction(formData);
      expect(res.success).toBe(true);
      expect(res.departmentId).toBeDefined();
      createdDepartmentId = res.departmentId;

      // Validação no banco de dados
      const deptInDb = await prisma.department.findUnique({
        where: { id: createdDepartmentId },
        include: { modules: true },
      });
      expect(deptInDb).not.toBeNull();
      expect(deptInDb?.name).toBe("Contabilidade da Câmara");
      expect(deptInDb?.criticality).toBe(IssuePriority.CRITICA);
      expect(deptInDb?.modules).toHaveLength(1);
      expect(deptInDb?.modules[0].moduleId).toBe(moduleCatalogId);

      // Auditoria
      const auditLog = await prisma.auditLog.findFirst({
        where: { targetType: "Department", targetId: createdDepartmentId, action: "CREATE" },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorId).toBe(testAdminUser.id);
    });

    it("deve atualizar dados do departamento e sincronizar módulos associados", async () => {
      const formData = new FormData();
      formData.set("departmentId", createdDepartmentId);
      formData.set("entityId", testEntityId);
      formData.set("name", "Contabilidade e Finanças da Câmara");
      formData.set("criticality", "ALTA");
      formData.set("moduleIds", JSON.stringify([])); // Remove associação

      const res = await updateDepartmentAction(formData);
      expect(res.success).toBe(true);

      const deptInDb = await prisma.department.findUnique({
        where: { id: createdDepartmentId },
        include: { modules: true },
      });
      expect(deptInDb?.name).toBe("Contabilidade e Finanças da Câmara");
      expect(deptInDb?.criticality).toBe(IssuePriority.ALTA);
      expect(deptInDb?.modules).toHaveLength(0); // Módulo removido corretamente

      const auditLog = await prisma.auditLog.findFirst({
        where: { targetType: "Department", targetId: createdDepartmentId, action: "UPDATE" },
      });
      expect(auditLog).not.toBeNull();
    });

    it("deve excluir o departamento definitivamente e registrar na trilha de auditoria", async () => {
      const formData = new FormData();
      formData.set("departmentId", createdDepartmentId);

      const res = await deleteDepartmentAction(formData);
      expect(res.success).toBe(true);

      const deptInDb = await prisma.department.findUnique({
        where: { id: createdDepartmentId },
      });
      expect(deptInDb).toBeNull();

      const auditLog = await prisma.auditLog.findFirst({
        where: { targetType: "Department", targetId: createdDepartmentId, action: "DELETE" },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.justification).toContain("Exclusão definitiva de departamento pelo Administrador Geral");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Exclusão de Entidade com Exclusão de Departamentos Associados
  // ---------------------------------------------------------------------------
  describe("5. Exclusão de Entidade por ADMIN_GERAL", () => {
    beforeEach(() => {
      mockUser = testAdminUser;
    });

    it("deve excluir uma entidade e registrar auditoria", async () => {
      // Cria entidade temporária
      const entity = await prisma.entity.create({
        data: {
          projectId,
          name: "Entidade Temporária para Exclusão",
          type: EntityType.FUNDO,
        },
      });

      const formData = new FormData();
      formData.set("entityId", entity.id);

      const res = await deleteEntityAction(formData);
      expect(res.success).toBe(true);

      const checkInDb = await prisma.entity.findUnique({
        where: { id: entity.id },
      });
      expect(checkInDb).toBeNull();

      const auditLog = await prisma.auditLog.findFirst({
        where: { targetType: "Entity", targetId: entity.id, action: "DELETE" },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.action).toBe("DELETE");
    });
  });
});
