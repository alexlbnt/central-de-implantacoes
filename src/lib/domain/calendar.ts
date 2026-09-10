export interface HolidayItem {
  date: Date;
  description: string;
}

/**
 * Utilitário de Calendário Útil e Prazos no fuso do projeto (padrão: America/Sao_Paulo)
 */
export class ProjectCalendar {
  private holidays: Set<string>; // formato "YYYY-MM-DD"
  private timezone: string;

  constructor(holidays: HolidayItem[] = [], timezone = "America/Sao_Paulo") {
    this.timezone = timezone;
    this.holidays = new Set();

    for (const h of holidays) {
      const key = this.formatDateKey(h.date);
      this.holidays.add(key);
    }
  }

  /**
   * Converte data para string YYYY-MM-DD no fuso local do projeto
   */
  public formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /**
   * Verifica se uma data específica é dia útil (não é sábado, domingo ou feriado cadastrado)
   */
  public isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    const key = this.formatDateKey(date);
    if (this.holidays.has(key)) {
      return false;
    }

    return true;
  }

  /**
   * Adiciona N dias úteis a uma data inicial
   */
  public addBusinessDays(startDate: Date, businessDaysToAdd: number): Date {
    const result = new Date(startDate.getTime());
    let added = 0;

    while (added < businessDaysToAdd) {
      result.setDate(result.getDate() + 1);
      if (this.isBusinessDay(result)) {
        added++;
      }
    }

    return result;
  }

  /**
   * Conta a quantidade de dias úteis entre duas datas (inclusive data de início se for útil)
   */
  public countBusinessDaysBetween(startDate: Date, endDate: Date): number {
    if (startDate > endDate) {
      return 0;
    }

    let count = 0;
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    while (current <= end) {
      if (this.isBusinessDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Calcula dias corridos entre duas datas
   */
  public countCalendarDaysBetween(startDate: Date, endDate: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / msPerDay));
  }

  /**
   * Verifica se um impedimento consecutivo ultrapassou o limiar de dias úteis (ex: 3 dias úteis)
   */
  public hasExceededConsecutiveBusinessDays(
    startDate: Date,
    currentDate: Date = new Date(),
    thresholdDays = 3
  ): boolean {
    const businessDays = this.countBusinessDaysBetween(startDate, currentDate);
    // Para ter ultrapassado 3 dias úteis consecutivos, a contagem deve ser > thresholdDays
    return businessDays > thresholdDays;
  }
}
