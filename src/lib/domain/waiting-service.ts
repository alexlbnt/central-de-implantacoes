import { ProjectCalendar } from "./calendar";

export type WaitingCondition = "NENHUMA" | "AGUARDANDO_MUNICIPIO" | "AGUARDANDO_EQUIPE_INTERNA" | "AGUARDANDO_TERCEIRO";
export type WaitingType = "BASE_LEGADA" | "LEGISLACAO" | "PLANILHA" | "INDICACAO_RESPONSAVEL" | "ACESSO" | "CERTIFICADO" | "ASSINATURA" | "VALIDACAO" | "OUTRO";

export interface WaitingIntervalRecord {
  id: string;
  issueId: string;
  condition: WaitingCondition;
  type?: WaitingType | null;
  reason?: string | null;
  startedAt: Date;
  endedAt?: Date | null;
  durationMinutes?: number | null;
}

export interface IssueWaitingState {
  waitingCondition: WaitingCondition;
  waitingType?: WaitingType | null;
  waitingReason?: string | null;
  waitingContact?: string | null;
  waitingStartedAt?: Date | null;
  totalWaitingMinutes: number;
}

/**
 * Inicia uma nova condição de espera em uma pendência.
 */
export function startWaiting(
  current: IssueWaitingState,
  newCondition: WaitingCondition,
  newType?: WaitingType | null,
  newReason?: string | null,
  newContact?: string | null,
  now: Date = new Date()
): {
  updatedState: IssueWaitingState;
  newInterval: WaitingIntervalRecord;
} {
  // Se já estava em espera, fecha a anterior acumulando minutos
  let totalMinutes = current.totalWaitingMinutes;
  if (current.waitingStartedAt && current.waitingCondition !== "NENHUMA") {
    const elapsed = Math.max(0, Math.floor((now.getTime() - current.waitingStartedAt.getTime()) / (1000 * 60)));
    totalMinutes += elapsed;
  }

  const updatedState: IssueWaitingState = {
    waitingCondition: newCondition,
    waitingType: newType,
    waitingReason: newReason,
    waitingContact: newContact,
    waitingStartedAt: newCondition === "NENHUMA" ? null : now,
    totalWaitingMinutes: totalMinutes,
  };

  const newInterval: WaitingIntervalRecord = {
    id: `interval_${now.getTime()}`,
    issueId: "",
    condition: newCondition,
    type: newType,
    reason: newReason,
    startedAt: now,
    endedAt: null,
  };

  return { updatedState, newInterval };
}

/**
 * Encerra a condição de espera ativa retornando os minutos acumulados.
 */
export function endWaiting(
  current: IssueWaitingState,
  activeInterval?: WaitingIntervalRecord | null,
  now: Date = new Date()
): {
  updatedState: IssueWaitingState;
  closedInterval?: WaitingIntervalRecord | null;
} {
  if (!current.waitingStartedAt || current.waitingCondition === "NENHUMA") {
    return { updatedState: current, closedInterval: activeInterval };
  }

  const elapsed = Math.max(0, Math.floor((now.getTime() - current.waitingStartedAt.getTime()) / (1000 * 60)));
  const updatedState: IssueWaitingState = {
    ...current,
    waitingCondition: "NENHUMA",
    waitingType: null,
    waitingReason: null,
    waitingContact: null,
    waitingStartedAt: null,
    totalWaitingMinutes: current.totalWaitingMinutes + elapsed,
  };

  const closedInterval: WaitingIntervalRecord | null = activeInterval
    ? {
        ...activeInterval,
        endedAt: now,
        durationMinutes: elapsed,
      }
    : null;

  return { updatedState, closedInterval };
}

/**
 * Calcula os dias úteis consecutivos que uma pendência está aguardando retorno do município.
 */
export function calculateMunicipalWaitingBusinessDays(
  issue: IssueWaitingState,
  calendar: ProjectCalendar,
  referenceDate: Date = new Date()
): number {
  if (issue.waitingCondition !== "AGUARDANDO_MUNICIPIO" || !issue.waitingStartedAt) {
    return 0;
  }
  return calendar.countBusinessDaysBetween(issue.waitingStartedAt, referenceDate);
}
