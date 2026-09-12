/* ------------------------------------------------------------------ *
 *  UTILS — parsing e formattazione
 * ------------------------------------------------------------------ */

// Importi in formato italiano ("€ 1.234,56") o inglese ("€ 1,234.56").
// Riconosce il separatore decimale dalla posizione di ultima virgola / ultimo punto.
export function parseImporto(str) {
  if (str === null || str === undefined) return 0;
  const raw = String(str).trim();
  if (!raw) return 0;
  const negative = raw.startsWith("-") || /^\(.*\)$/.test(raw);
  const clean = raw.replace(/[^0-9.,]/g, "");
  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  let normalized;
  if (lastComma > lastDot) normalized = clean.replace(/\./g, "").replace(/,/g, ".");
  else if (lastDot > lastComma) normalized = clean.replace(/,/g, "");
  else normalized = clean;
  const val = Math.abs(parseFloat(normalized)) || 0;
  return negative ? -val : val;
}

// Alias: stesso parser, nome più chiaro quando il valore non è un movimento
export const parseNumber = parseImporto;

// "dd/MM/yyyy" -> Date (null se non parsabile)
export function parseData(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const anno = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(anno, Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

// Date -> "set 2026", lo stesso formato della colonna I ("Mese") del foglio.
// Serve come fallback: la colonna I è una formula che sulle righe appena
// scritte dal comando rapido NFC può essere ancora vuota (la riempie il
// trigger orario di manutenzione.gs). Senza fallback l'ultima transazione
// sparirebbe dalla dashboard per un'ora.
const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
export function meseDaData(d) {
  if (!d || isNaN(d.getTime())) return "";
  return `${MESI_BREVI[d.getMonth()]} ${d.getFullYear()}`;
}

export const euro = (n) =>
  Math.abs(Number(n) || 0).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Versione compatta per gli assi dei grafici: 12.400 -> "12,4k"
export const euroCompact = (n) => {
  const v = Number(n) || 0;
  return Math.abs(v) >= 1000
    ? (v / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 }) + "k"
    : Math.round(v).toString();
};

// Normalizza una descrizione per confrontarla (via accenti, spazi, maiuscole)
export const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");

export const giorniNelMese = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
