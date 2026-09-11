import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "../../src/lib/db/prisma";
import { UserRole } from "@prisma/client";

// Mocks para execução das Server Actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockCurrentUser: any = null;
vi.mock("@/lib/auth/server-session", () => ({
  getCurrentUser: vi.fn(async () => mockCurrentUser),
}));

import {
  createAgendaEventAction,
  deleteAgendaEventAction,
} from "../../src/lib/actions/agenda-actions";

describe("Planner Semanal e Agenda Operacional", () => {
  let orgId: string;
  let projectId: string;
  let testUser: any;
  const createdEventIds: string[] = [];

  beforeAll(async () => {
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: "Centi Soluções - Testes Agenda" },
      });
    }
    orgId = org.id;

    testUser = await prisma.user.findFirst({
      where: { role: UserRole.LIDER_PROJETO },
    });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          name: "Líder Teste Agenda",
          email: `lider.agenda.${Date.now()}@centi.com.br`,
          passwordHash: "hash123",
          role: UserRole.LIDER_PROJETO,
          organizationId: orgId,
        },
      });
    }

    let mun = await prisma.municipality.findFirst({
      where: { organizationId: orgId },
    });
    if (!mun) {
      mun = await prisma.municipality.create({
        data: { name: "Município Agenda Teste", state: "GO", organizationId: orgId },
      });
    }

    let project = await prisma.project.findFirst({
      where: { organizationId: orgId },
    });
    if (!project) {
      project = await prisma.project.create({
        data: {
          organizationId: orgId,
          municipalityId: mun.id,
          name: "Projeto Implantação Agenda Teste",
          status: "PLANEJAMENTO",
          phase: "PLANEJAMENTO",
        },
      });
    }
    projectId = project.id;
  });

  afterAll(async () => {
    if (createdEventIds.length > 0) {
      await prisma.agendaEvent.deleteMany({
        where: { id: { in: createdEventIds } },
      });
    }
  });

  describe("1. Lógica do Planner Semanal (Segunda a Sexta-feira)", () => {
    const getMonday = (baseDate: Date, offset: number) => {
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(baseDate.getFullYear(), baseDate.getMonth(), diff + offset * 7);
      monday.setHours(0, 0, 0, 0);
      return monday;
    };

    it("calcula corretamente a segunda-feira da semana de uma data arbitrária", () => {
      // Exemplo: Quarta-feira, 16 de Setembro de 2026
      const wednesday = new Date(2026, 8, 16); // mês 8 = setembro (0-indexed)
      const monday = getMonday(wednesday, 0);

      expect(monday.getDay()).toBe(1); // 1 = Segunda-feira
      expect(monday.getDate()).toBe(14); // Segunda foi dia 14
      expect(monday.getMonth()).toBe(8);
    });

    it("gera 5 dias úteis de Segunda a Sexta consecutivamente", () => {
      const monday = getMonday(new Date(2026, 8, 14), 0);
      const days = [0, 1, 2, 3, 4].map((i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return {
          dayOfWeek: d.getDay(),
          date: d.getDate(),
        };
      });

      expect(days).toHaveLength(5);
      expect(days.map((d) => d.dayOfWeek)).toEqual([1, 2, 3, 4, 5]); // Seg, Ter, Qua, Qui, Sex
      expect(days.map((d) => d.date)).toEqual([14, 15, 16, 17, 18]);
    });

    it("navega corretamente entre semanas através de offsets (+1 e -1)", () => {
      const base = new Date(2026, 8, 14);
      const prevMonday = getMonday(base, -1);
      const nextMonday = getMonday(base, 1);

      expect(prevMonday.getDate()).toBe(7);
      expect(nextMonday.getDate()).toBe(21);
    });
  });

  describe("2. Detector de Conflitos de Agenda", () => {
    const detectConflicts = (events: any[]) => {
      const conflicts: string[] = [];
      for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
          const e1 = events[i];
          const e2 = events[j];
          const overlap = e1.start < e2.end && e1.end > e2.start;
          if (overlap) {
            if (e1.responsible.toLowerCase() === e2.responsible.toLowerCase()) {
              conflicts.push(`Responsável duplicado: ${e1.responsible}`);
            } else if (e1.location === e2.location && e1.location !== "Remoto") {
              conflicts.push(`Local compartilhado: ${e1.location}`);
            }
          }
        }
      }
      return conflicts;
    };

    it("detecta sobreposição de horários para o mesmo responsável", () => {
      const events = [
        {
          title: "Treinamento Folha",
          responsible: "Alexandre",
          location: "Sala A",
          start: new Date("2026-09-14T09:00:00"),
          end: new Date("2026-09-14T11:00:00"),
        },
        {
          title: "Alinhamento Gabinete",
          responsible: "Alexandre",
          location: "Sala B",
          start: new Date("2026-09-14T10:00:00"),
          end: new Date("2026-09-14T12:00:00"),
        },
      ];

      const conflicts = detectConflicts(events);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain("Responsável duplicado: Alexandre");
    });

    it("detecta sobreposição do mesmo local físico para responsáveis diferentes", () => {
      const events = [
        {
          title: "Treinamento Tributos",
          responsible: "Bruno",
          location: "Auditório Central",
          start: new Date("2026-09-14T14:00:00"),
          end: new Date("2026-09-14T16:00:00"),
        },
        {
          title: "Reunião de Governança",
          responsible: "Carlos",
          location: "Auditório Central",
          start: new Date("2026-09-14T15:00:00"),
          end: new Date("2026-09-14T17:00:00"),
        },
      ];

      const conflicts = detectConflicts(events);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain("Local compartilhado: Auditório Central");
    });

    it("não aponta conflito quando os horários são sequenciais ou remotos", () => {
      const events = [
        {
          title: "Daily Matinal",
          responsible: "Alexandre",
          location: "Remoto",
          start: new Date("2026-09-14T08:00:00"),
          end: new Date("2026-09-14T08:30:00"),
        },
        {
          title: "Alinhamento Remoto",
          responsible: "Bruno",
          location: "Remoto",
          start: new Date("2026-09-14T08:00:00"),
          end: new Date("2026-09-14T08:30:00"),
        },
        {
          title: "Treinamento Presencial",
          responsible: "Alexandre",
          location: "Sala 1",
          start: new Date("2026-09-14T09:00:00"),
          end: new Date("2026-09-14T11:00:00"),
        },
      ];

      const conflicts = detectConflicts(events);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("3. Server Actions de Agendamento (create & delete)", () => {
    it("impede agendamento sem autenticação prévia", async () => {
      mockCurrentUser = null;
      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("title", "Reunião de Abertura");
      formData.set("date", "2026-09-15");
      formData.set("startTime", "09:00");
      formData.set("endTime", "10:00");

      await expect(createAgendaEventAction(formData)).rejects.toThrow("Não autenticado");
    });

    it("valida obrigatoriedade de campos mínimos (título, horários)", async () => {
      mockCurrentUser = testUser;

      const emptyTitle = new FormData();
      emptyTitle.set("projectId", projectId);
      emptyTitle.set("title", "");
      emptyTitle.set("date", "2026-09-15");
      emptyTitle.set("startTime", "09:00");
      emptyTitle.set("endTime", "10:00");
      await expect(createAgendaEventAction(emptyTitle)).rejects.toThrow("título do compromisso é obrigatório");

      const invalidTime = new FormData();
      invalidTime.set("projectId", projectId);
      invalidTime.set("title", "Teste de Horário");
      invalidTime.set("date", "2026-09-15");
      invalidTime.set("startTime", "15:00");
      invalidTime.set("endTime", "14:00"); // Fim antes do início
      await expect(createAgendaEventAction(invalidTime)).rejects.toThrow("término deve ser posterior");
    });

    it("cria um compromisso com sucesso no banco de dados", async () => {
      mockCurrentUser = testUser;

      const formData = new FormData();
      formData.set("projectId", projectId);
      formData.set("title", "Treinamento Folha e eSocial");
      formData.set("type", "TREINAMENTO");
      formData.set("date", "2026-09-15");
      formData.set("startTime", "14:00");
      formData.set("endTime", "17:00");
      formData.set("location", "Sala de Informática RH");
      formData.set("responsibleName", "Especialista em Folha Centi");
      formData.set("participants", "Diretor de RH, Analistas de Folha");
      formData.set("notes", "Realizar simulação completa de fechamento de folha.");

      const result = await createAgendaEventAction(formData);
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();

      if (result.eventId) {
        createdEventIds.push(result.eventId);

        const created = await prisma.agendaEvent.findUnique({
          where: { id: result.eventId },
        });
        expect(created).toBeDefined();
        expect(created?.title).toBe("Treinamento Folha e eSocial");
        expect(created?.type).toBe("TREINAMENTO");
        expect(created?.location).toBe("Sala de Informática RH");
        expect(created?.responsibleName).toBe("Especialista em Folha Centi");
      }
    });

    it("exclui um compromisso com sucesso", async () => {
      mockCurrentUser = testUser;

      // Cria um evento rápido para teste de exclusão
      const created = await prisma.agendaEvent.create({
        data: {
          projectId,
          title: "Evento Temporário para Exclusão",
          type: "RITUAL",
          startDateTime: new Date("2026-09-16T08:00:00"),
          endDateTime: new Date("2026-09-16T08:30:00"),
          responsibleName: "Líder de Implantação",
        },
      });

      const deleteFormData = new FormData();
      deleteFormData.set("eventId", created.id);
      deleteFormData.set("projectId", projectId);

      const delResult = await deleteAgendaEventAction(deleteFormData);
      expect(delResult.success).toBe(true);

      const check = await prisma.agendaEvent.findUnique({
        where: { id: created.id },
      });
      expect(check).toBeNull();
    });
  });
});
