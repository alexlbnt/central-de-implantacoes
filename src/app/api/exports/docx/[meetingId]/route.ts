import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server-session";
import prisma from "@/lib/db/prisma";
import { generateMeetingDocx } from "@/lib/exports/docx-generator";
import { buildMeetingSnapshot, GovernanceMeetingSnapshotData } from "@/lib/domain/governance-snapshot";
import {
  calculateDeliverableProgress,
  calculateAutonomyIndex,
  calculateOperationalDepartmentsSummary,
} from "@/lib/domain/indicator-calculator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { meetingId } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      project: {
        include: {
          municipality: true,
          memberships: true,
          entities: {
            include: {
              departments: {
                include: {
                  criticalProcesses: {
                    include: {
                      testExecutions: { orderBy: { executedAt: "desc" }, take: 1 },
                      autonomyReqs: true,
                    },
                  },
                  deliverables: true,
                  issues: { where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } } },
                },
              },
            },
          },
          issues: {
            where: { isOperationalBlocker: true, status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
          },
        },
      },
      snapshot: true,
      decisions: {
        orderBy: { number: "asc" },
        include: {
          tasks: true,
        },
      },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Ata de reunião não encontrada." }, { status: 404 });
  }

  // IDOR check
  const isMember = meeting.project.memberships.some((m) => m.userId === user.id);
  if (user.role !== "ADMIN_GERAL" && !isMember) {
    return NextResponse.json({ error: "Acesso negado à ata deste projeto." }, { status: 403 });
  }

  let snapshotData: GovernanceMeetingSnapshotData;

  if (meeting.snapshot) {
    // Snapshot imutável congelado na emissão
    snapshotData = JSON.parse(meeting.snapshot.snapshotDataJson) as GovernanceMeetingSnapshotData;
  } else {
    // Reunião em rascunho: constrói snapshot em tempo real para pré-visualização
    const allDepartments = meeting.project.entities.flatMap((e) => e.departments);
    const allDeliverables = allDepartments.flatMap((d) => d.deliverables);
    const allAutonomyReqs = allDepartments.flatMap((d) =>
      d.criticalProcesses.flatMap((p) => p.autonomyReqs)
    );

    const depSummary = calculateOperationalDepartmentsSummary(allDepartments);
    const progressPerc = calculateDeliverableProgress(allDeliverables);
    const autonomyPerc = calculateAutonomyIndex(allAutonomyReqs);

    const actionPlan: Array<{ taskId?: string; title: string; responsibleName: string; dueDateFatal: Date }> = [];
    for (const d of meeting.decisions) {
      for (const t of d.tasks) {
        actionPlan.push({
          taskId: t.id,
          title: t.title,
          responsibleName: t.responsibleName || "A definir",
          dueDateFatal: t.dueDateFatal,
        });
      }
    }

    snapshotData = buildMeetingSnapshot(
      meeting,
      {
        name: meeting.project.name,
        municipalityName: meeting.project.municipality.name,
      },
      {
        progressPercentage: progressPerc.percentage,
        autonomyPercentage: autonomyPerc.percentage,
        operationalDepartments: depSummary.operational,
        totalDepartments: depSummary.total,
        activeBlockersCount: meeting.project.issues.length,
      },
      meeting.decisions.map((d) => ({ number: d.number, description: d.description })),
      actionPlan,
      []
    );
  }

  try {
    const docxBuffer = await generateMeetingDocx(snapshotData);
    const dateFormatted = meeting.meetingDate.toISOString().slice(0, 10);
    const fileName = `Ata_Reuniao_${meeting.project.name.replace(/\s+/g, "_")}_${dateFormatted}.docx`;

    return new Response(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": docxBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[DOCX_EXPORT_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao gerar arquivo DOCX da ata.", details: String(error) },
      { status: 500 }
    );
  }
}
