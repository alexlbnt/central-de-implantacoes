import { describe, it, expect } from "vitest";
import { AuthGuard, UserSessionContext } from "../../src/lib/auth/auth-guards";
import { UserRole } from "@prisma/client";

describe("Segurança: Proteção Contra IDOR e Isolamento de Perfis (Critério 03)", () => {
  const analistaContext: UserSessionContext = {
    userId: "user_analista_1",
    organizationId: "org_centi",
    role: UserRole.ANALISTA,
    projectMemberships: [{ projectId: "proj_sao_patricio", role: UserRole.ANALISTA }],
    departmentAssignments: [{ departmentId: "dept_folha", isLead: false }],
  };

  const municipalContext: UserSessionContext = {
    userId: "user_servidor_mun",
    organizationId: "org_centi",
    role: UserRole.REPRESENTANTE_MUNICIPAL,
    projectMemberships: [{ projectId: "proj_sao_patricio", role: UserRole.REPRESENTANTE_MUNICIPAL }],
    departmentAssignments: [{ departmentId: "dept_almoxarifado", isLead: false }],
  };

  const adminContext: UserSessionContext = {
    userId: "user_admin",
    organizationId: "org_centi",
    role: UserRole.ADMIN_GERAL,
    projectMemberships: [],
    departmentAssignments: [],
  };

  it("[Critério 03] Usuário alheio sem membresia em projeto deve ser impedido de acessar (IDOR)", () => {
    // Analista do projeto São Patrício tentando acessar Projeto "Outro Município"
    const access = AuthGuard.canAccessProject(analistaContext, "proj_outro_municipio");

    expect(access.allowed).toBe(false);
    expect(access.reason).toContain("Acesso negado");
  });

  it("[Critério 03] Representante municipal só acessa seus departamentos autorizados", () => {
    // Servidor do Almoxarifado acessando Almoxarifado
    const accessAlmox = AuthGuard.canAccessDepartment(municipalContext, "proj_sao_patricio", "dept_almoxarifado");
    expect(accessAlmox.allowed).toBe(true);

    // Servidor do Almoxarifado tentando acessar Folha de Pagamento
    const accessFolha = AuthGuard.canAccessDepartment(municipalContext, "proj_sao_patricio", "dept_folha");
    expect(accessFolha.allowed).toBe(false);
    expect(accessFolha.reason).toContain("Acesso restrito");
  });

  it("[Critério 03] Representante Municipal e Leitor são ESTRITAMENTE VEDADOS de ver notas internas Centi", () => {
    expect(AuthGuard.canViewInternalNotes(municipalContext)).toBe(false);
    expect(AuthGuard.canViewInternalNotes(analistaContext)).toBe(true);
    expect(AuthGuard.canViewInternalNotes(adminContext)).toBe(true);
  });

  it("[Critério 03] Administrador geral NÃO pode validar prontidão técnica apenas por ser admin", () => {
    const checkAdmin = AuthGuard.canValidateReadiness(adminContext, "proj_sao_patricio");
    expect(checkAdmin.allowed).toBe(false);
    expect(checkAdmin.reason).toContain("privativo do Líder do Projeto");

    // Líder designado no projeto pode validar
    const liderContext: UserSessionContext = {
      userId: "user_lider",
      organizationId: "org_centi",
      role: UserRole.LIDER_PROJETO,
      projectMemberships: [{ projectId: "proj_sao_patricio", role: UserRole.LIDER_PROJETO }],
      departmentAssignments: [],
    };

    const checkLider = AuthGuard.canValidateReadiness(liderContext, "proj_sao_patricio");
    expect(checkLider.allowed).toBe(true);
  });
});
