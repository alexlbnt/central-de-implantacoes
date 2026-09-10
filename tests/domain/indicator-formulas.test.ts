import { describe, it, expect } from "vitest";
import {
  calculateDeliverableProgress,
  calculateAutonomyIndex,
  calculateGlobalProgress,
  calculateOperationalDepartmentsSummary,
  filterOverdueActions,
  DeliverableItem,
  AutonomyRequirementItem,
} from "../../src/lib/domain/indicator-calculator";

describe("Cálculo Determinístico de Indicadores e Fórmulas", () => {
  it("[Critério 08] Denominador zero deve retornar 'Não definido', NUNCA 100%", () => {
    const emptyDeliverables: DeliverableItem[] = [];
    const progress = calculateDeliverableProgress(emptyDeliverables);

    expect(progress.isDefined).toBe(false);
    expect(progress.percentage).toBeNull();
    expect(progress.displayText).toBe("Não definido");

    const emptyAutonomy: AutonomyRequirementItem[] = [];
    const autonomy = calculateAutonomyIndex(emptyAutonomy);

    expect(autonomy.isDefined).toBe(false);
    expect(autonomy.percentage).toBeNull();
    expect(autonomy.displayText).toBe("Não definido");
  });

  it("[Critério 08] Duas tentativas ou testes do mesmo requisito contam apenas 1 vez no denominador", () => {
    const duplicateRequirements: AutonomyRequirementItem[] = [
      { id: "req_1", processId: "proc_folha", personId: "servidor_joao", isApproved: false },
      { id: "req_1_tentativa_2", processId: "proc_folha", personId: "servidor_joao", isApproved: true },
      { id: "req_2", processId: "proc_compras", personId: "servidor_maria", isApproved: true },
    ];

    const autonomy = calculateAutonomyIndex(duplicateRequirements);

    // O total no denominador deve ser 2 (proc_folha+joao e proc_compras+maria), não 3
    expect(autonomy.denominator).toBe(2);
    expect(autonomy.numerator).toBe(2);
    expect(autonomy.percentage).toBe(100);
  });

  it("[Critério 08] Progresso global deve ser a razão direta dos totais, NUNCA média simples dos percentuais", () => {
    // Depto A: 1 entrega de 1 validada = 100%
    const deptA: DeliverableItem[] = [
      { id: "d1", departmentId: "dept_A", isMandatory: true, isValidated: true, isWaived: false },
    ];

    // Depto B: 1 entrega de 9 validadas = 11.1%
    const deptB: DeliverableItem[] = [
      { id: "d2", departmentId: "dept_B", isMandatory: true, isValidated: true, isWaived: false },
      { id: "d3", departmentId: "dept_B", isMandatory: true, isValidated: false, isWaived: false },
      { id: "d4", departmentId: "dept_B", isMandatory: true, isValidated: false, isWaived: false },
      { id: "d5", departmentId: "dept_B", isMandatory: true, isValidated: false, isWaived: false },
      { id: "d6", departmentId: "dept_B", isMandatory: true, isValidated: false, isWaived: false },
      { id: "d7", departmentId: "dept_B", isMandatory: true, isValidated: false, isWaived: false },
      { id: "d8", departmentId: "dept_B", isMandatory: true, isValidated: false, isWaived: false },
      { id: "d9", departmentId: "dept_B", isMandatory: true, isValidated: false, isWaived: false },
      { id: "d10", departmentId: "dept_B", isMandatory: true, isValidated: false, isWaived: false },
    ];

    // Média simples seria (100% + 11.1%) / 2 = 55.55%
    // Mas a razão global real é: (1 + 1) / (1 + 9) = 2 / 10 = 20.0%
    const map = new Map<string, DeliverableItem[]>();
    map.set("dept_A", deptA);
    map.set("dept_B", deptB);

    const global = calculateGlobalProgress(map);

    expect(global.numerator).toBe(2);
    expect(global.denominator).toBe(10);
    expect(global.percentage).toBe(20.0);
    expect(global.displayText).toBe("20,0%");
  });

  it("[Critério 08] Entrega dispensada (isWaived) com justificativa não conta como validada e não entra no denominador", () => {
    const deliverables: DeliverableItem[] = [
      { id: "d1", departmentId: "dept_A", isMandatory: true, isValidated: true, isWaived: false },
      { id: "d2", departmentId: "dept_A", isMandatory: true, isValidated: false, isWaived: true }, // dispensada
    ];

    const result = calculateDeliverableProgress(deliverables);

    expect(result.denominator).toBe(1);
    expect(result.numerator).toBe(1);
    expect(result.percentage).toBe(100);
  });

  it("[Critério 09] Ações vencidas não são ocultadas por condição de espera", () => {
    const today = new Date(2026, 8, 10); // 10 de Setembro de 2026
    const yesterday = new Date(2026, 8, 9);
    const tomorrow = new Date(2026, 8, 11);

    const actions = [
      { id: "a1", title: "Entregar folha de pagamento", dueDate: yesterday, status: "EM_EXECUCAO" },
      { id: "a2", title: "Conferir saldos contábeis", dueDate: yesterday, status: "CONCLUIDA" }, // concluída não conta
      { id: "a3", title: "Validar decreto", dueDate: tomorrow, status: "ABERTA" }, // não vencida
    ];

    const overdue = filterOverdueActions(actions, today);

    expect(overdue.length).toBe(1);
    expect(overdue[0].id).toBe("a1");
  });
});
