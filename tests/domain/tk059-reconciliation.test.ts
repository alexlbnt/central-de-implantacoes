import { describe, it, expect } from "vitest";
import {
  evaluateReconciliationStatus,
  generateTK059CopyPackage,
  TK059ReconciliationItem,
} from "../../src/lib/domain/tk059-mapper";

describe("Conciliação com a #TK059 e Detecção de Divergências", () => {
  it("[Critério 14] Registro conferido na versão local V que sofre alteração para V+1 deve passar a DIVERGENCIA_IDENTIFICADA", () => {
    // Situação 1: Item conferido na versão 1
    const status1 = evaluateReconciliationStatus("CONFERIDO", 1, 1);
    expect(status1).toBe("CONFERIDO");

    // Situação 2: Item foi editado no sistema local (versão local virou 2, mas a conferência cobriu apenas a versão 1)
    const status2 = evaluateReconciliationStatus("CONFERIDO", 2, 1);
    expect(status2).toBe("DIVERGENCIA_IDENTIFICADA");
  });

  it("[Critério 14] Deve gerar pacote de cópia formatado para inclusão manual na aba correta da #TK059", () => {
    const item: TK059ReconciliationItem = {
      id: "ref_1",
      projectId: "proj_sp",
      sourceType: "DepartmentModule",
      sourceTitle: "Diagnóstico Folha de Pagamento",
      system: "TK059_MODULOS",
      destinationTab: "Modulos",
      identifier: "#TK059-MOD-FOLHA",
      currentLocalVersion: 2,
      coveredLocalVersion: 1,
      status: "DIVERGENCIA_IDENTIFICADA",
      summaryText: "Folha de Pagamento em operação assistida com 1 processo crítico testado.",
    };

    const pkg = generateTK059CopyPackage(item);

    expect(pkg).toContain("[CENTRAL DE IMPLANTAÇÕES - ATUALIZAÇÃO OFICIAL #TK059]");
    expect(pkg).toContain("Aba de Destino: Modulos");
    expect(pkg).toContain("Identificador: #TK059-MOD-FOLHA");
    expect(pkg).toContain("Versão Local: v2");
    expect(pkg).toContain("Folha de Pagamento em operação assistida");
    expect(pkg).toContain("Registro de apoio gerencial");
  });
});
