// Parsa importi sia in formato italiano ("€ 1.234,56") che inglese ("€ 1,234.56" / "€ 12.04").
// Il segno viene dedotto dal Tipo, non dal testo: Spesa/Uscita = negativo, Entrata = positivo.
export function parseImporto(str, tipo) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9.,]/g, "");
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized;
  if (lastComma > lastDot) normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
  else if (lastDot > lastComma) normalized = cleaned.replace(/,/g, "");
  else normalized = cleaned;
  const val = Math.abs(parseFloat(normalized) || 0);
  return /spesa|uscita/i.test(tipo || "") ? -val : val;
}

// Deriva il mese direttamente dalla colonna Data, così etichette
// come "lug 2026" e "Jul 2026" non possono più risultare mesi distinti.
export const MESI_ABBR = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export function parseDataOggetto(str) {
  const s = String(str || "").trim();
  // formato gviz: Date(2026,3,15) — il mese è 0-based
  const gv = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})/.exec(s);
  if (gv) return new Date(parseInt(gv[1], 10), parseInt(gv[2], 10), parseInt(gv[3], 10));
  // formato ISO: 2026-04-15 (o 2026/04/15)
  const iso = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/.exec(s);
  if (iso) {
    const a = parseInt(iso[1], 10), me = parseInt(iso[2], 10), g = parseInt(iso[3], 10);
    if (me >= 1 && me <= 12) return new Date(a, me - 1, g);
    return null;
  }
  // formato italiano: 15/04/2026 o 15/04/26
  const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s);
  if (!m) return null;
  const g = parseInt(m[1], 10), me = parseInt(m[2], 10);
  let a = parseInt(m[3], 10);
  if (a < 100) a += 2000;
  if (me < 1 || me > 12) return null;
  return new Date(a, me - 1, g);
}

export const meseAbbrLabel = (d) => (d ? `${MESI_ABBR[d.getMonth()]} ${d.getFullYear()}` : "");

// paracadute: se la Data non si legge, normalizza l'etichetta della colonna "Mese" del foglio
export function meseDaEtichetta(label) {
  const { meseIdx, anno } = infoMese(label || "");
  if (meseIdx === -1 || !anno) return "";
  return `${MESI_ABBR[meseIdx]} ${anno}`;
}

export const euro = (n) =>
  Math.abs(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const euro0 = (n) =>
  Math.abs(n).toLocaleString("it-IT", { maximumFractionDigits: 0 });

// ---- mesi: riconosce "gennaio 2026", "Gen", "01/2026" e ordina ----
export const MESI_IT = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export function infoMese(label) {
  const lower = (label || "").toLowerCase();
  let meseIdx = MESI_IT.findIndex((n) => lower.startsWith(n.slice(0, 3)) || lower.includes(n));
  if (meseIdx === -1) {
    const num = lower.match(/(?:^|\D)(0?[1-9]|1[0-2])(?:\D|$)/);
    if (num) meseIdx = parseInt(num[1], 10) - 1;
  }
  const yearMatch = lower.match(/(20\d{2})/);
  const anno = yearMatch ? parseInt(yearMatch[1], 10) : null;
  return { meseIdx, anno };
}

export function chiaveOrdinamentoMese(label, fallbackIndex) {
  const { meseIdx, anno } = infoMese(label);
  if (meseIdx === -1) return 100000 + fallbackIndex;
  return (anno || 0) * 12 + meseIdx;
}

// giorno del mese da una data tipo "15/03/2026", "15-3-26" o "2026-03-15"
export function parseGiorno(dataStr) {
  if (!dataStr) return null;
  const iso = String(dataStr).match(/^\s*(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (iso) return parseInt(iso[3], 10);
  const it = String(dataStr).match(/^\s*(\d{1,2})[\/\-.](\d{1,2})/);
  if (it) return parseInt(it[1], 10);
  return null;
}
