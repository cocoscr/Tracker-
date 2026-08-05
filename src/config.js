/* ------------------------------------------------------------------ *
 *  CONFIG — le cose che cambierai più spesso stanno qui
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
  blue: "#7FB3D5",
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
