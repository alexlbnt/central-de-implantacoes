export interface ProcessNode {
  id: string;
  name: string;
  departmentId: string;
  projectId: string;
}

export interface DependencyEdge {
  id?: string;
  processId: string;   // Processo dependente (precisa do dependsOnId para operar)
  dependsOnId: string; // Processo pré-requisito
  reason?: string | null;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath: string[]; // Lista de IDs formando o ciclo (ex: [A, B, C, A])
  cycleNames: string[];
}

export interface DownstreamImpactResult {
  impactedProcessIds: string[];
  impactedProcessNames: string[];
  pathMap: Map<string, string[]>; // Mapeia cada processo impactado ao caminho percorrido a partir da origem
}

/**
 * Validador de Grafo Direcionado Acíclico (DAG) para Processos Críticos.
 * Rejeita dependências circulares e calcula o impacto a jusante de um bloqueio.
 */
export class ProcessDagValidator {
  private nodes: Map<string, ProcessNode>;
  private adjList: Map<string, string[]>; // dependsOnId -> [processId, ...] (impacto a jusante)
  private reverseAdjList: Map<string, string[]>; // processId -> [dependsOnId, ...] (pré-requisitos)

  constructor(nodes: ProcessNode[], edges: DependencyEdge[]) {
    this.nodes = new Map(nodes.map((n) => [n.id, n]));
    this.adjList = new Map();
    this.reverseAdjList = new Map();

    for (const node of nodes) {
      this.adjList.set(node.id, []);
      this.reverseAdjList.set(node.id, []);
    }

    for (const edge of edges) {
      if (this.adjList.has(edge.dependsOnId)) {
        this.adjList.get(edge.dependsOnId)!.push(edge.processId);
      }
      if (this.reverseAdjList.has(edge.processId)) {
        this.reverseAdjList.get(edge.processId)!.push(edge.dependsOnId);
      }
    }
  }

  /**
   * Verifica se a adição de uma nova dependência criaria um ciclo.
   */
  public wouldCreateCycle(newProcessId: string, newDependsOnId: string): CycleDetectionResult {
    if (newProcessId === newDependsOnId) {
      const name = this.nodes.get(newProcessId)?.name || newProcessId;
      return {
        hasCycle: true,
        cyclePath: [newProcessId, newProcessId],
        cycleNames: [name, name],
      };
    }

    // Criar grafo temporário com a nova aresta
    const tempAdj = new Map<string, string[]>();
    for (const [k, v] of this.reverseAdjList.entries()) {
      tempAdj.set(k, [...v]);
    }

    if (!tempAdj.has(newProcessId)) {
      tempAdj.set(newProcessId, []);
    }
    tempAdj.get(newProcessId)!.push(newDependsOnId);

    // Busca se existe caminho de newDependsOnId até newProcessId
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (curr: string, target: string): boolean => {
      visited.add(curr);
      path.push(curr);

      if (curr === target) {
        return true;
      }

      const neighbors = tempAdj.get(curr) || [];
      for (const next of neighbors) {
        if (!visited.has(next)) {
          if (dfs(next, target)) return true;
        }
      }

      path.pop();
      return false;
    };

    if (dfs(newDependsOnId, newProcessId)) {
      const fullCycle = [newProcessId, ...path];
      const cycleNames = fullCycle.map((id) => this.nodes.get(id)?.name || id);
      return {
        hasCycle: true,
        cyclePath: fullCycle,
        cycleNames,
      };
    }

    return {
      hasCycle: false,
      cyclePath: [],
      cycleNames: [],
    };
  }

  /**
   * Calcula todos os processos impactados a jusante quando um processo de origem é bloqueado.
   */
  public getDownstreamImpact(sourceProcessId: string): DownstreamImpactResult {
    const visited = new Set<string>();
    const impactedIds: string[] = [];
    const pathMap = new Map<string, string[]>();

    const queue: { id: string; currentPath: string[] }[] = [
      { id: sourceProcessId, currentPath: [sourceProcessId] },
    ];
    visited.add(sourceProcessId);

    while (queue.length > 0) {
      const { id, currentPath } = queue.shift()!;
      const dependents = this.adjList.get(id) || [];

      for (const depId of dependents) {
        if (!visited.has(depId)) {
          visited.add(depId);
          impactedIds.push(depId);
          const nextPath = [...currentPath, depId];
          pathMap.set(depId, nextPath);
          queue.push({ id: depId, currentPath: nextPath });
        }
      }
    }

    const impactedNames = impactedIds.map((id) => this.nodes.get(id)?.name || id);

    return {
      impactedProcessIds: impactedIds,
      impactedProcessNames: impactedNames,
      pathMap,
    };
  }
}
