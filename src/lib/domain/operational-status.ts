import { DepartmentStatus } from "@prisma/client";

export interface CriticalProcessData {
  id: string;
  name: string;
  evidenceRequired: boolean;
  latestTest?: {
    id: string;
    result: "APROVADO" | "REPROVADO";
    executedAt: Date;
    modality: "ASSISTIDA" | "AUTONOMA";
  } | null;
}

export interface AutonomyRequirementData {
  id: string;
  processId: string;
  personId: string;
  isApproved: boolean;
  latestAutonomousTest?: {
    id: string;
    result: "APROVADO" | "REPROVADO";
    executedAt: Date;
  } | null;
}

export interface ActiveBlockerData {
  id: string;
  codeNumber: number;
  title: string;
  criticalProcessId?: string | null;
}

export interface DepartmentEvaluationInput {
  hasDiagnosis: boolean;
  lastDiagnosisAt?: Date | null;
  isDataMigrationValidated: boolean;
  isParametrizationValidated: boolean;
  isTrainingCompleted: boolean;
  isLeaderValidated: boolean;
  criticalProcesses: CriticalProcessData[];
  autonomyRequirements: AutonomyRequirementData[];
  activeBlockers: ActiveBlockerData[];
  testValidityDays?: number; // Padrão: 7 dias corridos
  diagnosisWarningDays?: number; // Padrão: 2 dias úteis
  referenceDate?: Date; // Data de avaliação (padrão: agora)
}

export interface DepartmentEvaluationResult {
  status: DepartmentStatus;
  revalidationRequired: boolean;
  revalidationReasons: string[];
  blockerReasons: string[];
  missingOperationalCriteria: string[];
  activeBlockersCount: number;
  processesApprovedCount: number;
  processesTotalCount: number;
  autonomyApprovedCount: number;
  autonomyTotalCount: number;
}

/**
 * Calcula a situação operacional e o status de revalidação de um departamento
 * seguindo estritamente a ordem de precedência e os 5 critérios cumulativos.
 */
export function evaluateDepartmentOperationalStatus(
  input: DepartmentEvaluationInput
): DepartmentEvaluationResult {
  const refDate = input.referenceDate || new Date();
  const testValidityDays = input.testValidityDays ?? 7;
  const diagnosisWarningDays = input.diagnosisWarningDays ?? 2;

  const revalidationReasons: string[] = [];
  const blockerReasons: string[] = [];
  const missingOperationalCriteria: string[] = [];

  const totalProcesses = input.criticalProcesses.length;
  let approvedProcesses = 0;
  let hasExpiredTest = false;

  const validityThreshold = new Date(refDate.getTime() - testValidityDays * 24 * 60 * 60 * 1000);

  for (const proc of input.criticalProcesses) {
    if (!proc.latestTest) {
      // Processo sem teste
      continue;
    }

    if (proc.latestTest.result === "APROVADO") {
      if (proc.latestTest.executedAt < validityThreshold) {
        hasExpiredTest = true;
        revalidationReasons.push(
          `Teste do processo "${proc.name}" expirou (realizado em ${proc.latestTest.executedAt.toLocaleDateString("pt-BR")}).`
        );
      } else {
        approvedProcesses++;
      }
    }
  }

  // Avaliação de autonomia
  const totalAutonomy = input.autonomyRequirements.length;
  let approvedAutonomy = 0;

  for (const req of input.autonomyRequirements) {
    if (req.isApproved && req.latestAutonomousTest?.result === "APROVADO") {
      if (req.latestAutonomousTest.executedAt < validityThreshold) {
        hasExpiredTest = true;
        revalidationReasons.push(`Teste de autonomia expirou para o requisito ${req.id}.`);
      } else {
        approvedAutonomy++;
      }
    }
  }

  // Verificação de diagnóstico defasado (estimativa de 2 dias úteis = aprox 48h a 96h se cruzar fim de semana)
  if (input.lastDiagnosisAt) {
    const hoursSinceDiagnosis = (refDate.getTime() - input.lastDiagnosisAt.getTime()) / (1000 * 60 * 60);
    // Mais de 48 horas úteis
    if (hoursSinceDiagnosis > diagnosisWarningDays * 24) {
      revalidationReasons.push(
        `Diagnóstico desatualizado (última atualização há mais de ${diagnosisWarningDays} dias úteis).`
      );
    }
  }

  // 1. BLOQUEADO: existe impedimento ativo vinculado a processo crítico necessário à operação
  // Prevalece mesmo sem diagnóstico completo
  if (input.activeBlockers.length > 0) {
    for (const b of input.activeBlockers) {
      blockerReasons.push(`[SP-${String(b.codeNumber).padStart(3, "0")}] ${b.title}`);
    }
    return {
      status: DepartmentStatus.BLOQUEADO,
      revalidationRequired: revalidationReasons.length > 0,
      revalidationReasons,
      blockerReasons,
      missingOperationalCriteria: ["Bloqueio operacional ativo precisa ser resolvido."],
      activeBlockersCount: input.activeBlockers.length,
      processesApprovedCount: approvedProcesses,
      processesTotalCount: totalProcesses,
      autonomyApprovedCount: approvedAutonomy,
      autonomyTotalCount: totalAutonomy,
    };
  }

  // 2. NÃO AVALIADO: não existe diagnóstico inicial suficiente ou escopo crítico não foi definido
  if (!input.hasDiagnosis || totalProcesses === 0) {
    return {
      status: DepartmentStatus.NAO_AVALIADO,
      revalidationRequired: false,
      revalidationReasons,
      blockerReasons,
      missingOperationalCriteria: [
        !input.hasDiagnosis ? "Diagnóstico inicial não registrado." : "Nenhum processo crítico definido no escopo.",
      ],
      activeBlockersCount: 0,
      processesApprovedCount: approvedProcesses,
      processesTotalCount: totalProcesses,
      autonomyApprovedCount: approvedAutonomy,
      autonomyTotalCount: totalAutonomy,
    };
  }

  // Verificação dos 5 critérios para OPERACIONAL
  if (!input.isDataMigrationValidated) {
    missingOperationalCriteria.push("Migração de dados do sistema legado pendente de validação.");
  }
  if (!input.isParametrizationValidated) {
    missingOperationalCriteria.push("Parametrização do ERP pendente de homologação.");
  }
  if (!input.isTrainingCompleted) {
    missingOperationalCriteria.push("Capacitação dos servidores pendente de comprovação.");
  }
  if (approvedProcesses < totalProcesses) {
    missingOperationalCriteria.push(
      `Processos críticos pendentes de aprovação válida (${approvedProcesses}/${totalProcesses} aprovados).`
    );
  }
  if (totalAutonomy > 0 && approvedAutonomy < totalAutonomy) {
    missingOperationalCriteria.push(
      `Autonomia dos usuários-chave pendente de teste autônomo válido (${approvedAutonomy}/${totalAutonomy} aprovados).`
    );
  }
  if (!input.isLeaderValidated) {
    missingOperationalCriteria.push("Validação técnica formal do Líder de Implantação não registrada.");
  }

  const allProcessesApproved = totalProcesses > 0 && approvedProcesses === totalProcesses;
  const allAutonomyApproved = totalAutonomy === 0 || approvedAutonomy === totalAutonomy;
  const prerequisitesMet = input.isDataMigrationValidated && input.isParametrizationValidated;

  // 5. OPERACIONAL: todos os 5 critérios cumulativos atendidos
  if (
    missingOperationalCriteria.length === 0 &&
    !hasExpiredTest &&
    allProcessesApproved &&
    allAutonomyApproved &&
    prerequisitesMet &&
    input.isLeaderValidated
  ) {
    return {
      status: DepartmentStatus.OPERACIONAL,
      revalidationRequired: revalidationReasons.length > 0,
      revalidationReasons,
      blockerReasons,
      missingOperationalCriteria,
      activeBlockersCount: 0,
      processesApprovedCount: approvedProcesses,
      processesTotalCount: totalProcesses,
      autonomyApprovedCount: approvedAutonomy,
      autonomyTotalCount: totalAutonomy,
    };
  }

  // 4. OPERAÇÃO ASSISTIDA: processos críticos têm validação funcional e pré-requisitos técnicos atendidos,
  // mas falta autonomia ou validação do líder
  if (allProcessesApproved && prerequisitesMet) {
    return {
      status: DepartmentStatus.OPERACAO_ASSISTIDA,
      revalidationRequired: revalidationReasons.length > 0,
      revalidationReasons,
      blockerReasons,
      missingOperationalCriteria,
      activeBlockersCount: 0,
      processesApprovedCount: approvedProcesses,
      processesTotalCount: totalProcesses,
      autonomyApprovedCount: approvedAutonomy,
      autonomyTotalCount: totalAutonomy,
    };
  }

  // 3. EM PREPARAÇÃO: diagnóstico registrado, porém há processos ainda não testados/aprovados
  // ou dados/parametrizações pendentes
  return {
    status: DepartmentStatus.EM_PREPARACAO,
    revalidationRequired: revalidationReasons.length > 0,
    revalidationReasons,
    blockerReasons,
    missingOperationalCriteria,
    activeBlockersCount: 0,
    processesApprovedCount: approvedProcesses,
    processesTotalCount: totalProcesses,
    autonomyApprovedCount: approvedAutonomy,
    autonomyTotalCount: totalAutonomy,
  };
}
