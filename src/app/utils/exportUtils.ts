import { format } from "date-fns";

type CellValue = string | number | null | undefined;

// ─────────────────────────────────────────────────────────
// PDF Export: opens a styled HTML page and triggers print()
// ─────────────────────────────────────────────────────────
export function exportToPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: CellValue[][],
  extraInfo?: Record<string, string>
): void {
  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm");

  const infoHTML = extraInfo
    ? `<div class="info-row">${Object.entries(extraInfo)
        .map(([k, v]) => `<div class="info-item"><strong>${k}:</strong> ${v}</div>`)
        .join("")}</div>`
    : "";

  const rowsHTML = rows
    .map(
      (row, i) =>
        `<tr class="${i % 2 === 0 ? "even" : "odd"}">${row
          .map((cell) => `<td>${cell ?? "—"}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title} — VetSystem</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 28px 32px; color: #1f2937; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid #f97316; padding-bottom: 16px; }
    .header-left h1 { margin-bottom: 4px; font-size: 22px; color: #c2410c; }
    .header-left h2 { font-size: 13px; color: #6b7280; font-weight: 400; }
    .header-right { text-align: right; font-size: 12px; color: #9ca3af; }
    .logo { font-size: 28px; margin-bottom: 4px; }
    .info-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .info-item { font-size: 13px; color: #374151; background: #fff7ed; padding: 5px 12px; border-radius: 6px; border: 1px solid #fed7aa; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    thead tr { background: #fff7ed; }
    th { padding: 8px 10px; text-align: left; color: #c2410c; border: 1px solid #fed7aa; text-transform: uppercase; letter-spacing: 0.03em; font-size: 11px; }
    td { padding: 7px 10px; border: 1px solid #e5e7eb; color: #374151; vertical-align: top; }
    tr.even td { background: #fff; }
    tr.odd td { background: #fffbf5; }
    .footer { margin-top: 16px; color: #9ca3af; font-size: 11px; text-align: right; border-top: 1px solid #f3f4f6; padding-top: 8px; }
    .total-row { font-size: 12px; color: #6b7280; margin-top: 8px; }
    @media print { body { padding: 12px 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">🐾</div>
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
    </div>
    <div class="header-right">
      <strong>VetSystem</strong><br/>
      Generado: ${dateStr}
    </div>
  </div>
  ${infoHTML}
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>
  <div class="total-row" style="margin-top:8px;">Total de registros: <strong>${rows.length}</strong></div>
  <div class="footer">VetSystem v2.0 — Sistema de Gestión Veterinaria © ${new Date().getFullYear()}</div>
  <script>setTimeout(function(){ window.print(); }, 700);</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=960,height=720");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}

// ─────────────────────────────────────────────────────────
// Excel Export: HTML table saved as .xls (opens in Excel)
// ─────────────────────────────────────────────────────────
export function exportToExcel(
  filename: string,
  headers: string[],
  rows: CellValue[][],
  sheetTitle?: string
): void {
  const title = sheetTitle || filename;
  const dateStr = format(new Date(), "dd/MM/yyyy HH:mm");

  const headersHTML = headers.map((h) => `<th>${h}</th>`).join("");
  const rowsHTML = rows
    .map(
      (row, i) =>
        `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#fff7ed"}">${row
          .map((cell) => `<td>${cell ?? ""}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; }
    h2 { color: #c2410c; margin-bottom: 4px; }
    p { color: #6b7280; font-size: 12px; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; padding: 6px 10px; font-size: 12px; text-align: left; }
    td { border: 1px solid #e5e7eb; padding: 5px 10px; font-size: 11px; }
  </style>
</head>
<body>
  <h2>🐾 VetSystem — ${title}</h2>
  <p>Exportado: ${dateStr} &nbsp;|&nbsp; Total: ${rows.length} registros</p>
  <table>
    <thead><tr style="background:#fff7ed">${headersHTML}</tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${format(new Date(), "ddMMyyyy_HHmm")}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────
// CSV Export (compatible with Excel)
// ─────────────────────────────────────────────────────────
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: CellValue[][]
): void {
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${format(new Date(), "ddMMyyyy_HHmm")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
