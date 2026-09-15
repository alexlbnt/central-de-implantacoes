import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../../src/lib/db/prisma";
import { UserRole, RuleStatus, EntityType } from "@prisma/client";

// Mocks para execução das Server Actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockCurrentUser: any = null;
vi.mock("@/lib/auth/server-session", () => ({
  getCurrentUser: vi.fn(async () => mockCurrentUser),
}));

import {
  createBusinessRuleAction,
  updateBusinessRuleAction,
  validateBusinessRuleAction,
  deleteBusinessRuleAction,
} from "../../src/lib/actions/rule-actions";

describe("Gestão e Edição de Particularidades Municipais com Vínculo de Departamentos (/wiki)", () => {
  let orgA: any;
  let orgB: any;
  let userOrgA: any;
  let userOrgB: any;
  let projectA: any;
  let projectB: any;
  let deptFolha: any;
  let deptContabil: any;
  let deptOutroProjeto: any;

  const createdRuleIds: string[] = [];

  beforeAll(async () => {
    // 1. Organização Principal A
    orgA = await prisma.organization.create({
      data: { name: `Org Testes Wiki A ${Date.now()}` },
    });

    userOrgA = await prisma.user.create({
      data: {
        name: "Líder Centi Wiki",
        email: `lider.wiki.${Date.now()}@centi.com.br`,
        passwordHash: "hash123",
        role: UserRole.LIDER_PROJETO,
        organizationId: orgA.id,
      },
    });

    const munA = await prisma.municipality.create({
      data: { name: `Município A ${Date.now()}`, state: "GO", organizationId: orgA.id },
    });

    projectA = await prisma.project.create({
      data: {
        name: "Projeto Implantação Município A",
        codePrefix: "PRJA",
        organizationId: orgA.id,
        municipalityId: munA.id,
      },
    });

    const entityPref = await prisma.entity.create({
      data: {
        projectId: projectA.id,
        name: "Prefeitura de Teste A",
        type: EntityType.PREFEITURA,
      },
    });

    deptFolha = await prisma.department.create({
      data: {
        entityId: entityPref.id,
        name: "Recursos Humanos / Folha de Pagamento",
      },
    });

    deptContabil = await prisma.department.create({
      data: {
        entityId: entityPref.id,
        name: "Contabilidade e Finanças",
      },
    });

    // 2. Organização Isolada B (Para testes de IDOR)
    orgB = await prisma.organization.create({
      data: { name: `Org Testes Wiki B ${Date.now()}` },
    });

    userOrgB = await prisma.user.create({
      data: {
        name: "Invasor Org B",
        email: `invasor.${Date.now()}@outro.gov.br`,
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
        name: "Arrecadação Municipal B",
      },
    });

    // Usuário padrão autenticado
    mockCurrentUser = userOrgA;
  });

  afterAll(async () => {
    // Limpeza
    if (createdRuleIds.length > 0) {
      await prisma.businessRuleVersion.deleteMany({
        where: { id: { in: createdRuleIds } },
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

  it("1. Deve criar uma particularidade vinculada a um departamento específico (Folha de Pagamento)", async () => {
    mockCurrentUser = userOrgA;

    const formData = new FormData();
    formData.set("projectId", projectA.id);
    formData.set("title", "Quinquênio e Gratificação de Desempenho");
    formData.set("category", "PARTICULARIDADE_MUNICIPAL");
    formData.set("departmentId", deptFolha.id);
    formData.set("informantName", "Carlos (Diretor de RH)");
    formData.set("clientVerbalText", "Servidores com mais de 5 anos de casa recebem 10% cumulativo a cada período.");
    formData.set("technicalOpinion", "Verificado no Estatuto dos Servidores (Lei 432/2012), art. 45. Parametrizar rubrica 104.");

    const res = await createBusinessRuleAction(formData);
    expect(res.success).toBe(true);
    expect(res.ruleId).toBeDefined();
    createdRuleIds.push(res.ruleId);

    const ruleInDb = await prisma.businessRuleVersion.findUnique({
      where: { id: res.ruleId },
      include: { department: true },
    });

    expect(ruleInDb).not.toBeNull();
    expect(ruleInDb?.title).toBe("Quinquênio e Gratificação de Desempenho");
    expect(ruleInDb?.departmentId).toBe(deptFolha.id);
    expect(ruleInDb?.department?.name).toBe("Recursos Humanos / Folha de Pagamento");
    expect(ruleInDb?.status).toBe(RuleStatus.EM_VALIDACAO);
    expect(ruleInDb?.versionNumber).toBe(1);
    expect(ruleInDb?.version).toBe(1);

    // Verifica a relação inversa no departamento
    const deptWithRules = await prisma.department.findUnique({
      where: { id: deptFolha.id },
      include: { rules: true },
    });
    expect(deptWithRules?.rules.some((r) => r.id === res.ruleId)).toBe(true);
  });

  it("2. Deve editar a particularidade alterando título, parecer técnico e reatribuindo departamento (Contabilidade)", async () => {
    mockCurrentUser = userOrgA;
    const ruleId = createdRuleIds[0];

    const formData = new FormData();
    formData.set("ruleId", ruleId);
    formData.set("title", "Quinquênio e Gratificação de Desempenho — Ajuste Contábil");
    formData.set("category", "CALCULO");
    formData.set("departmentId", deptContabil.id); // Reatribui para Contabilidade
    formData.set("informantName", "Mariana (Contadora Geral)");
    formData.set("clientVerbalText", "A despesa do quinquênio deve ser empenhada no elemento 3.1.90.11.");
    formData.set("technicalOpinion", "Parecer atualizado: Configurar vinculação contábil no módulo Contabilidade da Centi.");
    formData.set("status", "EM_VALIDACAO");

    const res = await updateBusinessRuleAction(formData);
    expect(res.success).toBe(true);

    const updatedDb = await prisma.businessRuleVersion.findUnique({
      where: { id: ruleId },
      include: { department: true },
    });

    expect(updatedDb?.title).toBe("Quinquênio e Gratificação de Desempenho — Ajuste Contábil");
    expect(updatedDb?.category).toBe("CALCULO");
    expect(updatedDb?.departmentId).toBe(deptContabil.id);
    expect(updatedDb?.department?.name).toBe("Contabilidade e Finanças");
    expect(updatedDb?.informantName).toBe("Mariana (Contadora Geral)");
    expect(updatedDb?.technicalOpinion).toContain("Configurar vinculação contábil");
    // OCC e versionamento incrementados
    expect(updatedDb?.versionNumber).toBe(2);
    expect(updatedDb?.version).toBe(2);
  });

  it("3. Deve desvincular o departamento tornando a particularidade de âmbito geral do município", async () => {
    mockCurrentUser = userOrgA;
    const ruleId = createdRuleIds[0];

    const formData = new FormData();
    formData.set("ruleId", ruleId);
    formData.set("title", "Quinquênio e Gratificação de Desempenho — Geral");
    formData.set("departmentId", ""); // Limpa o departamento
    formData.set("clientVerbalText", "Regra aplicada indistintamente a todos os órgãos.");

    const res = await updateBusinessRuleAction(formData);
    expect(res.success).toBe(true);

    const updatedDb = await prisma.businessRuleVersion.findUnique({
      where: { id: ruleId },
      include: { department: true },
    });

    expect(updatedDb?.departmentId).toBeNull();
    expect(updatedDb?.department).toBeNull();
    expect(updatedDb?.departmentCode).toBeNull();
    expect(updatedDb?.versionNumber).toBe(3);
    expect(updatedDb?.version).toBe(3);
  });

  it("4. Deve homologar e validar particularidade pelo Líder/BA alterando status para VALIDADA", async () => {
    mockCurrentUser = userOrgA;
    const ruleId = createdRuleIds[0];

    const formData = new FormData();
    formData.set("ruleId", ruleId);
    formData.set("status", "VALIDADA");

    const res = await validateBusinessRuleAction(formData);
    expect(res.success).toBe(true);

    const validatedDb = await prisma.businessRuleVersion.findUnique({
      where: { id: ruleId },
    });

    expect(validatedDb?.status).toBe(RuleStatus.VALIDADA);
    expect(validatedDb?.validatorName).toBe(userOrgA.name);
    expect(validatedDb?.effectiveDate).not.toBeNull();
  });

  it("5. [Segurança / IDOR] Deve rejeitar vincular particularidade a departamento de outro município/projeto", async () => {
    mockCurrentUser = userOrgA;

    // Tentativa de criar regra no Projeto A apontando para departamento do Projeto B
    const formData = new FormData();
    formData.set("projectId", projectA.id);
    formData.set("title", "Tentativa de Vínculo Cruzado Inválido");
    formData.set("clientVerbalText", "Tentando vincular a departamento alienígena.");
    formData.set("departmentId", deptOutroProjeto.id); // Dept de outro projeto!

    await expect(createBusinessRuleAction(formData)).rejects.toThrow(
      "O departamento selecionado não pertence a este município."
    );

    // Tentativa de atualizar regra do Projeto A apontando para departamento do Projeto B
    const updateFormData = new FormData();
    updateFormData.set("ruleId", createdRuleIds[0]);
    updateFormData.set("title", "Tentativa de Atualização com Dept Cruzado");
    updateFormData.set("clientVerbalText", "Atualização indevida.");
    updateFormData.set("departmentId", deptOutroProjeto.id);

    await expect(updateBusinessRuleAction(updateFormData)).rejects.toThrow(
      "O departamento selecionado não pertence a este município."
    );
  });

  it("6. [Segurança / IDOR] Deve rejeitar edição de particularidade pertencente a outra organização", async () => {
    mockCurrentUser = userOrgB; // Usuário da Organização B tentando editar regra da Organização A

    const formData = new FormData();
    formData.set("ruleId", createdRuleIds[0]);
    formData.set("title", "Edição Não Autorizada");
    formData.set("clientVerbalText", "Tentativa de ataque IDOR.");

    await expect(updateBusinessRuleAction(formData)).rejects.toThrow(
      "Particularidade não encontrada ou você não possui permissão para editá-la."
    );
  });
});
