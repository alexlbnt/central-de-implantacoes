import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  HeadingLevel,
} from "docx";
import { GovernanceMeetingSnapshotData } from "../domain/governance-snapshot";

/**
 * Gera documento Word (.docx) rigorosamente formatado de acordo com o modelo
 * oficial corporativo da Centi Soluções (NOP 001/2026).
 */
export async function generateMeetingDocx(snapshot: GovernanceMeetingSnapshotData): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch (2.54 cm)
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          // Cabeçalho Corporativo
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: snapshot.header.companyName,
                            bold: true,
                            size: 22,
                            color: "0F2942",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `CNPJ nº ${snapshot.header.cnpj} | ${snapshot.header.department}`,
                            size: 16,
                            color: "4B5563",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: snapshot.header.address,
                            size: 14,
                            color: "6B7280",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 200 } }),

          // Título do Documento
          new Paragraph({
            children: [
              new TextRun({
                text: snapshot.meetingInfo.title,
                bold: true,
                size: 26,
                color: "0F2942",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          // Metadados da Reunião
          new Paragraph({
            children: [
              new TextRun({ text: "PROJETO: ", bold: true }),
              new TextRun({
                text: `${snapshot.meetingInfo.projectName} - ${snapshot.meetingInfo.municipalityName.toUpperCase()}`,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "DATA: ", bold: true }),
              new TextRun({ text: `${snapshot.meetingInfo.meetingDateFormatted}  |  ` }),
              new TextRun({ text: "HORÁRIO: ", bold: true }),
              new TextRun({ text: `${snapshot.meetingInfo.timeRange}  |  ` }),
              new TextRun({ text: "LOCAL: ", bold: true }),
              new TextRun({ text: snapshot.meetingInfo.location }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "RESPONSÁVEL PELA EXECUÇÃO: ", bold: true }),
              new TextRun({ text: `${snapshot.header.companyName} (${snapshot.meetingInfo.executionLeader})` }),
            ],
            spacing: { after: 200 },
          }),

          // Participantes
          new Paragraph({
            children: [
              new TextRun({ text: "PARTICIPANTES DA REUNIÃO", bold: true, size: 20, color: "0F2942" }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Representantes da CONTRATADA (Centi): ", bold: true }),
              new TextRun({ text: snapshot.participants.centi.join("; ") || "Conforme lista de presenças." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Representantes da CONTRATANTE (Prefeitura): ", bold: true }),
              new TextRun({ text: snapshot.participants.client.join("; ") || "Conforme lista de presenças." }),
            ],
            spacing: { after: 200 },
          }),

          // Seção 1
          new Paragraph({
            children: [
              new TextRun({ text: "1. STATUS ATUAL DO CRONOGRAMA", bold: true, size: 20, color: "0F2942" }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: snapshot.sections.section1ScheduleStatus })],
            spacing: { after: 200 },
          }),

          // Seção 2
          new Paragraph({
            children: [
              new TextRun({
                text: "2. PONTOS CRÍTICOS E IMPEDIMENTOS IDENTIFICADOS",
                bold: true,
                size: 20,
                color: "0F2942",
              }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: snapshot.sections.section2CriticalPoints })],
            spacing: { after: 200 },
          }),

          // Seção 3
          new Paragraph({
            children: [
              new TextRun({
                text: "3. DECISÕES E REALINHAMENTOS ESTRATÉGICOS",
                bold: true,
                size: 20,
                color: "0F2942",
              }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: snapshot.sections.section3StrategicRealignments })],
          }),
          ...snapshot.decisions.map(
            (dec) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `Decisão ${String(dec.number).padStart(2, "0")}: `, bold: true }),
                  new TextRun({ text: dec.description }),
                ],
              })
          ),
          new Paragraph({ text: "", spacing: { after: 200 } }),

          // Seção 4: Plano de Ação (Tabela)
          new Paragraph({
            children: [
              new TextRun({
                text: "4. PLANO DE AÇÃO PARA A PRÓXIMA SEMANA",
                bold: true,
                size: 20,
                color: "0F2942",
              }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "TAREFA / AÇÃO REQUERIDA", bold: true })] })],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "RESPONSÁVEL", bold: true })] })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "PRAZO FATAL", bold: true })] })],
                    width: { size: 20, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              ...snapshot.actionPlan.map(
                (item) =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ text: item.title })] }),
                      new TableCell({ children: [new Paragraph({ text: item.responsibleName })] }),
                      new TableCell({ children: [new Paragraph({ text: item.dueDateFatal })] }),
                    ],
                  })
              ),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 200 } }),

          // Seção 5
          new Paragraph({
            children: [
              new TextRun({
                text: "5. OBSERVAÇÕES GERAIS E SALVAGUARDAS",
                bold: true,
                size: 20,
                color: "0F2942",
              }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: snapshot.sections.section5GeneralSafeguards })],
            spacing: { after: 300 },
          }),

          // Seção 6: Validação e Assinaturas
          new Paragraph({
            children: [
              new TextRun({ text: "6. VALIDAÇÃO E ASSINATURAS", bold: true, size: 20, color: "0F2942" }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: snapshot.sections.section6ValidationAndSignatures,
                italics: true,
              }),
            ],
            spacing: { after: 600 },
          }),

          // Campos de Assinatura
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: "__________________________________________________________",
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "PELO MUNICÍPIO / CONTRATANTE", bold: true }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        text: "Gestor de Contratos / Secretário Responsável",
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: "__________________________________________________________",
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: "PELA CENTI SOLUÇÕES / CONTRATADA", bold: true }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        text: "Líder de Implantação e Projetos",
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
