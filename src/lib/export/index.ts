/** Exportação de dados — CSV / Excel-like / PDF texto */

export type ExportRow = Record<string, string | number | null | undefined>;

export function toCSV(rows: ExportRow[], columns: { key: string; header: string }[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.header)).join(";");
  const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(";")).join("\n");
  return `\uFEFF${header}\n${body}`;
}

/** Gera conteúdo tipo Excel (TSV) aberto pelo Excel/LibreOffice */
export function toExcelTSV(rows: ExportRow[], columns: { key: string; header: string }[]): string {
  const header = columns.map((c) => c.header).join("\t");
  const body = rows
    .map((r) => columns.map((c) => String(r[c.key] ?? "").replace(/\t/g, " ")).join("\t"))
    .join("\n");
  return `${header}\n${body}`;
}

export function toSimplePdfText(title: string, lines: string[]): string {
  // PDF mínimo válido (texto) — suficiente para export demo; substituir por pdf-lib depois
  const content = [title, "", ...lines].join("\n");
  const escaped = content.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = `BT /F1 12 Tf 50 750 Td (${escaped.replace(/\n/g, ") Tj T* (")}) Tj ET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj + "\n";
  }
  const xref = offsets.length - 1;
  const startxref = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${offsets.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  void xref;
  return pdf;
}
