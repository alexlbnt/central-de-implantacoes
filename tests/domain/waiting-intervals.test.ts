import { describe, it, expect } from "vitest";
import {
  startWaiting,
  endWaiting,
  IssueWaitingState,
} from "../../src/lib/domain/waiting-service";

describe("Condições de Espera Independente e Inércia Municipal", () => {
  it("[Critério 10] Deve iniciar condição de espera sem apagar status de trabalho", () => {
    const initialState: IssueWaitingState = {
      waitingCondition: "NENHUMA",
      totalWaitingMinutes: 0,
    };

    const startTime = new Date(2026, 8, 10, 10, 0, 0);
    const { updatedState, newInterval } = startWaiting(
      initialState,
      "AGUARDANDO_MUNICIPIO",
      "BASE_LEGADA",
      "Aguardando envio do arquivo de migração da Folha",
      "Secretário de Administração",
      startTime
    );

    expect(updatedState.waitingCondition).toBe("AGUARDANDO_MUNICIPIO");
    expect(updatedState.waitingType).toBe("BASE_LEGADA");
    expect(updatedState.waitingStartedAt).toEqual(startTime);
    expect(newInterval.condition).toBe("AGUARDANDO_MUNICIPIO");
  });

  it("[Critério 10] Ao encerrar espera, deve calcular e acumular duração em minutos", () => {
    const startTime = new Date(2026, 8, 10, 10, 0, 0);
    const activeState: IssueWaitingState = {
      waitingCondition: "AGUARDANDO_MUNICIPIO",
      waitingType: "LEGISLACAO",
      waitingReason: "Aguardando envio do plano de cargos",
      waitingStartedAt: startTime,
      totalWaitingMinutes: 30, // Já tinha 30 min de espera anterior
    };

    const endTime = new Date(2026, 8, 10, 12, 30, 0); // 150 minutos depois
    const { updatedState, closedInterval } = endWaiting(
      activeState,
      {
        id: "int_1",
        issueId: "iss_1",
        condition: "AGUARDANDO_MUNICIPIO",
        startedAt: startTime,
      },
      endTime
    );

    expect(updatedState.waitingCondition).toBe("NENHUMA");
    expect(updatedState.waitingStartedAt).toBeNull();
    expect(updatedState.totalWaitingMinutes).toBe(30 + 150); // 180 minutos
    expect(closedInterval?.durationMinutes).toBe(150);
  });
});
