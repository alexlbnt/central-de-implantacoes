import { describe, it, expect, beforeEach } from "vitest";
import prisma from "../../src/lib/db/prisma";
import { runAlertChecks } from "../../src/lib/domain/alert-checker";
import { NotificationType, UserRole, GPHStatus } from "@prisma/client";

describe("Verificação Determinística de Alertas (Cron Service)", () => {
  it("deve criar notificações com chave de idempotência para pendências vencidas", async () => {
    // 1. Cria usuário e projeto de teste
    const org = await prisma.organization.create({
      data: { name: "Org Teste Alertas" },
    });

    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: "Líder Alertas",
        email: `lider.alertas.${Date.now()}@centi.com.br`,
        passwordHash: "hash",
        role: UserRole.LIDER_PROJETO,
      },
    });

    const mun = await prisma.municipality.create({
      data: {
        organizationId: org.id,
        name: `Mun Alertas ${Date.now()}`,
        state: "GO",
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        municipalityId: mun.id,
        name: "Projeto Alertas",
        codePrefix: "ALR",
      },
    });

    await prisma.projectMembership.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: UserRole.LIDER_PROJETO,
      },
    });

    // 2. Cria pendência vencida (dueDate no passado)
    const overdueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const issue = await prisma.issue.create({
      data: {
        projectId: project.id,
        codeNumber: 1,
        title: "Pendência Vencida Teste",
        description: "Teste de alerta de prazo fatal",
        dueDate: overdueDate,
        status: "ABERTA",
        authorId: user.id,
        assigneeId: user.id,
      },
    });

    // 3. Executa a primeira checagem de alertas
    const result1 = await runAlertChecks();
    expect(result1.notificationsCreated).toBeGreaterThanOrEqual(1);

    // Verifica se a notificação foi criada para o usuário
    const notif = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: NotificationType.PRAZO_FATAL_VENCIDO,
      },
    });
    expect(notif).toBeDefined();
    expect(notif?.idempotencyKey).toContain(issue.id);

    // 4. Executa novamente na mesma data: garantia de idempotência (nenhuma nova notificação duplicada)
    const result2 = await runAlertChecks();
    const countAfter = await prisma.notification.count({
      where: {
        userId: user.id,
        type: NotificationType.PRAZO_FATAL_VENCIDO,
      },
    });
    expect(countAfter).toBe(1);
  });
});
