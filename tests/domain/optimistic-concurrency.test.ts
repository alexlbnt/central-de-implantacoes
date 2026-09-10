import { describe, it, expect } from "vitest";
import { validateOptimisticConcurrency } from "../../src/lib/domain/concurrency";

describe("Controle de Concorrência Otimista (Critério 15)", () => {
  interface MockIssue {
    id: string;
    title: string;
    description: string;
    version: number;
  }

  const initialIssue: MockIssue = {
    id: "issue_1",
    title: "Erro no relatório contábil",
    description: "Inconsistência nos saldos de liquidação",
    version: 1,
  };

  it("[Critério 15] Primeira alteração com versão correspondente deve ser aceita", () => {
    const check1 = validateOptimisticConcurrency(initialIssue, 1);
    expect(check1.success).toBe(true);

    // Simular que o servidor salvou e incrementou a versão para 2
    const updatedIssue: MockIssue = {
      ...initialIssue,
      description: "Inconsistência corrigida pelo Analista A",
      version: 2,
    };

    // Usuário B tenta salvar com a versão 1 (antiga) que ele tinha em tela
    const check2 = validateOptimisticConcurrency(updatedIssue, 1);
    expect(check2.success).toBe(false);
    expect(check2.errorMessage).toContain("Conflito de edição simultânea");
    expect(check2.currentData?.version).toBe(2);
    expect(check2.currentData?.description).toBe("Inconsistência corrigida pelo Analista A");
  });
});
