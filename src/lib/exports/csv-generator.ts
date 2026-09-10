/**
 * Sanitiza valores contra injeção de fórmulas em planilhas (CSV Injection).
 * Previne execução de comandos se o valor começar com '=', '+', '-', '@'.
 */
export function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Sanitização de injeção de fórmula
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // Escape de aspas duplas e envolvimento em aspas se contiver vírgula, quebra de linha ou aspas
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r") || str.startsWith("'")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Gera string CSV formatada em UTF-8 com BOM (\uFEFF) para compatibilidade nativa com Excel.
 */
export function generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const bom = "\uFEFF";
  const headerLine = headers.map(sanitizeCsvValue).join(",");
  const rowLines = rows.map((row) => row.map(sanitizeCsvValue).join(","));

  return bom + [headerLine, ...rowLines].join("\r\n");
}
