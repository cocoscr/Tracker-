import React from "react";
import {
  Wallet, RefreshCw, Loader2, AlertCircle, Info,
  ArrowUpRight, ArrowDownRight, ArrowDownLeft, ArrowLeftRight, ChevronRight, X,
  CheckCircle2, AlertTriangle,
  Zap, Shield, User, Fuel, ShoppingCart, Briefcase, HeartPulse, Repeat,
  Home, Gift, Banknote, Plane, PiggyBank, Car, GraduationCap, CreditCard, Tag,
} from "lucide-react";

// Mappa nome → componente, con gli alias storici (nomi vecchi/nuovi di lucide)
const MAPPA = {
  Wallet, RefreshCw,
  Loader2, LoaderCircle: Loader2,
  AlertCircle, CircleAlert: AlertCircle,
  Info,
  ArrowUpRight, ArrowDownRight, ArrowDownLeft, ArrowLeftRight, ChevronRight, X,
  CheckCircle2, CheckCircle: CheckCircle2, CircleCheck: CheckCircle2,
  AlertTriangle, TriangleAlert: AlertTriangle,
  Zap, Shield, User, Fuel, ShoppingCart, Briefcase, HeartPulse, Repeat,
  Home, House: Home,
  Gift, Banknote, Plane, PiggyBank, Car, GraduationCap, CreditCard, Tag,
};

export function Icona({ nomi, size = 16, className = "", style = {} }) {
  for (const n of nomi) {
    const Comp = MAPPA[n];
    if (Comp) return <Comp size={size} className={className} style={style} strokeWidth={2} />;
  }
  return <span style={{ fontSize: size * 0.8, lineHeight: 1, ...style }} className={className}>●</span>;
}

// icone per categoria di spesa
const iconMap = {
  "Bollette": ["Zap"], "Utenze": ["Repeat"], "Assicurazioni": ["Shield"], "Spese Personali": ["User"],
  "Benzina": ["Fuel"], "Cibo SM": ["ShoppingCart"], "Lavoro": ["Briefcase"],
  "Salute": ["HeartPulse"], "Abbonamenti": ["Repeat"], "Casa": ["House", "Home"],
  "Regali": ["Gift"], "Stipendio": ["Banknote"], "Trasferte": ["Plane"],
  "PAC": ["PiggyBank"], "Macchina": ["Car"], "Università": ["GraduationCap"],
  "Carta di Credito": ["CreditCard"],
};
export const iconeFor = (cat) => iconMap[cat] || ["Tag"];
