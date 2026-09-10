import { describe, it, expect } from "vitest";
import { generateCsv, sanitizeCsvValue } from "../../src/lib/exports/csv-generator";
import { generateMeetingDocx } from "../../src/lib/exports/docx-generator";
import { buildMeetingSnapshot } from "../../src/lib/domain/governance-snapshot";

describe("Validação de Exportações DOCX e CSV (Critério 19)", () => {
  it("[Critério 19] CSV deve sanitizar injeção de fórmulas iniciadas por '=', '+', '-', '@'", () => {
    const maliciousFormula = "=cmd|' /C calc'!A0";
    const sanitized = sanitizeCsvValue(maliciousFormula);

    expect(sanitized.startsWith(`"'=`)).toBe(true); // Envolvido em aspas e prefixado por apóstrofo
    expect(sanitizeCsvValue("+556299999999")).toContain("'+5562");
    expect(sanitizeCsvValue("@SUM(A1:A10)")).toContain("'@SUM");
  });

  it("[Critério 19] CSV deve conter marcador UTF-8 BOM e estruturação de linhas e colunas", () => {
    const headers = ["ID", "Título", "Responsável", "Prazo"];
    const rows = [
      ["SP-001", "Fechamento da Folha", "Alexandre (Centi)", "15/09/2026"],
      ["SP-002", "Conferência de Almoxarifado", "João Silva (Prefeitura)", "18/09/2026"],
    ];

    const csvContent = generateCsv(headers, rows);

    // Começa com UTF-8 BOM
    expect(csvContent.charCodeAt(0)).toBe(0xfeff);
    expect(csvContent).toContain("SP-001");
    expect(csvContent).toContain("João Silva (Prefeitura)");
    expect(csvContent.split("\r\n").length).toBe(3); // 1 header + 2 rows
  });

  it("[Critério 19] DOCX deve gerar buffer válido de documento Word com assinatura PK (zip)", async () => {
    const snapshot = buildMeetingSnapshot(
      {
        id: "meet_test",
        title: "ATA DE REUNIÃO SEMANAL DE GOVERNANÇA",
        meetingDate: new Date(2026, 8, 10),
        startTime: "09:00",
        endTime: "10:30",
        location: "Goiânia / Remoto",
        executionLeader: "Alexandre",
        participantsCenti: "Alexandre",
        participantsClient: "João",
        section1ScheduleStatus: "Evolução normal",
        section2CriticalPoints: "Nenhum",
        section3StrategicRealignments: "Manter plano",
        section4ActionPlanSummary: "Plano definido",
        section5GeneralSafeguards: "Salvaguardas técnicas",
      },
      { name: "ERP Centi", municipalityName: "São Patrício" },
      { progressPercentage: 50, autonomyPercentage: 60, operationalDepartments: 1, totalDepartments: 3, activeBlockersCount: 0 },
      [],
      [],
      []
    );

    const docxBuffer = await generateMeetingDocx(snapshot);

    expect(docxBuffer).toBeInstanceOf(Buffer);
    expect(docxBuffer.length).toBeGreaterThan(1000);
    // Assinatura padrão de arquivo zip/docx: 'PK\x03\x04'
    expect(docxBuffer[0]).toBe(0x50); // 'P'
    expect(docxBuffer[1]).toBe(0x4b); // 'K'
  });
});
