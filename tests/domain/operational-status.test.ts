import { describe, it, expect } from "vitest";
import {
  evaluateDepartmentOperationalStatus,
  DepartmentEvaluationInput,
} from "../../src/lib/domain/operational-status";
import { DepartmentStatus } from "@prisma/client";

describe("Motor de Situação Operacional dos Departamentos", () => {
  const baseInput: DepartmentEvaluationInput = {
    hasDiagnosis: true,
    lastDiagnosisAt: new Date(),
    isDataMigrationValidated: true,
    isParametrizationValidated: true,
    isTrainingCompleted: true,
    isLeaderValidated: true,
    criticalProcesses: [
      {
        id: "proc_1",
        name: "Fechamento da Folha",
        evidenceRequired: true,
        latestTest: {
          id: "test_1",
          result: "APROVADO",
          executedAt: new Date(),
          modality: "ASSISTIDA",
        },
      },
    ],
    autonomyRequirements: [
      {
        id: "auto_1",
        processId: "proc_1",
        personId: "user_key_1",
        isApproved: true,
        latestAutonomousTest: {
          id: "test_auto_1",
          result: "APROVADO",
          executedAt: new Date(),
        },
      },
    ],
    activeBlockers: [],
    testValidityDays: 7,
    diagnosisWarningDays: 2,
    referenceDate: new Date(),
  };

  it("[Critério 06] Deve conceder status OPERACIONAL quando todos os 5 critérios cumulativos forem atendidos", () => {
    const result = evaluateDepartmentOperationalStatus(baseInput);

    expect(result.status).toBe(DepartmentStatus.OPERACIONAL);
    expect(result.missingOperationalCriteria.length).toBe(0);
    expect(result.revalidationRequired).toBe(false);
  });

  it("[Critério 04] Bloqueio operacional ativo deve forçar status BLOQUEADO imediatamente, mesmo com outros critérios atendidos", () => {
    const inputWithBlocker: DepartmentEvaluationInput = {
      ...baseInput,
      activeBlockers: [
        {
          id: "issue_1",
          codeNumber: 1,
          title: "Erro no cálculo da previdência",
          criticalProcessId: "proc_1",
        },
      ],
    };

    const result = evaluateDepartmentOperationalStatus(inputWithBlocker);

    expect(result.status).toBe(DepartmentStatus.BLOQUEADO);
    expect(result.activeBlockersCount).toBe(1);
    expect(result.blockerReasons[0]).toContain("[SP-001]");
  });

  it("[Critério 04] Ao remover o bloqueio, departamento NÃO vira OPERACIONAL diretamente se faltar teste/validação", () => {
    // Cenário onde o bloqueio foi resolvido, mas o processo crítico precisa de novo teste (não tem latestTest aprovado recente)
    const inputAfterFixWithoutRetest: DepartmentEvaluationInput = {
      ...baseInput,
      activeBlockers: [],
      criticalProcesses: [
        {
          id: "proc_1",
          name: "Fechamento da Folha",
          evidenceRequired: true,
          latestTest: null, // Sem teste recente após a correção
        },
      ],
    };

    const result = evaluateDepartmentOperationalStatus(inputAfterFixWithoutRetest);

    expect(result.status).toBe(DepartmentStatus.EM_PREPARACAO);
    expect(result.status).not.toBe(DepartmentStatus.OPERACIONAL);
    expect(result.missingOperationalCriteria).toContain(
      "Processos críticos pendentes de aprovação válida (0/1 aprovados)."
    );
  });

  it("[Critério 05] Treinamento realizado com capacitação atestada, mas sem autonomia aprovada, NÃO torna operacional (fica em OPERACAO_ASSISTIDA)", () => {
    const inputWithoutAutonomy: DepartmentEvaluationInput = {
      ...baseInput,
      isTrainingCompleted: true,
      autonomyRequirements: [
        {
          id: "auto_1",
          processId: "proc_1",
          personId: "user_key_1",
          isApproved: false, // Usuário participou do treino, mas ainda não comprovou autonomia
          latestAutonomousTest: null,
        },
      ],
    };

    const result = evaluateDepartmentOperationalStatus(inputWithoutAutonomy);

    expect(result.status).toBe(DepartmentStatus.OPERACAO_ASSISTIDA);
    expect(result.status).not.toBe(DepartmentStatus.OPERACIONAL);
    expect(result.missingOperationalCriteria.some((m) => m.includes("Autonomia dos usuários-chave"))).toBe(true);
  });

  it("[Critério 07] Teste expirado (> 7 dias corridos) invalida prontidão operacional e ativa REVALIDACAO_NECESSARIA", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    const inputWithExpiredTest: DepartmentEvaluationInput = {
      ...baseInput,
      criticalProcesses: [
        {
          id: "proc_1",
          name: "Fechamento da Folha",
          evidenceRequired: true,
          latestTest: {
            id: "test_old",
            result: "APROVADO",
            executedAt: eightDaysAgo,
            modality: "ASSISTIDA",
          },
        },
      ],
    };

    const result = evaluateDepartmentOperationalStatus(inputWithExpiredTest);

    expect(result.status).not.toBe(DepartmentStatus.OPERACIONAL);
    expect(result.revalidationRequired).toBe(true);
    expect(result.revalidationReasons.some((r) => r.includes("expirou"))).toBe(true);
  });

  it("[Critério 07] Teste reprovado rebaixa departamento e mantém histórico", () => {
    const inputWithFailedTest: DepartmentEvaluationInput = {
      ...baseInput,
      criticalProcesses: [
        {
          id: "proc_1",
          name: "Fechamento da Folha",
          evidenceRequired: true,
          latestTest: {
            id: "test_failed",
            result: "REPROVADO",
            executedAt: new Date(),
            modality: "ASSISTIDA",
          },
        },
      ],
    };

    const result = evaluateDepartmentOperationalStatus(inputWithFailedTest);

    expect(result.status).toBe(DepartmentStatus.EM_PREPARACAO);
    expect(result.status).not.toBe(DepartmentStatus.OPERACIONAL);
  });

  it("Sem diagnóstico inicial registrado ou sem processos críticos cadastrados, deve retornar NAO_AVALIADO", () => {
    const inputNoDiagnosis: DepartmentEvaluationInput = {
      ...baseInput,
      hasDiagnosis: false,
    };

    const result = evaluateDepartmentOperationalStatus(inputNoDiagnosis);
    expect(result.status).toBe(DepartmentStatus.NAO_AVALIADO);

    const inputNoProcesses: DepartmentEvaluationInput = {
      ...baseInput,
      criticalProcesses: [],
    };

    const result2 = evaluateDepartmentOperationalStatus(inputNoProcesses);
    expect(result2.status).toBe(DepartmentStatus.NAO_AVALIADO);
  });
});
