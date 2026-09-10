import { describe, it, expect } from "vitest";
import { ProcessDagValidator, ProcessNode, DependencyEdge } from "../../src/lib/domain/dag-validator";

describe("Grafo de Processos Críticos e Dependências (DAG)", () => {
  const nodes: ProcessNode[] = [
    { id: "proc_cadastro", name: "Cadastro de Servidores", departmentId: "dept_rh", projectId: "proj_1" },
    { id: "proc_lancamentos", name: "Lançamento de Rubricas", departmentId: "dept_rh", projectId: "proj_1" },
    { id: "proc_fechamento", name: "Fechamento da Folha", departmentId: "dept_rh", projectId: "proj_1" },
    { id: "proc_empenho", name: "Empenho Contábil", departmentId: "dept_contab", projectId: "proj_1" },
  ];

  // Arestas: fechamento depende de lancamentos; lancamentos depende de cadastro
  const initialEdges: DependencyEdge[] = [
    { processId: "proc_lancamentos", dependsOnId: "proc_cadastro" },
    { processId: "proc_fechamento", dependsOnId: "proc_lancamentos" },
  ];

  it("[Critério 11] Não deve acusar ciclo em dependência linear válida", () => {
    const validator = new ProcessDagValidator(nodes, initialEdges);
    // Adicionar empenho dependendo de fechamento
    const check = validator.wouldCreateCycle("proc_empenho", "proc_fechamento");

    expect(check.hasCycle).toBe(false);
    expect(check.cyclePath.length).toBe(0);
  });

  it("[Critério 11] Deve detectar e rejeitar auto-dependência (A depende de A)", () => {
    const validator = new ProcessDagValidator(nodes, initialEdges);
    const check = validator.wouldCreateCycle("proc_cadastro", "proc_cadastro");

    expect(check.hasCycle).toBe(true);
    expect(check.cyclePath).toEqual(["proc_cadastro", "proc_cadastro"]);
  });

  it("[Critério 11] Deve detectar e rejeitar ciclo indireto (Cadastro passar a depender de Fechamento)", () => {
    const validator = new ProcessDagValidator(nodes, initialEdges);
    // Cadastro depende de Fechamento criaria ciclo: Fechamento -> Lançamentos -> Cadastro -> Fechamento
    const check = validator.wouldCreateCycle("proc_cadastro", "proc_fechamento");

    expect(check.hasCycle).toBe(true);
    expect(check.cyclePath.length).toBeGreaterThan(2);
    expect(check.cycleNames).toContain("Cadastro de Servidores");
    expect(check.cycleNames).toContain("Fechamento da Folha");
  });

  it("[Critério 11] Deve calcular corretamente o impacto a jusante ao bloquear um processo de origem", () => {
    const edgesWithEmpenho: DependencyEdge[] = [
      ...initialEdges,
      { processId: "proc_empenho", dependsOnId: "proc_fechamento" },
    ];
    const validator = new ProcessDagValidator(nodes, edgesWithEmpenho);

    // Se "proc_cadastro" estiver bloqueado, quem é impactado a jusante?
    // "proc_lancamentos" precisa de cadastro; "proc_fechamento" precisa de lancamentos; "proc_empenho" precisa de fechamento.
    const impact = validator.getDownstreamImpact("proc_cadastro");

    expect(impact.impactedProcessIds).toContain("proc_lancamentos");
    expect(impact.impactedProcessIds).toContain("proc_fechamento");
    expect(impact.impactedProcessIds).toContain("proc_empenho");
    expect(impact.impactedProcessIds.length).toBe(3);

    // O caminho até empenho deve ser: cadastro -> lancamentos -> fechamento -> empenho
    const pathEmpenho = impact.pathMap.get("proc_empenho");
    expect(pathEmpenho).toEqual(["proc_cadastro", "proc_lancamentos", "proc_fechamento", "proc_empenho"]);
  });
});
