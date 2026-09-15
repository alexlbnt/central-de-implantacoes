/**
 * Utilitários centralizados de data e hora para a Central de Implantações Centi.
 * Garante consistência absoluta de fuso horário (America/Sao_Paulo / UTC-3)
 * entre Server Actions, SSR e Client Components.
 */

export const APP_TIMEZONE = "America/Sao_Paulo";
export const APP_TIMEZONE_OFFSET = "-03:00";

/**
 * Converte data e hora locais (ex: "2026-09-15" e "14:30") para um objeto Date UTC
 * com o deslocamento estrito do fuso horário de referência Centi (-03:00).
 */
export function parseDateTimeInAppTimezone(dateStr: string, timeStr: string): Date {
  const cleanDate = dateStr?.trim();
  const cleanTime = timeStr?.trim();

  if (!cleanDate || !cleanTime) {
    throw new Error("Data e horário são obrigatórios.");
  }

  const normalizedTime = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
  const isoWithOffset = `${cleanDate}T${normalizedTime}${APP_TIMEZONE_OFFSET}`;
  const dt = new Date(isoWithOffset);

  if (isNaN(dt.getTime())) {
    throw new Error(`Formato de data ou horário inválido: ${cleanDate} ${cleanTime}`);
  }

  return dt;
}

/**
 * Formata horário de um evento no padrão "HH:mm" (24 horas)
 * sempre no fuso horário oficial da aplicação (America/Sao_Paulo).
 */
export function formatEventTime(dt: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIMEZONE,
  }).format(new Date(dt));
}

/**
 * Retorna a chave de data no formato "YYYY-MM-DD"
 * sempre no fuso horário oficial da aplicação (America/Sao_Paulo).
 */
export function formatEventDateKey(dt: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(new Date(dt));
}

/**
 * Retorna a data no formato brasileiro "DD/MM/AAAA"
 * sempre no fuso horário oficial da aplicação (America/Sao_Paulo).
 */
export function formatEventDateDisplay(dt: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  }).format(new Date(dt));
}

/**
 * Retorna a data atual local (hoje) no formato "YYYY-MM-DD"
 * respeitando o fuso horário oficial da aplicação (America/Sao_Paulo).
 * Evita que new Date().toISOString() pule para o dia seguinte à noite.
 */
export function getTodayDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(new Date());
}
