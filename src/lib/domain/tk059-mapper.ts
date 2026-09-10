export type TK059Tab = "Modulos" | "Ticket" | "Observacao" | "Documento" | "Checklist";

export interface TK059ReconciliationItem {
  id: string;
  projectId: string;
  sourceType: string; // "DepartmentModule", "Training", "BusinessRule", "Document", "AutonomyTest", "BA_Diagnosis"
  sourceTitle: string;
  system: "TK059_MODULOS" | "TK059_TICKET" | "TK059_OBSERVACAO" | "TK059_DOCUMENTO" | "TK059_CHECKLIST" | "TK090" | "TK102";
  destinationTab: TK059Tab | null;
  identifier: string; // Ex: "#TK059-MOD-FOLHA"
  currentLocalVersion: number;
  coveredLocalVersion: number;
  status: "NAO_REGISTRADO" | "PREPARADO_PARA_REGISTRO" | "REGISTRO_MANUAL_DECLARADO" | "CONFERIDO" | "DIVERGENCIA_IDENTIFICADA";
  lastCheckedAt?: Date | null;
  checkedBy?: string | null;
  summaryText: string;
}

/**
 * Avalia o status de conciliação com a #TK059.
 * Se um item foi previamente conferido na versão local V, mas a versão local atual é > V,
 * deve sinalizar imediatamente DIVERGENCIA_IDENTIFICADA (necessita de nova conciliação).
 */
export function evaluateReconciliationStatus(
  currentStatus: "NAO_REGISTRADO" | "PREPARADO_PARA_REGISTRO" | "REGISTRO_MANUAL_DECLARADO" | "CONFERIDO" | "DIVERGENCIA_IDENTIFICADA",
  currentLocalVersion: number,
  coveredLocalVersion: number
): "NAO_REGISTRADO" | "PREPARADO_PARA_REGISTRO" | "REGISTRO_MANUAL_DECLARADO" | "CONFERIDO" | "DIVERGENCIA_IDENTIFICADA" {
  if (currentStatus === "CONFERIDO" || currentStatus === "REGISTRO_MANUAL_DECLARADO") {
    if (currentLocalVersion > coveredLocalVersion) {
      return "DIVERGENCIA_IDENTIFICADA";
    }
    return currentStatus;
  }
  return currentStatus;
}

/**
 * Gera pacote de texto formatado pronto para cópia e colagem na respectiva aba da #TK059.
 */
export function generateTK059CopyPackage(item: TK059ReconciliationItem): string {
  const header = `[CENTRAL DE IMPLANTAÇÕES - ATUALIZAÇÃO OFICIAL #TK059]`;
  const meta = `Aba de Destino: ${item.destinationTab || "Geral"} | Identificador: ${item.identifier} | Versão Local: v${item.currentLocalVersion}`;
  const timestamp = `Gerado em: ${new Date().toLocaleString("pt-BR")}`;
  const separator = "------------------------------------------------------------";

  return `${header}\n${meta}\n${timestamp}\n${separator}\n${item.summaryText}\n${separator}\n* Nota: Registro de apoio gerencial. A inserção manual na #TK059 oficializa a informação.`;
}
