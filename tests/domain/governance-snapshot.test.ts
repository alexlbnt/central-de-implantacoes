import { describe, it, expect } from "vitest";
import {
  buildMeetingSnapshot,
  CORPORATE_CENTI_HEADER,
  STANDARD_SECTION_6_VALIDATION_TEXT,
} from "../../src/lib/domain/governance-snapshot";

describe("Governança: Snapshot Imutável e Idempotência de Atas", () => {
  const meetingData = {
    id: "meet_001",
    title: "ATA DE REUNIÃO SEMANAL DE GOVERNANÇA",
    meetingDate: new Date(2026, 8, 10),
    startTime: "09:00",
    endTime: "10:30",
    location: "Sala de Reuniões da Prefeitura e Remoto (Teams)",
    executionLeader: "Alexandre - Líder de Implantação Centi",
    participantsCenti: "Alexandre (Líder)\nCarlos (BA)\nMariana (QA)",
    participantsClient: "João Silva (Secretário de Finanças)\nAna Souza (Gestora de RH)",
    section1ScheduleStatus: "Módulos de Folha e Almoxarifado em operação assistida.",
    section2CriticalPoints: "Atraso no envio da base de dados do patrimônio pelo legado.",
    section3StrategicRealignments: "Priorizar conferência de dados da Folha para fechamento D+0.",
    section4ActionPlanSummary: "Ações prioritárias para a semana.",
    section5GeneralSafeguards: "Notificação técnica referente à entrega tempestiva de dados.",
  };

  const projectData = {
    name: "Implantação do Sistema de Gestão Integrada (ERP Centi)",
    municipalityName: "São Patrício",
  };

  const metricsData = {
    progressPercentage: 45.5,
    autonomyPercentage: 60.0,
    operationalDepartments: 2,
    totalDepartments: 6,
    activeBlockersCount: 1,
  };

  const decisions = [
    { number: 1, description: "Homologar fechamento piloto da folha de pagamento até 15/09." },
    { number: 2, description: "Notificar formalmente a empresa do sistema legado sobre inconsistências." },
  ];

  const actionPlan = [
    {
      taskId: "task_1",
      title: "Realizar teste autônomo com a servidora Ana Souza",
      responsibleName: "Alexandre (Centi) / Ana Souza (Município)",
      dueDateFatal: new Date(2026, 8, 15),
    },
  ];

  const docHashes = [
    {
      documentId: "doc_termo_1",
      versionNumber: 1,
      fileName: "Termo_Recebimento_Dados_Legados.pdf",
      sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
  ];

  it("[Critério 12] Deve gerar snapshot completo com cabeçalho corporativo oficial, seções 1-6 e hashes de documentos", () => {
    const snapshot = buildMeetingSnapshot(
      meetingData,
      projectData,
      metricsData,
      decisions,
      actionPlan,
      docHashes
    );

    expect(snapshot.header.companyName).toBe(CORPORATE_CENTI_HEADER.companyName);
    expect(snapshot.header.cnpj).toBe("14.419.896/0001-52");
    expect(snapshot.sections.section6ValidationAndSignatures).toBe(STANDARD_SECTION_6_VALIDATION_TEXT);
    expect(snapshot.frozenMetrics.progressPercentage).toBe(45.5);
    expect(snapshot.actionPlan[0].dueDateFatal).toBe("15/09/2026");
    expect(snapshot.referencedDocumentHashes[0].sha256Hash).toBe(docHashes[0].sha256Hash);
  });

  it("[Critério 12] Mudanças posteriores no projeto não alteram o snapshot já serializado", () => {
    const snapshot = buildMeetingSnapshot(
      meetingData,
      projectData,
      metricsData,
      decisions,
      actionPlan,
      docHashes
    );

    const serializedJson = JSON.stringify(snapshot);

    // Simular que fora da ata, a tarefa foi concluída ou o projeto mudou de progresso
    actionPlan[0].title = "TITULO ALTERADO FORA DA ATA";
    metricsData.progressPercentage = 99.9;

    // O snapshot serializado permanece exatamente como foi emitido
    const parsedSnapshot = JSON.parse(serializedJson);
    expect(parsedSnapshot.actionPlan[0].title).toBe("Realizar teste autônomo com a servidora Ana Souza");
    expect(parsedSnapshot.frozenMetrics.progressPercentage).toBe(45.5);
  });
});
