import { describe, it, expect } from "vitest";
import {
  validateGPHConvocation,
  evaluateGPHCaducity,
} from "../../src/lib/domain/gph-governance";
import { UserRole, GPHStatus } from "@prisma/client";
import { ProjectCalendar } from "../../src/lib/domain/calendar";

describe("Governança do GPH e Rito de Caducidade (Critério 18)", () => {
  const calendar = new ProjectCalendar([], "America/Sao_Paulo");

  it("[Critério 18] Pendência de prioridade CRÍTICA NÃO deve autorizar abertura automática de GPH", () => {
    // Tentativa por analista comum sem rito de governança
    const checkAnalista = validateGPHConvocation({
      requesterRole: UserRole.ANALISTA,
      hasCriticalIssue: true,
      tk090Reference: "#TK090-DIAG-01",
      baTechnicalOpinion: "Parecer do BA",
    });

    expect(checkAnalista.canConvoke).toBe(false);
    expect(checkAnalista.errorReason).toContain("privativo do Diretor de Contas / Coordenador (DC)");
  });

  it("[Critério 18] DC só pode convocar GPH se houver ticket #TK090 e parecer técnico do BA", () => {
    // Sem ticket #TK090
    const checkSemTK090 = validateGPHConvocation({
      requesterRole: UserRole.DC,
      hasCriticalIssue: true,
      tk090Reference: null,
      baTechnicalOpinion: "Parecer válido",
    });
    expect(checkSemTK090.canConvoke).toBe(false);
    expect(checkSemTK090.errorReason).toContain("#TK090");

    // Com todos os pré-requisitos formais
    const checkValido = validateGPHConvocation({
      requesterRole: UserRole.DC,
      hasCriticalIssue: true,
      tk090Reference: "#TK090-DIAG-01",
      baTechnicalOpinion: "Diagnóstico completo aprovado pelo BA",
      crmEvaluation: "Relato de instabilidade",
    });
    expect(checkValido.canConvoke).toBe(true);
  });

  it("[Critério 18] Caducidade do GPH exige > 3 dias úteis consecutivos de resistência municipal comprovada e decisão do DC", () => {
    // Início da resistência: quarta-feira 09/09/2026
    const startResistance = new Date(2026, 8, 9);
    // Sexta-feira 11/09/2026 (3 dias úteis: qua, qui, sex) -> ainda NÃO é > 3 dias úteis
    const friday = new Date(2026, 8, 11);

    const checkFriday = evaluateGPHCaducity({
      deciderRole: UserRole.DC,
      gphStatus: GPHStatus.EM_ANDAMENTO,
      hasMunicipalResistance: true,
      resistanceStartedAt: startResistance,
      referenceDate: friday,
      calendar,
    });
    expect(checkFriday.isEligibleForCaducity).toBe(false);
    expect(checkFriday.canDecreeCaducity).toBe(false);

    // Segunda-feira 14/09/2026 (4 dias úteis) -> elegível para caducidade!
    const monday = new Date(2026, 8, 14);
    const checkMonday = evaluateGPHCaducity({
      deciderRole: UserRole.DC,
      gphStatus: GPHStatus.EM_ANDAMENTO,
      hasMunicipalResistance: true,
      resistanceStartedAt: startResistance,
      referenceDate: monday,
      calendar,
    });
    expect(checkMonday.isEligibleForCaducity).toBe(true);
    expect(checkMonday.canDecreeCaducity).toBe(true);

    // Se outro papel tentar decretar (ex: Líder), sistema bloqueia: caducidade é privativa do DC
    const checkLider = evaluateGPHCaducity({
      deciderRole: UserRole.LIDER_PROJETO,
      gphStatus: GPHStatus.EM_ANDAMENTO,
      hasMunicipalResistance: true,
      resistanceStartedAt: startResistance,
      referenceDate: monday,
      calendar,
    });
    expect(checkLider.isEligibleForCaducity).toBe(true);
    expect(checkLider.canDecreeCaducity).toBe(false);
    expect(checkLider.errorReason).toContain("privativa do DC");
  });
});
