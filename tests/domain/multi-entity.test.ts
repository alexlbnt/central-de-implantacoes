import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, DepartmentStatus, IssuePriority, EntityType } from "@prisma/client";

const prisma = new PrismaClient();

describe("Multi-Entidade: Prefeitura vs Câmara no mesmo Módulo (Critério 01)", () => {
  let projectId: string;
  let deptPrefeituraId: string;
  let deptCamaraId: string;

  beforeAll(async () => {
    // 1. Cria projeto de teste
    const org = await prisma.organization.findFirst();
    const mun = await prisma.municipality.findFirst();

    const project = await prisma.project.create({
      data: {
        organizationId: org!.id,
        municipalityId: mun!.id,
        name: "Projeto Teste Multi-Entidade",
        codePrefix: "TEST",
      },
    });
    projectId = project.id;

    // 2. Entidade Prefeitura
    const pref = await prisma.entity.create({
      data: {
        projectId,
        name: "Prefeitura de Teste",
        type: EntityType.PREFEITURA,
      },
    });

    // 3. Entidade Câmara
    const camara = await prisma.entity.create({
      data: {
        projectId,
        name: "Câmara de Teste",
        type: EntityType.CAMARA,
      },
    });

    // 4. Departamento Contabilidade na Prefeitura
    const deptPref = await prisma.department.create({
      data: {
        entityId: pref.id,
        name: "Contabilidade",
        operationalStatus: DepartmentStatus.EM_PREPARACAO,
        criticality: IssuePriority.CRITICA,
      },
    });
    deptPrefeituraId = deptPref.id;

    // 5. Departamento Contabilidade na Câmara
    const deptCam = await prisma.department.create({
      data: {
        entityId: camara.id,
        name: "Contabilidade",
        operationalStatus: DepartmentStatus.NAO_AVALIADO,
        criticality: IssuePriority.ALTA,
      },
    });
    deptCamaraId = deptCam.id;
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.project.delete({ where: { id: projectId } });
    }
    await prisma.$disconnect();
  });

  it("[Critério 01] Atualizar o departamento da Prefeitura NÃO deve alterar os dados da Câmara", async () => {
    // Atualiza status e validações na Prefeitura
    await prisma.department.update({
      where: { id: deptPrefeituraId },
      data: {
        operationalStatus: DepartmentStatus.OPERACIONAL,
        isDataMigrationValidated: true,
        dataMigrationValidatedAt: new Date(),
        isLeaderValidated: true,
      },
    });

    // Busca ambos no banco de dados
    const prefUpdated = await prisma.department.findUnique({
      where: { id: deptPrefeituraId },
    });

    const camaraIntact = await prisma.department.findUnique({
      where: { id: deptCamaraId },
    });

    // Asserções
    expect(prefUpdated?.operationalStatus).toBe(DepartmentStatus.OPERACIONAL);
    expect(prefUpdated?.isDataMigrationValidated).toBe(true);

    // O departamento da Câmara deve permanecer inalterado
    expect(camaraIntact?.operationalStatus).toBe(DepartmentStatus.NAO_AVALIADO);
    expect(camaraIntact?.isDataMigrationValidated).toBe(false);
    expect(camaraIntact?.isLeaderValidated).toBe(false);
  });
});
