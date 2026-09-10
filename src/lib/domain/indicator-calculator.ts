export interface DeliverableItem {
  id: string;
  departmentId: string;
  isMandatory: boolean;
  isValidated: boolean;
  isWaived: boolean;
}

export interface AutonomyRequirementItem {
  id: string;
  processId: string;
  personId: string;
  isApproved: boolean;
}

export interface DepartmentSummaryItem {
  id: string;
  name: string;
  operationalStatus: "BLOQUEADO" | "NAO_AVALIADO" | "EM_PREPARACAO" | "OPERACAO_ASSISTIDA" | "OPERACIONAL";
  revalidationRequired: boolean;
}

export interface MetricRatioResult {
  percentage: number | null;
  numerator: number;
  denominator: number;
  isDefined: boolean;
  displayText: string;
}

/**
 * Fórmula 1: Progresso = entregas obrigatórias ativas validadas / entregas obrigatórias ativas previstas × 100.
 * Pesos iguais. Se denominador for zero, retorna Não definido (nunca 100%).
 * Entregas dispensadas com justificativa (isWaived: true) não entram no denominador nem contam como concluídas.
 */
export function calculateDeliverableProgress(deliverables: DeliverableItem[]): MetricRatioResult {
  const activeDeliverables = deliverables.filter((d) => !d.isWaived && d.isMandatory);
  const total = activeDeliverables.length;
  const validated = activeDeliverables.filter((d) => d.isValidated).length;

  if (total === 0) {
    return {
      percentage: null,
      numerator: 0,
      denominator: 0,
      isDefined: false,
      displayText: "Não definido",
    };
  }

  const pct = Math.round((validated / total) * 1000) / 10;
  return {
    percentage: pct,
    numerator: validated,
    denominator: total,
    isDefined: true,
    displayText: `${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
  };
}

/**
 * Fórmula 2: Autonomia = requisitos de autonomia aprovados com teste válido / requisitos de autonomia previstos × 100.
 * Cada requisito é a combinação processo + usuário-chave.
 * Tentativas repetidas de teste não aumentam o denominador.
 */
export function calculateAutonomyIndex(requirements: AutonomyRequirementItem[]): MetricRatioResult {
  // Garantir unicidade por processId + personId
  const uniqueMap = new Map<string, AutonomyRequirementItem>();
  for (const req of requirements) {
    const key = `${req.processId}_${req.personId}`;
    const existing = uniqueMap.get(key);
    if (!existing) {
      uniqueMap.set(key, { ...req });
    } else if (req.isApproved) {
      existing.isApproved = true;
    }
  }

  const distinctReqs = Array.from(uniqueMap.values());
  const total = distinctReqs.length;
  const approved = distinctReqs.filter((r) => r.isApproved).length;

  if (total === 0) {
    return {
      percentage: null,
      numerator: 0,
      denominator: 0,
      isDefined: false,
      displayText: "Não definido",
    };
  }

  const pct = Math.round((approved / total) * 1000) / 10;
  return {
    percentage: pct,
    numerator: approved,
    denominator: total,
    isDefined: true,
    displayText: `${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
  };
}

/**
 * Fórmula Global de Progresso:
 * Razão direta dos totais absolutos do escopo, nunca média simples dos departamentos.
 */
export function calculateGlobalProgress(
  departmentDeliverablesMap: Map<string, DeliverableItem[]>
): MetricRatioResult {
  let globalNumerator = 0;
  let globalDenominator = 0;

  for (const deliverables of departmentDeliverablesMap.values()) {
    const active = deliverables.filter((d) => !d.isWaived && d.isMandatory);
    globalDenominator += active.length;
    globalNumerator += active.filter((d) => d.isValidated).length;
  }

  if (globalDenominator === 0) {
    return {
      percentage: null,
      numerator: 0,
      denominator: 0,
      isDefined: false,
      displayText: "Não definido",
    };
  }

  const pct = Math.round((globalNumerator / globalDenominator) * 1000) / 10;
  return {
    percentage: pct,
    numerator: globalNumerator,
    denominator: globalDenominator,
    isDefined: true,
    displayText: `${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
  };
}

/**
 * Fórmula 3: Departamentos operacionais = quantidade com todos os critérios operacionais satisfeitos.
 * Nunca derivar de percentual de tarefas.
 */
export function calculateOperationalDepartmentsSummary(departments: DepartmentSummaryItem[]) {
  const total = departments.length;
  let operational = 0;
  let assisted = 0;
  let preparation = 0;
  let notEvaluated = 0;
  let blocked = 0;
  let revalidationRequired = 0;

  for (const dept of departments) {
    if (dept.revalidationRequired) {
      revalidationRequired++;
    }

    switch (dept.operationalStatus) {
      case "OPERACIONAL":
        operational++;
        break;
      case "OPERACAO_ASSISTIDA":
        assisted++;
        break;
      case "EM_PREPARACAO":
        preparation++;
        break;
      case "NAO_AVALIADO":
        notEvaluated++;
        break;
      case "BLOQUEADO":
        blocked++;
        break;
    }
  }

  return {
    total,
    operational,
    assisted,
    preparation,
    notEvaluated,
    blocked,
    revalidationRequired,
    operationalRatioText: `${operational}/${total}`,
  };
}

/**
 * Ações vencidas: prazo anterior ao dia corrente no fuso do projeto,
 * excluindo concluídas/canceladas. Condição de espera não suspende automaticamente o prazo.
 */
export interface ActionItemWithDueDate {
  id: string;
  title: string;
  dueDate: Date | null;
  status: string;
}

export function filterOverdueActions(
  actions: ActionItemWithDueDate[],
  currentDate: Date = new Date()
): ActionItemWithDueDate[] {
  // Considera o início do dia corrente para evitar deslocamento indevido
  const startOfToday = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    0,
    0,
    0
  );

  return actions.filter((action) => {
    if (!action.dueDate) return false;
    if (action.status === "CONCLUIDA" || action.status === "CANCELADA") return false;

    const actionDue = new Date(
      action.dueDate.getFullYear(),
      action.dueDate.getMonth(),
      action.dueDate.getDate(),
      0,
      0,
      0
    );

    return actionDue < startOfToday;
  });
}
