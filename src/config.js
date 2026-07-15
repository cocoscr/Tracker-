// ---- config: sostituisci con il tuo Sheet ID se cambia ----
export const SHEET_ID = "1J36Imy-qTi4Ubr3s-CuzBcgzU1PGtDSQlsjE0Ap3zIY";
export const SHEET_NAME = "Transazioni";
// foglio opzionale nello stesso file: colonne "Categoria" e "Budget" per sovrascrivere i budget automatici
export const BUDGET_SHEET_NAME = "Budget";

export const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
export const BUDGET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(BUDGET_SHEET_NAME)}`;

// ---- modifica qui l'elenco delle categorie considerate spese FISSE ----
export const CATEGORIE_FISSE = ["Bollette", "Utenze", "Assicurazioni", "Abbonamenti", "Casa", "PAC", "Università"];

// ---- tema ----
export const C = {
  bg: "#0F1613",
  surface: "#171F1B",
  surfaceAlt: "#1D2622",
  hairline: "#2A3630",
  ink: "#F4F1E8",
  inkMuted: "#9CA8A1",
  paper: "#F7F3E9",
  paperInk: "#241F16",
  paperMuted: "#8A8073",
  green: "#4ADE80",
  coral: "#F2777B",
  amber: "#E8B44C",
};

export const fontDisplay = "'Space Mono', ui-monospace, 'SF Mono', Menlo, monospace";
export const fontBody = "'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif";

// colore stabile per ogni categoria (sempre lo stesso, ovunque)
const PALETTE = ["#E8B44C", "#7FB3D5", "#C39BD3", "#F7DC6F", "#82E0AA", "#F0B27A", "#76D7C4", "#F1948A", "#AED6F1", "#D7BDE2"];
export function colorFor(nome) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
