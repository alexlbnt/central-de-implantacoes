import { PrismaClient, NotificationType, UserRole, GPHStatus } from "@prisma/client";
import { ProjectCalendar } from "../src/lib/domain/calendar";

const prisma = new PrismaClient();

export async function runAlertChecks(referenceDate: Date = new Date()) {
  const dateBucket = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}-${String(referenceDate.getDate()).padStart(2, "0")}`;
  console.log(`[ALERTA] Executando verificação determinística de alertas para ${dateBucket}...`);

  let notificationsCreated = 0;

  // 1. Ações e Pendências com Prazo Fatal Vencido
  const overdueIssues = await prisma.issue.findMany({
    where: {
      dueDate: { lt: referenceDate },
      status: { notIn: ["CONCLUIDA", "CANCELADA"] },
    },
    include: {
      project: {
        include: {
          memberships: {
            where: { role: { in: [UserRole.LIDER_PROJETO, UserRole.DC] } },
          },
        },
      },
      assignee: true,
    },
  });

  for (const issue of overdueIssues) {
    const recipients = new Set<string>();
    if (issue.assigneeId) recipients.add(issue.assigneeId);
    for (const m of issue.project.memberships) {
      recipients.add(m.userId);
    }

    for (const userId of recipients) {
      const idempotencyKey = `${NotificationType.PRAZO_FATAL_VENCIDO}:${issue.id}:${userId}:${dateBucket}`;
      try {
        await prisma.notification.upsert({
          where: { idempotencyKey },
          update: {},
          create: {
            userId,
            type: NotificationType.PRAZO_FATAL_VENCIDO,
            title: `Prazo Fatal Vencido: [${issue.project.codePrefix}-${String(issue.codeNumber).padStart(3, "0")}]`,
            message: `A pendência "${issue.title}" venceu em ${issue.dueDate?.toLocaleDateString("pt-BR")}.`,
            linkUrl: `/pendencias?id=${issue.id}`,
            idempotencyKey,
          },
        });
        notificationsCreated++;
      } catch {
        // Idempotência garantida
      }
    }
  }

  // 2. Departamentos com Testes Expirados (> 7 dias)
  const validityThreshold = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const departments = await prisma.department.findMany({
    where: {
      operationalStatus: "OPERACIONAL",
    },
    include: {
      entity: {
        include: {
          project: {
            include: {
              memberships: {
                where: { role: UserRole.LIDER_PROJETO },
              },
            },
          },
        },
      },
      criticalProcesses: {
        include: {
          testExecutions: {
            orderBy: { executedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  for (const dept of departments) {
    let hasExpired = false;
    for (const proc of dept.criticalProcesses) {
      const latest = proc.testExecutions[0];
      if (latest && latest.executedAt < validityThreshold) {
        hasExpired = true;
        break;
      }
    }

    if (hasExpired) {
      await prisma.department.update({
        where: { id: dept.id },
        data: {
          revalidationRequired: true,
          revalidationReason: "Teste funcional expirado há mais de 7 dias.",
          operationalStatus: "OPERACAO_ASSISTIDA", // Regride automaticamente preservando histórico
        },
      });

      for (const m of dept.entity.project.memberships) {
        const idempotencyKey = `${NotificationType.TESTE_EXPIRADO}:${dept.id}:${m.userId}:${dateBucket}`;
        try {
          await prisma.notification.upsert({
            where: { idempotencyKey },
            update: {},
            create: {
              userId: m.userId,
              type: NotificationType.TESTE_EXPIRADO,
              title: `Revalidação Necessária: ${dept.name}`,
              message: `O departamento "${dept.name}" teve teste expirado (> 7 dias) e regrediu para Operação Assistida.`,
              linkUrl: `/departamentos/${dept.id}`,
              idempotencyKey,
            },
          });
          notificationsCreated++;
        } catch {
          // Idempotência
        }
      }
    }
  }

  // 3. Alerta ao DC sobre Resistência Municipal em GPH Ativo (> 3 dias úteis)
  const activeGPHs = await prisma.gPHIntervention.findMany({
    where: {
      status: GPHStatus.EM_ANDAMENTO,
      hasMunicipalResistance: true,
    },
    include: {
      project: {
        include: {
          memberships: {
            where: { role: UserRole.DC },
          },
        },
      },
    },
  });

  const calendar = new ProjectCalendar();
  for (const gph of activeGPHs) {
    if (gph.resistanceConsecutiveDays > 3) {
      for (const m of gph.project.memberships) {
        const idempotencyKey = `${NotificationType.GPH_RESISTENCIA_MUNICIPAL}:${gph.id}:${m.userId}:${dateBucket}`;
        try {
          await prisma.notification.upsert({
            where: { idempotencyKey },
            update: {},
            create: {
              userId: m.userId,
              type: NotificationType.GPH_RESISTENCIA_MUNICIPAL,
              title: `Alerta de Caducidade GPH: ${gph.project.name}`,
              message: `Identificada resistência municipal contínua por ${gph.resistanceConsecutiveDays} dias úteis no GPH. Avaliar eventual decretação formal de caducidade.`,
              linkUrl: `/transicao`,
              idempotencyKey,
            },
          });
          notificationsCreated++;
        } catch {
          // Idempotência
        }
      }
    }
  }

  console.log(`[ALERTA] Verificação concluída. ${notificationsCreated} novas notificações processadas.`);
}

if (require.main === module) {
  runAlertChecks()
    .catch(console.error)
    .finally(async () => {
      await prisma.$disconnect();
    });
}
