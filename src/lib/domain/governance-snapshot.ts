export interface GovernanceMeetingSnapshotData {
  header: {
    companyName: string;
    cnpj: string;
    address: string;
    department: string;
    templateVersion: string;
  };
  meetingInfo: {
    id: string;
    title: string;
    projectName: string;
    municipalityName: string;
    meetingDateFormatted: string;
    timeRange: string;
    location: string;
    executionLeader: string;
  };
  participants: {
    centi: string[];
    client: string[];
  };
  sections: {
    section1ScheduleStatus: string;
    section2CriticalPoints: string;
    section3StrategicRealignments: string;
    section4ActionPlanSummary: string;
    section5GeneralSafeguards: string;
    section6ValidationAndSignatures: string;
  };
  frozenMetrics: {
    progressPercentage: number | null;
    autonomyPercentage: number | null;
    operationalDepartments: number;
    totalDepartments: number;
    activeBlockersCount: number;
  };
  decisions: Array<{
    number: number;
    description: string;
  }>;
  actionPlan: Array<{
    taskId?: string;
    title: string;
    responsibleName: string;
    dueDateFatal: string; // "DD/MM/AAAA"
  }>;
  referencedDocumentHashes: Array<{
    documentId: string;
    versionNumber: number;
    fileName: string;
    sha256Hash: string;
  }>;
}

export const CORPORATE_CENTI_HEADER = {
  companyName: "CENTI SOLUÇÕES LTDA",
  cnpj: "14.419.896/0001-52",
  address: "Rua 94, nº 816, Qd. F16, Lt. 98/100, Sala 03, Térreo/Pavimento Superior, Setor Sul, Goiânia/GO, CEP 74.080-075",
  department: "Escritório de Projetos (PMO) e Governança Corporativa",
  templateVersion: "NOP-001/2026-v12.5",
};

export const STANDARD_SECTION_6_VALIDATION_TEXT =
  "Os participantes validam as informações, prazos e diretrizes registradas nesta ata semanal, assumindo integral compromisso mútuo com a execução das atividades descritas no Plano de Ação.";

/**
 * Cria o snapshot imutável para a ata de reunião no momento de sua emissão.
 */
export function buildMeetingSnapshot(
  meeting: {
    id: string;
    title: string;
    meetingDate: Date;
    startTime: string;
    endTime: string;
    location: string;
    executionLeader: string;
    participantsCenti: string;
    participantsClient: string;
    section1ScheduleStatus: string;
    section2CriticalPoints: string;
    section3StrategicRealignments: string;
    section4ActionPlanSummary?: string | null;
    section5GeneralSafeguards: string;
  },
  project: {
    name: string;
    municipalityName: string;
  },
  metrics: {
    progressPercentage: number | null;
    autonomyPercentage: number | null;
    operationalDepartments: number;
    totalDepartments: number;
    activeBlockersCount: number;
  },
  decisions: Array<{ number: number; description: string }>,
  actionPlan: Array<{ taskId?: string; title: string; responsibleName: string; dueDateFatal: Date }>,
  documentVersions: Array<{
    documentId: string;
    versionNumber: number;
    fileName: string;
    sha256Hash: string;
  }>
): GovernanceMeetingSnapshotData {
  const d = meeting.meetingDate;
  const meetingDateFormatted = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  return {
    header: CORPORATE_CENTI_HEADER,
    meetingInfo: {
      id: meeting.id,
      title: meeting.title,
      projectName: project.name,
      municipalityName: project.municipalityName,
      meetingDateFormatted,
      timeRange: `${meeting.startTime} às ${meeting.endTime}`,
      location: meeting.location,
      executionLeader: meeting.executionLeader,
    },
    participants: {
      centi: meeting.participantsCenti.split("\n").map((p) => p.trim()).filter(Boolean),
      client: meeting.participantsClient.split("\n").map((p) => p.trim()).filter(Boolean),
    },
    sections: {
      section1ScheduleStatus: meeting.section1ScheduleStatus,
      section2CriticalPoints: meeting.section2CriticalPoints,
      section3StrategicRealignments: meeting.section3StrategicRealignments,
      section4ActionPlanSummary: meeting.section4ActionPlanSummary || "Conforme tabela abaixo.",
      section5GeneralSafeguards: meeting.section5GeneralSafeguards,
      section6ValidationAndSignatures: STANDARD_SECTION_6_VALIDATION_TEXT,
    },
    frozenMetrics: metrics,
    decisions,
    actionPlan: actionPlan.map((action) => {
      const due = action.dueDateFatal;
      const dueFormatted = `${String(due.getDate()).padStart(2, "0")}/${String(due.getMonth() + 1).padStart(2, "0")}/${due.getFullYear()}`;
      return {
        taskId: action.taskId,
        title: action.title,
        responsibleName: action.responsibleName,
        dueDateFatal: dueFormatted,
      };
    }),
    referencedDocumentHashes: documentVersions,
  };
}
