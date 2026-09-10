import { UserRole, GPHStatus } from "@prisma/client";
import { ProjectCalendar } from "./calendar";

export interface GPHConvocationInput {
  requesterRole: UserRole;
  tk090Reference?: string | null;
  baTechnicalOpinion?: string | null;
  crmEvaluation?: string | null;
  hasCriticalIssue: boolean;
}

export interface GPHCaducityInput {
  deciderRole: UserRole;
  gphStatus: GPHStatus;
  hasMunicipalResistance: boolean;
  resistanceStartedAt?: Date | null;
  referenceDate?: Date;
  calendar: ProjectCalendar;
}

export interface GPHValidationResult {
  canConvoke: boolean;
  errorReason?: string;
}

export interface GPHCaducityResult {
  isEligibleForCaducity: boolean;
  canDecreeCaducity: boolean;
  consecutiveBusinessDays: number;
  errorReason?: string;
}

/**
 * Valida o rito de convocação do GPH segundo a NOP 001/2026.
 * O GPH NÃO pode ser ativado automaticamente por prioridade crítica de uma pendência.
 * Exige: papel de DC, ticket #TK090 registrado e parecer técnico do BA.
 */
export function validateGPHConvocation(input: GPHConvocationInput): GPHValidationResult {
  if (input.requesterRole !== UserRole.DC) {
    return {
      canConvoke: false,
      errorReason: "A convocação oficial do GPH é ato privativo do Diretor de Contas / Coordenador (DC).",
    };
  }

  if (!input.tk090Reference || input.tk090Reference.trim() === "") {
    return {
      canConvoke: false,
      errorReason: "Convocação do GPH exige diagnóstico técnico prévio formalizado no ticket #TK090.",
    };
  }

  if (!input.baTechnicalOpinion || input.baTechnicalOpinion.trim() === "") {
    return {
      canConvoke: false,
      errorReason: "Convocação do GPH exige parecer técnico emitido pelo Business Analyst (BA).",
    };
  }

  return { canConvoke: true };
}

/**
 * Avalia a elegibilidade e os requisitos para decretação de caducidade do GPH.
 * Exige:
 * 1. Intervenção GPH ativa (EM_ANDAMENTO).
 * 2. Registro de resistência ou impedimento prático municipal à equipe.
 * 3. Continuidade do impedimento por MAIS DE 3 dias úteis consecutivos.
 * 4. Decisão expressa do DC (o sistema alerta, mas NUNCA decreta automaticamente).
 */
export function evaluateGPHCaducity(input: GPHCaducityInput): GPHCaducityResult {
  const refDate = input.referenceDate || new Date();

  if (input.gphStatus !== GPHStatus.EM_ANDAMENTO) {
    return {
      isEligibleForCaducity: false,
      canDecreeCaducity: false,
      consecutiveBusinessDays: 0,
      errorReason: "Caducidade só é aplicável a intervenções GPH em andamento.",
    };
  }

  if (!input.hasMunicipalResistance || !input.resistanceStartedAt) {
    return {
      isEligibleForCaducity: false,
      canDecreeCaducity: false,
      consecutiveBusinessDays: 0,
      errorReason: "Não há registro de resistência municipal ou impedimento de atuação no GPH.",
    };
  }

  const consecutiveDays = input.calendar.countBusinessDaysBetween(input.resistanceStartedAt, refDate);
  const isEligible = consecutiveDays > 3;

  if (!isEligible) {
    return {
      isEligibleForCaducity: false,
      canDecreeCaducity: false,
      consecutiveBusinessDays: consecutiveDays,
      errorReason: `Impedimento municipal de ${consecutiveDays} dias úteis ainda não ultrapassou o limiar de 3 dias úteis consecutivos.`,
    };
  }

  if (input.deciderRole !== UserRole.DC) {
    return {
      isEligibleForCaducity: true,
      canDecreeCaducity: false,
      consecutiveBusinessDays: consecutiveDays,
      errorReason: "A decretação de caducidade do GPH é decisão privativa do DC.",
    };
  }

  return {
    isEligibleForCaducity: true,
    canDecreeCaducity: true,
    consecutiveBusinessDays: consecutiveDays,
  };
}
