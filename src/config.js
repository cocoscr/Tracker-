/* ------------------------------------------------------------------ *
 *  CONFIG — le cose che cambierai più spesso stanno qui
 *  TEMA: Tron Legacy (ciano su nero, arancio Clu per i negativi)
 * ------------------------------------------------------------------ */

import {
  Zap, Wifi, Shield, User, Fuel, ShoppingCart, Utensils, Ticket, ParkingCircle,
  Sparkles, Dumbbell, Shirt, Briefcase, HeartPulse, Repeat, Home, Gift, Banknote,
  Plane, ArrowLeftRight, PiggyBank, Car, GraduationCap, CreditCard, Tag,
} from "lucide-react";

// ---- foglio Google ----
export const SHEET_ID = "1J36Imy-qTi4Ubr3s-CuzBcgzU1PGtDSQlsjE0Ap3zIY";

export const SHEET_TRANSAZIONI = "Transazioni";
export const SHEET_RICORRENTI = "Ricorrenti";        // opzionale
export const SHEET_PATRIMONIO = "Patrimonio";        // opzionale
export const SHEET_POSIZIONI = "Posizioni";          // opzionale
export const SHEET_STORICO = "Storico Patrimonio";   // opzionale

export const csvUrl = (nome) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nome)}`;

// ---- categorie escluse dal calcolo del risparmio ----
// (investire e spostare soldi tra conti propri non è "spendere")
export const CATEGORIE_NON_SPESA = ["PAC", "Trasferimento"];

/* ------------------------------------------------------------------ *
 *  TEMA — Tron Legacy
 *  bg/surface: nero bluastro, come la Griglia
 *  green  → ciano dei programmi "buoni" (usato per i valori positivi)
 *  coral  → arancio Clu (valori negativi, ritardi)
 *  amber  → oro dei circuiti (avvisi, PAC)
 *  blue   → ciano chiaro (investimenti)
 * ------------------------------------------------------------------ */
export const C = {
  bg: "#050A0F",
  surface: "#0A151D",
  surfaceAlt: "#0F2029",
  hairline: "#1A3D4D",
  ink: "#E8FBFF",
  inkMuted: "#6E94A5",
  paper: "#E8FBFF",
  paperInk: "#050A0F",
  paperMuted: "#4A7185",
  green: "#4DE2F7",
  coral: "#FF6A1A",
  amber: "#FFC947",
  blue: "#7DF9FF",
};

export const fontDisplay = "'Space Mono', ui-monospace, 'SF Mono', Menlo, monospace";
export const fontBody = "'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif";

// ---- icone per categoria: aggiungi qui le nuove categorie ----
const iconMap = {
  Bollette: Zap,
  Utenze: Wifi,
  Assicurazioni: Shield,
  "Spese Personali": User,
  Benzina: Fuel,
  "Cibo SM": ShoppingCart,
  "Mangiare fuori": Utensils,
  "Uscite & Svago": Ticket,
  "Pedaggi & Parcheggi": ParkingCircle,
  "Cura Personale": Sparkles,
  Sport: Dumbbell,
  Vestiti: Shirt,
  Lavoro: Briefcase,
  Salute: HeartPulse,
  Abbonamenti: Repeat,
  Casa: Home,
  Regali: Gift,
  Stipendio: Banknote,
  Trasferte: Plane,
  Trasferimento: ArrowLeftRight,
  PAC: PiggyBank,
  Macchina: Car,
  "Università": GraduationCap,
  "Carta di Credito": CreditCard,
};

export const iconFor = (cat) => iconMap[cat] || Tag;
