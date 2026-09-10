import { describe, it, expect } from "vitest";
import { ProjectCalendar, HolidayItem } from "../../src/lib/domain/calendar";

describe("Calendário de Dias Úteis, Feriados e Prazos", () => {
  const holidays: HolidayItem[] = [
    // 07 de Setembro - Independência do Brasil (segunda-feira em 2026)
    { date: new Date(2026, 8, 7), description: "Independência do Brasil" },
    // Feriado Municipal fictício em 15 de Setembro de 2026 (terça-feira)
    { date: new Date(2026, 8, 15), description: "Aniversário do Município de São Patrício" },
  ];

  const calendar = new ProjectCalendar(holidays, "America/Sao_Paulo");

  it("[Critério 17] Deve identificar corretamente sábado e domingo como dias não úteis", () => {
    const saturday = new Date(2026, 8, 12); // 12/09/2026 é Sábado
    const sunday = new Date(2026, 8, 13);   // 13/09/2026 é Domingo
    const monday = new Date(2026, 8, 14);   // 14/09/2026 é Segunda-feira

    expect(calendar.isBusinessDay(saturday)).toBe(false);
    expect(calendar.isBusinessDay(sunday)).toBe(false);
    expect(calendar.isBusinessDay(monday)).toBe(true);
  });

  it("[Critério 17] Feriado cadastrado no projeto deve ser tratado como dia não útil", () => {
    const holidayDate = new Date(2026, 8, 15); // Terça-feira com feriado municipal
    const normalDay = new Date(2026, 8, 16);   // Quarta-feira normal

    expect(calendar.isBusinessDay(holidayDate)).toBe(false);
    expect(calendar.isBusinessDay(normalDay)).toBe(true);
  });

  it("[Critério 17] Adição de dias úteis deve pular fim de semana e feriados cadastrados", () => {
    // Sexta-feira, 11/09/2026
    const friday = new Date(2026, 8, 11);

    // +1 dia útil a partir de sexta 11/09 deve cair na segunda 14/09
    const next1 = calendar.addBusinessDays(friday, 1);
    expect(next1.getDate()).toBe(14);

    // +2 dias úteis a partir de sexta 11/09:
    // dia útil 1 = seg 14/09
    // ter 15/09 é feriado municipal (não conta!)
    // dia útil 2 = qua 16/09
    const next2 = calendar.addBusinessDays(friday, 2);
    expect(next2.getDate()).toBe(16);
  });

  it("[Critério 17] Verificação de impedimento consecutivo > 3 dias úteis", () => {
    // Início na quarta-feira 09/09/2026
    const startWednesday = new Date(2026, 8, 9);

    // Na sexta-feira 11/09: quarta, quinta, sexta = 3 dias úteis (ainda NÃO é > 3)
    const friday11 = new Date(2026, 8, 11);
    expect(calendar.hasExceededConsecutiveBusinessDays(startWednesday, friday11, 3)).toBe(false);

    // Na segunda-feira 14/09: quarta(1), quinta(2), sexta(3), segunda(4) = 4 dias úteis (> 3)
    const monday14 = new Date(2026, 8, 14);
    expect(calendar.hasExceededConsecutiveBusinessDays(startWednesday, monday14, 3)).toBe(true);
  });
});
