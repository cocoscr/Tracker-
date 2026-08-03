import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  Sector,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  User,
  Fuel,
  ShoppingCart,
  Briefcase,
  HeartPulse,
  Repeat,
  Home,
  Gift,
  Banknote,
  Plane,
  PiggyBank,
  Car,
  GraduationCap,
  CreditCard,
  Tag,
  Loader2,
  AlertCircle,
  PieChart as PieChartIcon,
  CalendarClock,
  TrendingUp,
  ChevronRight,
  X,
  Check,
  Clock,
  Wifi,
  Utensils,
  Sparkles,
  Dumbbell,
  Shirt,
  Ticket,
  ParkingCircle,
  ArrowLeftRight,
  Receipt,
  Landmark,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  CONFIG
 * ------------------------------------------------------------------ */
const SHEET_ID = "1J36Imy-qTi4Ubr3s-CuzBcgzU1PGtDSQlsjE0Ap3zIY";
const SHEET_TRANSAZIONI = "Transazioni";
const SHEET_RICORRENTI = "Ricorrenti";
const SHEET_CONTI = "Conti";

const csvUrl = (nome) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    nome
  )}`;

/* ------------------------------------------------------------------ *
 *  DESIGN TOKENS
 * ------------------------------------------------------------------ */
const C = {
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
const fontDisplay = "'Space Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const fontBody = "'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif";

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
const iconFor = (cat) => iconMap[cat] || Tag;

/* ------------------------------------------------------------------ *
 *  COLORI CATEGORIE
 *  Mappa fissa per le categorie note: il colore di una categoria resta
 *  lo stesso in ogni mese. Per le categorie non in elenco si usa un hash
 *  deterministico sul nome, così anche quelle restano stabili nel tempo.
 * ------------------------------------------------------------------ */
const palette = [
  "#E8B44C", // ambra
  "#4ADE80", // verde
  "#F2777B", // corallo
  "#5EC8E5", // azzurro
  "#B692F6", // viola
  "#F4A261", // arancio
  "#7DD3A0", // menta
  "#E879A6", // rosa
  "#94B8F0", // blu chiaro
  "#D9C77E", // sabbia
  "#6EE7D3", // acqua
  "#F0906A", // terracotta
];

const coloriCategoria = {
  Bollette: "#E8B44C",
  Utenze: "#5EC8E5",
  Assicurazioni: "#94B8F0",
  "Spese Personali": "#B692F6",
  Benzina: "#F0906A",
  "Cibo SM": "#4ADE80",
  "Mangiare fuori": "#7DD3A0",
  "Uscite & Svago": "#E879A6",
  "Pedaggi & Parcheggi": "#D9C77E",
  "Cura Personale": "#6EE7D3",
  Sport: "#F4A261",
  Vestiti: "#F2777B",
  Lavoro: "#94B8F0",
  Salute: "#F2777B",
  Abbonamenti: "#B692F6",
  Casa: "#E8B44C",
  Regali: "#E879A6",
  Trasferte: "#5EC8E5",
  Trasferimento: "#9CA8A1",
  PAC: "#7DD3A0",
  Macchina: "#F0906A",
  "Università": "#94B8F0",
  "Carta di Credito": "#D9C77E",
};

function coloreFor(nome) {
  if (coloriCategoria[nome]) return coloriCategoria[nome];
  let h = 0;
  const s = String(nome || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return palette[h % palette.length];
}

/* ------------------------------------------------------------------ *
 *  UTILS
 * ------------------------------------------------------------------ */
function parseImporto(str) {
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

// "dd/MM/yyyy" -> Date (null se non parsabile)
function parseData(str) {
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

const euro = (n) =>
  Math.abs(Number(n) || 0).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const euroCompatto = (n) => {
  const v = Math.abs(Number(n) || 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")}k` : Math.round(v).toString();
};

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");

const giorniNelMese = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

/* ------------------------------------------------------------------ *
 *  DATA LAYER
 * ------------------------------------------------------------------ */
function fetchCsv(nome) {
  return fetch(csvUrl(nome)).then((res) => {
    if (!res.ok) throw new Error(`Foglio "${nome}" non leggibile`);
    return res.text();
  });
}

function useSheetData() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    rows: [],
    ricorrenti: [],
    ricorrentiOk: false,
    conti: [],
    contiOk: false,
  });

  useEffect(() => {
    let cancelled = false;

    const pTx = fetchCsv(SHEET_TRANSAZIONI).then((csv) => {
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      return parsed.data
        .map((r) => ({
          data: r["Data"],
          dataObj: parseData(r["Data"]),
          tipo: (r["Tipo"] || "").trim(),
          descrizione: r["Descrizione"] || "",
          categoria: (r["Categoria"] || "Altro").trim() || "Altro",
          metodo: r["Metodo"],
          conto: r["Conto"],
          importo: parseImporto(r["importo ricalcolato"] ?? r["Importo"]),
          mese: (r["Mese"] || "").trim(),
        }))
        .filter((r) => r.tipo === "Spesa" || r.tipo === "Entrata");
    });

    // Il tab Ricorrenti è opzionale: se manca, la dashboard funziona lo stesso.
    // Attenzione: se il tab non esiste, Google NON dà errore — restituisce il primo
    // foglio del file. Va quindi verificato che le intestazioni siano quelle giuste.
    const pRic = fetchCsv(SHEET_RICORRENTI)
      .then((csv) => {
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        const cols = (parsed.meta?.fields || []).map((f) => String(f).trim().toLowerCase());
        const valido = ["descrizione", "importo", "giorno"].every((c) => cols.includes(c));
        if (!valido) return { ok: false, list: [] };
        return {
          ok: true,
          list: parsed.data
            .map((r) => ({
              descrizione: (r["Descrizione"] || "").trim(),
              importo: Math.abs(parseImporto(r["Importo"])),
              giorno: Math.min(31, Math.max(1, parseInt(r["Giorno"], 10) || 1)),
              categoria: (r["Categoria"] || "Altro").trim() || "Altro",
              attivo: !/^(no|false|0|n)$/i.test(String(r["Attivo"] ?? "si").trim()),
              note: (r["Note"] || "").trim(),
            }))
            .filter((r) => r.descrizione && r.attivo && r.importo > 0),
        };
      })
      .catch(() => ({ ok: false, list: [] }));

    // Il tab Conti è opzionale, stessa trappola gviz del tab Ricorrenti:
    // se non esiste torna il primo foglio, quindi si validano le intestazioni.
    const pConti = fetchCsv(SHEET_CONTI)
      .then((csv) => {
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        const cols = (parsed.meta?.fields || []).map((f) => String(f).trim().toLowerCase());
        const valido = ["conto", "saldo"].every((c) => cols.includes(c));
        if (!valido) return { ok: false, list: [] };
        return {
          ok: true,
          list: parsed.data
            .map((r) => ({
              conto: (r["Conto"] || "").trim(),
              saldo: parseImporto(r["Saldo"]),
              aggiornato: (r["Aggiornato il"] || r["Aggiornato"] || "").trim(),
            }))
            .filter((r) => r.conto),
        };
      })
      .catch(() => ({ ok: false, list: [] }));

    Promise.all([pTx, pRic, pConti])
      .then(([rows, ric, cnt]) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          rows,
          ricorrenti: ric.list,
          ricorrentiOk: ric.ok,
          conti: cnt.list,
          contiOk: cnt.ok,
        });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            loading: false,
            error: err.message,
            rows: [],
            ricorrenti: [],
            ricorrentiOk: false,
            conti: [],
            contiOk: false,
          });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/* ------------------------------------------------------------------ *
 *  BOTTOM SHEET
 * ------------------------------------------------------------------ */
function BottomSheet({ open, title, subtitle, onClose, children }) {
  const [drag, setDrag] = useState(0);
  const startY = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) setDrag(0);
  }, [open]);

  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDrag(dy);
  };
  const onTouchEnd = () => {
    if (drag > 110) onClose();
    else setDrag(0);
    startY.current = null;
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(6,10,9,0.62)", backdropFilter: "blur(3px)" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 620,
          maxHeight: "86vh",
          display: "flex",
          flexDirection: "column",
          background: C.surface,
          borderTop: `1px solid ${C.hairline}`,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          transform: `translateY(${drag}px)`,
          transition: startY.current === null ? "transform 260ms cubic-bezier(0.32,0.72,0,1)" : "none",
          animation: "sheetUp 300ms cubic-bezier(0.32,0.72,0,1)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ padding: "10px 20px 4px", cursor: "grab", touchAction: "none" }}
        >
          <div style={{ width: 38, height: 4, borderRadius: 2, background: C.hairline, margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.ink, fontFamily: fontBody, fontWeight: 700, fontSize: "1.05rem" }}>{title}</div>
              {subtitle && (
                <div style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.78rem", marginTop: 2 }}>
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Chiudi"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: C.surfaceAlt,
                color: C.inkMuted,
                border: "none",
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 20px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  COMPONENTI HOME
 * ------------------------------------------------------------------ */
function MiniStat({ label, value, tone, icon: Icon, onClick }) {
  const contenuto = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          color: C.inkMuted,
          fontFamily: fontBody,
          fontSize: "0.68rem",
          letterSpacing: "0.05em",
          marginBottom: 3,
        }}
      >
        <Icon size={12} />
        {label}
        {onClick && <ChevronRight size={11} style={{ marginLeft: -2 }} />}
      </div>
      <div style={{ color: tone, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.98rem" }}>€ {euro(value)}</div>
    </>
  );
  if (!onClick) return <div style={{ flex: 1, minWidth: 0 }}>{contenuto}</div>;
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        textAlign: "left",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      {contenuto}
    </button>
  );
}

/* Riga singola transazione (pannelli Transazioni ed Entrate) */
function TransazioneRow({ t }) {
  const Icon = iconFor(t.categoria);
  const entrata = t.tipo === "Entrata";
  const colore = entrata ? C.green : coloreFor(t.categoria);
  const dataLabel = t.dataObj
    ? t.dataObj.toLocaleDateString("it-IT", { day: "numeric", month: "short" })
    : t.data || "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: `1px solid ${C.hairline}`,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.surfaceAlt,
          color: colore,
          flexShrink: 0,
        }}
      >
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: C.ink,
            fontFamily: fontBody,
            fontWeight: 600,
            fontSize: "0.87rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {t.descrizione || t.categoria}
        </div>
        <div style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.72rem", marginTop: 2 }}>
          {dataLabel} · {t.categoria}
        </div>
      </div>
      <div
        style={{
          color: entrata ? C.green : C.ink,
          fontFamily: fontDisplay,
          fontWeight: 700,
          fontSize: "0.87rem",
          whiteSpace: "nowrap",
        }}
      >
        {entrata ? "+" : "−"} € {euro(t.importo)}
      </div>
    </div>
  );
}

function Tile({ icon: Icon, titolo, sub, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        width: "100%",
        borderRadius: 18,
        padding: "16px 16px 14px",
        background: C.surface,
        border: `1px solid ${C.hairline}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.surfaceAlt,
          color: accent || C.amber,
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.ink, fontFamily: fontBody, fontWeight: 600, fontSize: "0.95rem" }}>{titolo}</div>
        <div style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.76rem", marginTop: 2 }}>{sub}</div>
      </div>
      <ChevronRight size={17} style={{ color: C.inkMuted, flexShrink: 0 }} />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 *  PANNELLO CATEGORIE — torta interattiva
 * ------------------------------------------------------------------ */

// Fetta "estratta" quando la categoria è selezionata.
function ActiveSlice(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 9}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.45}
      />
    </g>
  );
}

function CategoryDonut({ dati, selezionata, onSelect, totale }) {
  const idxSel = selezionata ? dati.findIndex((d) => d.nome === selezionata) : -1;
  const attiva = idxSel >= 0 ? dati[idxSel] : null;
  const pct = attiva && totale > 0 ? Math.round((attiva.valore / totale) * 100) : 0;

  return (
    <div style={{ position: "relative", height: 232, marginBottom: 4 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie
            data={dati}
            dataKey="valore"
            nameKey="nome"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={dati.length > 1 ? 2 : 0}
            stroke="none"
            startAngle={90}
            endAngle={-270}
            activeIndex={idxSel >= 0 ? idxSel : undefined}
            activeShape={ActiveSlice}
            animationDuration={420}
            onClick={(_, i) => onSelect(dati[i]?.nome)}
            style={{ cursor: "pointer", outline: "none" }}
          >
            {dati.map((d) => (
              <Cell
                key={d.nome}
                fill={coloreFor(d.nome)}
                fillOpacity={idxSel < 0 || d.nome === selezionata ? 1 : 0.22}
                style={{ outline: "none", transition: "fill-opacity 200ms" }}
              />
            ))}
          </Pie>
        </RePieChart>
      </ResponsiveContainer>

      {/* etichetta al centro */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          padding: "0 70px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: C.inkMuted,
            fontSize: "0.62rem",
            letterSpacing: "0.08em",
            marginBottom: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {attiva ? attiva.nome.toUpperCase() : "TOTALE SPESE"}
        </div>
        <div
          style={{
            color: attiva ? coloreFor(attiva.nome) : C.ink,
            fontFamily: fontDisplay,
            fontWeight: 700,
            fontSize: attiva ? "1.24rem" : "1.34rem",
            lineHeight: 1.1,
          }}
        >
          € {euro(attiva ? attiva.valore : totale)}
        </div>
        <div style={{ color: C.inkMuted, fontSize: "0.68rem", marginTop: 3 }}>
          {attiva ? `${pct}% del mese` : `${dati.length} categorie`}
        </div>
      </div>
    </div>
  );
}

// Riga di legenda. Barra colorata visibile solo quando la categoria è selezionata.
function CategoryRow({ c, max, selezionata, spenta, onSelect }) {
  const Icon = iconFor(c.nome);
  const colore = coloreFor(c.nome);
  const pct = max > 0 ? Math.round((c.valore / max) * 100) : 0;

  return (
    <button
      onClick={() => onSelect(c.nome)}
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 10px",
        marginBottom: 2,
        borderRadius: 14,
        border: `1px solid ${selezionata ? `${colore}55` : "transparent"}`,
        background: selezionata ? `${colore}14` : "transparent",
        opacity: spenta ? 0.4 : 1,
        transition: "background 180ms, opacity 180ms, border-color 180ms",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: selezionata ? colore : C.surfaceAlt,
          color: selezionata ? C.bg : colore,
          flexShrink: 0,
          transition: "background 180ms, color 180ms",
        }}
      >
        <Icon size={15} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "0.87rem" }}>
          <span
            style={{
              color: C.ink,
              fontFamily: fontBody,
              fontWeight: selezionata ? 700 : 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.nome}
          </span>
          <span style={{ color: selezionata ? colore : C.inkMuted, fontFamily: fontDisplay, whiteSpace: "nowrap" }}>
            € {euro(c.valore)}
          </span>
        </div>

        {/* la barra compare solo sulla riga selezionata */}
        <div
          style={{
            height: selezionata ? 6 : 0,
            marginTop: selezionata ? 6 : 0,
            borderRadius: 999,
            overflow: "hidden",
            background: C.hairline,
            transition: "height 200ms, margin-top 200ms",
          }}
        >
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: colore }} />
        </div>
      </div>
    </button>
  );
}

function TrendCategoria({ nome, dati }) {
  const colore = coloreFor(nome);
  const conValore = dati.filter((d) => d.valore > 0);
  const media = conValore.length ? conValore.reduce((s, d) => s + d.valore, 0) / conValore.length : 0;
  const ultimo = dati.length ? dati[dati.length - 1].valore : 0;
  const delta = media > 0 ? Math.round(((ultimo - media) / media) * 100) : 0;

  return (
    <div
      style={{
        marginTop: 14,
        padding: "14px 14px 8px",
        borderRadius: 16,
        background: C.surfaceAlt,
        border: `1px solid ${C.hairline}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: C.inkMuted, fontSize: "0.68rem", letterSpacing: "0.06em" }}>
          ANDAMENTO · ULTIMI {dati.length} MESI
        </span>
        {media > 0 && (
          <span style={{ color: C.inkMuted, fontSize: "0.7rem", fontFamily: fontDisplay }}>
            media € {euro(media)}
          </span>
        )}
      </div>

      <div style={{ height: 132 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dati} margin={{ top: 4, right: 4, left: -26, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke={C.hairline} vertical={false} />
            <XAxis
              dataKey="mese"
              stroke={C.inkMuted}
              tick={{ fontSize: 10, fontFamily: fontBody }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              stroke={C.inkMuted}
              tick={{ fontSize: 10, fontFamily: fontBody }}
              axisLine={false}
              tickLine={false}
              width={46}
              tickFormatter={euroCompatto}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: C.surface,
                border: `1px solid ${C.hairline}`,
                borderRadius: 10,
                fontFamily: fontBody,
                fontSize: 12,
              }}
              labelStyle={{ color: C.ink }}
              formatter={(v) => [`€ ${euro(v)}`, nome]}
            />
            <Bar dataKey="valore" radius={[5, 5, 0, 0]} animationDuration={420}>
              {dati.map((d, i) => (
                <Cell key={d.mese} fill={colore} fillOpacity={i === dati.length - 1 ? 1 : 0.42} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {media > 0 && dati.length > 1 && (
        <div
          style={{
            color: delta > 0 ? C.coral : delta < 0 ? C.green : C.inkMuted,
            fontSize: "0.74rem",
            padding: "8px 2px 4px",
          }}
        >
          {delta > 0
            ? `Questo mese ${delta}% sopra la media`
            : delta < 0
            ? `Questo mese ${Math.abs(delta)}% sotto la media`
            : "In linea con la media"}
        </div>
      )}
    </div>
  );
}

function RicorrenteRow({ r }) {
  const Icon = iconFor(r.categoria);
  const stato =
    r.stato === "pagata"
      ? { label: "Pagata", color: C.green, Ico: Check }
      : r.stato === "ritardo"
      ? { label: "In ritardo", color: C.coral, Ico: AlertCircle }
      : { label: `Il ${r.giorno}`, color: C.amber, Ico: Clock };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 0",
        borderBottom: `1px solid ${C.hairline}`,
        opacity: r.stato === "pagata" ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.surfaceAlt,
          color: stato.color,
          flexShrink: 0,
        }}
      >
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: C.ink,
            fontFamily: fontBody,
            fontWeight: 600,
            fontSize: "0.88rem",
            textDecoration: r.stato === "pagata" ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.descrizione}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: stato.color,
            fontFamily: fontBody,
            fontSize: "0.72rem",
            marginTop: 2,
          }}
        >
          <stato.Ico size={11} />
          {stato.label} · {r.categoria}
        </div>
      </div>
      <div style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.88rem", whiteSpace: "nowrap" }}>
        € {euro(r.importo)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  APP
 * ------------------------------------------------------------------ */
export default function Dashboard() {
  const { loading, error, rows, ricorrenti, ricorrentiOk, conti, contiOk } = useSheetData();
  const [panel, setPanel] = useState(null);
  const [catSel, setCatSel] = useState(null);

  const closePanel = useCallback(() => {
    setPanel(null);
    setCatSel(null);
  }, []);

  // tap sulla stessa categoria = deseleziona
  const toggleCat = useCallback((nome) => {
    if (!nome) return;
    setCatSel((prev) => (prev === nome ? null : nome));
  }, []);

  const oggi = useMemo(() => new Date(), []);

  const mesiDisponibili = useMemo(
    () => [...new Set(rows.map((r) => r.mese))].filter(Boolean),
    [rows]
  );

  const [mese, setMese] = useState(null);
  useEffect(() => {
    if (!mese && mesiDisponibili.length > 0) setMese(mesiDisponibili[mesiDisponibili.length - 1]);
  }, [mesiDisponibili, mese]);

  // cambiando mese la selezione non ha più senso
  useEffect(() => {
    setCatSel(null);
  }, [mese]);

  const isMeseCorrente = mese && mese === mesiDisponibili[mesiDisponibili.length - 1];

  const righeMese = useMemo(() => rows.filter((r) => r.mese === mese), [rows, mese]);

  const entrate = useMemo(
    () => righeMese.filter((r) => r.tipo === "Entrata").reduce((s, r) => s + Math.abs(r.importo), 0),
    [righeMese]
  );
  const speso = useMemo(
    () => righeMese.filter((r) => r.tipo === "Spesa").reduce((s, r) => s + Math.abs(r.importo), 0),
    [righeMese]
  );

  // --- spese ricorrenti: stato pagata / in ritardo / in arrivo -------------
  const ricorrentiStato = useMemo(() => {
    if (!isMeseCorrente) return [];
    const descMese = righeMese.filter((r) => r.tipo === "Spesa").map((r) => norm(r.descrizione));
    const maxGiorno = giorniNelMese(oggi);
    const giornoOggi = oggi.getDate();
    return ricorrenti
      .map((r) => {
        const key = norm(r.descrizione);
        const pagata = key.length >= 3 && descMese.some((d) => d.includes(key) || key.includes(d));
        const giorno = Math.min(r.giorno, maxGiorno);
        const stato = pagata ? "pagata" : giorno < giornoOggi ? "ritardo" : "attesa";
        return { ...r, giorno, stato };
      })
      .sort((a, b) => {
        const ord = { ritardo: 0, attesa: 1, pagata: 2 };
        return ord[a.stato] - ord[b.stato] || a.giorno - b.giorno;
      });
  }, [ricorrenti, righeMese, isMeseCorrente, oggi]);

  const daPagare = useMemo(
    () => ricorrentiStato.filter((r) => r.stato !== "pagata").reduce((s, r) => s + r.importo, 0),
    [ricorrentiStato]
  );

  const saldoOggi = entrate - speso;
  const saldoProiettato = saldoOggi - daPagare;

  const categorie = useMemo(() => {
    const map = {};
    righeMese
      .filter((r) => r.tipo === "Spesa")
      .forEach((r) => {
        map[r.categoria] = (map[r.categoria] || 0) + Math.abs(r.importo);
      });
    return Object.entries(map)
      .map(([nome, valore]) => ({ nome, valore }))
      .sort((a, b) => b.valore - a.valore);
  }, [righeMese]);

  const maxCat = categorie.length ? Math.max(...categorie.map((c) => c.valore)) : 0;

  // transazioni del mese, dalla più recente
  const transazioniMese = useMemo(
    () =>
      righeMese
        .slice()
        .sort((a, b) => (b.dataObj?.getTime() || 0) - (a.dataObj?.getTime() || 0)),
    [righeMese]
  );

  const entrateMese = useMemo(
    () => transazioniMese.filter((r) => r.tipo === "Entrata"),
    [transazioniMese]
  );

  const totaleConti = useMemo(() => conti.reduce((s, c) => s + c.saldo, 0), [conti]);

  // se la categoria selezionata sparisce (cambio mese, dati ricaricati) resetta
  useEffect(() => {
    if (catSel && !categorie.some((c) => c.nome === catSel)) setCatSel(null);
  }, [categorie, catSel]);

  // ultimi 6 mesi FINO al mese selezionato, per la categoria scelta
  const trendCategoria = useMemo(() => {
    if (!catSel) return [];
    const idx = mesiDisponibili.indexOf(mese);
    if (idx < 0) return [];
    const finestra = mesiDisponibili.slice(Math.max(0, idx - 5), idx + 1);
    return finestra.map((m) => ({
      mese: m,
      valore: Math.round(
        rows
          .filter((r) => r.mese === m && r.tipo === "Spesa" && r.categoria === catSel)
          .reduce((s, r) => s + Math.abs(r.importo), 0)
      ),
    }));
  }, [catSel, mese, mesiDisponibili, rows]);

  const trend = useMemo(
    () =>
      mesiDisponibili.slice(-6).map((m) => {
        const righe = rows.filter((r) => r.mese === m);
        return {
          mese: m,
          Entrate: Math.round(righe.filter((r) => r.tipo === "Entrata").reduce((s, r) => s + Math.abs(r.importo), 0)),
          Uscite: Math.round(righe.filter((r) => r.tipo === "Spesa").reduce((s, r) => s + Math.abs(r.importo), 0)),
        };
      }),
    [rows, mesiDisponibili]
  );

  const giorniRestanti = isMeseCorrente ? giorniNelMese(oggi) - oggi.getDate() : 0;

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: C.bg,
        fontFamily: fontBody,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Manrope:wght@400;500;600;700;800&display=swap');
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { -webkit-tap-highlight-color: transparent; }
        button { font: inherit; }
        .recharts-sector:focus, .recharts-wrapper:focus, svg:focus { outline: none; }`}</style>

      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          padding: "0 18px 40px",
          paddingTop: "max(76px, calc(env(safe-area-inset-top) + 28px))",
          paddingLeft: "max(18px, env(safe-area-inset-left))",
          paddingRight: "max(18px, env(safe-area-inset-right))",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: C.surfaceAlt,
              color: C.green,
            }}
          >
            <Wallet size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.ink, fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.1 }}>Portafoglio</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: loading ? C.amber : error ? C.coral : C.green,
                }}
              />
              <span style={{ color: C.inkMuted, fontSize: "0.73rem" }}>
                {loading
                  ? "Caricamento…"
                  : error
                  ? "Errore di lettura"
                  : `Aggiornato al ${oggi.toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`}
              </span>
            </div>
          </div>
          {mesiDisponibili.length > 1 && (
            <select
              value={mese || ""}
              onChange={(e) => setMese(e.target.value)}
              style={{
                background: C.surfaceAlt,
                color: C.ink,
                border: `1px solid ${C.hairline}`,
                borderRadius: 999,
                padding: "0 16px",
                height: 44,
                minWidth: 108,
                fontSize: "0.85rem",
                fontFamily: fontBody,
                fontWeight: 600,
                appearance: "none",
                textAlign: "center",
                textAlignLast: "center",
              }}
            >
              {mesiDisponibili
                .slice()
                .reverse()
                .map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </select>
          )}
        </div>

        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              padding: "70px 0",
              color: C.inkMuted,
            }}
          >
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carico i dati dal foglio…
          </div>
        )}

        {error && (
          <div
            style={{
              borderRadius: 18,
              padding: 20,
              display: "flex",
              gap: 11,
              background: C.surface,
              border: `1px solid ${C.coral}55`,
            }}
          >
            <AlertCircle size={18} style={{ color: C.coral, flexShrink: 0, marginTop: 2 }} />
            <div style={{ color: C.ink, fontSize: "0.88rem" }}>
              {error}. Controlla che il foglio sia condiviso con accesso “Chiunque abbia il link” (visualizzatore).
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* SALDO */}
            <div
              style={{
                borderRadius: 22,
                padding: "22px 20px 18px",
                background: C.surface,
                border: `1px solid ${C.hairline}`,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <div style={{ color: C.inkMuted, fontSize: "0.7rem", letterSpacing: "0.08em" }}>
                  {isMeseCorrente ? "ENTRATE − USCITE · QUESTO MESE" : `ENTRATE − USCITE — ${(mese || "").toUpperCase()}`}
                </div>
                <button
                  onClick={() => setPanel("saldi")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: C.surfaceAlt,
                    border: `1px solid ${C.hairline}`,
                    color: contiOk ? C.green : C.inkMuted,
                    borderRadius: 999,
                    padding: "6px 11px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  <Landmark size={12} />
                  Saldi
                </button>
              </div>
              <div
                style={{
                  color: saldoOggi >= 0 ? C.ink : C.coral,
                  fontFamily: fontDisplay,
                  fontWeight: 700,
                  fontSize: "2.4rem",
                  lineHeight: 1.05,
                }}
              >
                € {euro(saldoOggi)}
              </div>

              {isMeseCorrente && daPagare > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "11px 13px",
                    borderRadius: 14,
                    background: C.surfaceAlt,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: C.inkMuted, fontSize: "0.68rem", letterSpacing: "0.05em" }}>
                      A FINE MESE, DOPO € {euro(daPagare)} DA PAGARE
                    </div>
                    <div
                      style={{
                        color: saldoProiettato >= 0 ? C.green : C.coral,
                        fontFamily: fontDisplay,
                        fontWeight: 700,
                        fontSize: "1.3rem",
                        marginTop: 2,
                      }}
                    >
                      € {euro(saldoProiettato)}
                    </div>
                  </div>
                  <button
                    onClick={() => setPanel("dapagare")}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.hairline}`,
                      color: C.inkMuted,
                      borderRadius: 999,
                      padding: "6px 11px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Dettagli
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
                <MiniStat
                  label="ENTRATE"
                  value={entrate}
                  tone={C.green}
                  icon={ArrowUpRight}
                  onClick={() => setPanel("entrate")}
                />
                <MiniStat label="SPESO" value={speso} tone={C.coral} icon={ArrowDownRight} />
                {isMeseCorrente && (
                  <MiniStat label="DA PAGARE" value={daPagare} tone={C.amber} icon={CalendarClock} />
                )}
              </div>
            </div>

            {/* TESSERE */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Tile
                icon={PieChartIcon}
                titolo="Categorie"
                sub={
                  categorie.length
                    ? `${categorie.length} attive · top ${categorie[0].nome}`
                    : "Nessuna spesa nel periodo"
                }
                onClick={() => setPanel("categorie")}
              />
              <Tile
                icon={Receipt}
                titolo="Transazioni"
                accent={C.inkMuted}
                sub={
                  transazioniMese.length
                    ? `${transazioniMese.length} movimenti in ${mese || ""}`
                    : "Nessun movimento nel periodo"
                }
                onClick={() => setPanel("transazioni")}
              />
              {ricorrentiOk && (
                <Tile
                  icon={CalendarClock}
                  titolo="Da pagare"
                  accent={C.coral}
                  sub={
                    !isMeseCorrente
                      ? "Solo per il mese in corso"
                      : daPagare > 0
                      ? `€ ${euro(daPagare)} nei prossimi ${giorniRestanti} giorni`
                      : "Tutto pagato, per ora"
                  }
                  onClick={() => setPanel("dapagare")}
                />
              )}
              <Tile
                icon={TrendingUp}
                titolo="Andamento"
                accent={C.green}
                sub={`Ultimi ${trend.length} mesi`}
                onClick={() => setPanel("trend")}
              />
            </div>
          </>
        )}
      </div>

      {/* ---------------- PANNELLI ---------------- */}
      <BottomSheet
        open={panel === "categorie"}
        title="Categorie"
        subtitle={
          catSel ? `${mese || ""} · tocca di nuovo per tornare al totale` : `${mese || ""} · € ${euro(speso)} spesi`
        }
        onClose={closePanel}
      >
        {categorie.length === 0 ? (
          <div style={{ color: C.inkMuted, textAlign: "center", padding: "30px 0", fontSize: "0.88rem" }}>
            Nessuna spesa registrata in questo mese.
          </div>
        ) : (
          <>
            <CategoryDonut dati={categorie} selezionata={catSel} onSelect={toggleCat} totale={speso} />

            {catSel && trendCategoria.length > 0 && <TrendCategoria nome={catSel} dati={trendCategoria} />}

            <div style={{ marginTop: 14 }}>
              {categorie.map((c) => (
                <CategoryRow
                  key={c.nome}
                  c={c}
                  max={maxCat}
                  selezionata={catSel === c.nome}
                  spenta={Boolean(catSel) && catSel !== c.nome}
                  onSelect={toggleCat}
                />
              ))}
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={panel === "transazioni"}
        title="Transazioni"
        subtitle={`${mese || ""} · ${transazioniMese.length} movimenti`}
        onClose={closePanel}
      >
        {transazioniMese.length === 0 ? (
          <div style={{ color: C.inkMuted, textAlign: "center", padding: "30px 0", fontSize: "0.88rem" }}>
            Nessun movimento registrato in questo mese.
          </div>
        ) : (
          transazioniMese.map((t, i) => <TransazioneRow key={`${t.data}-${t.descrizione}-${i}`} t={t} />)
        )}
      </BottomSheet>

      <BottomSheet
        open={panel === "entrate"}
        title="Entrate"
        subtitle={`${mese || ""} · € ${euro(entrate)} totali`}
        onClose={closePanel}
      >
        {entrateMese.length === 0 ? (
          <div style={{ color: C.inkMuted, textAlign: "center", padding: "30px 0", fontSize: "0.88rem" }}>
            Nessuna entrata registrata in questo mese.
          </div>
        ) : (
          <>
            {entrateMese.map((t, i) => (
              <TransazioneRow key={`${t.data}-${t.descrizione}-${i}`} t={t} />
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: 14,
                marginTop: 4,
              }}
            >
              <span style={{ color: C.inkMuted, fontSize: "0.8rem", letterSpacing: "0.05em" }}>TOTALE ENTRATE</span>
              <span style={{ color: C.green, fontFamily: fontDisplay, fontWeight: 700, fontSize: "1.2rem" }}>
                € {euro(entrate)}
              </span>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={panel === "saldi"}
        title="Saldi conti"
        subtitle={contiOk ? `${conti.length} conti` : undefined}
        onClose={closePanel}
      >
        {!contiOk ? (
          <div style={{ color: C.inkMuted, fontSize: "0.86rem", lineHeight: 1.65 }}>
            Aggiungi al foglio Google un tab chiamato <b style={{ color: C.ink }}>Conti</b> con le colonne:
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: C.surfaceAlt,
                fontFamily: fontDisplay,
                fontSize: "0.78rem",
                color: C.amber,
              }}
            >
              Conto · Saldo · Aggiornato il
            </div>
            <div style={{ marginTop: 10 }}>
              Una riga per ogni conto (Fineco, Trade Republic, …). I saldi li aggiorni a mano quando vuoi; “Aggiornato
              il” serve solo a ricordarti quando l’hai fatto l’ultima volta.
            </div>
          </div>
        ) : (
          <>
            {conti.map((c, i) => (
              <div
                key={`${c.conto}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: `1px solid ${C.hairline}`,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: C.surfaceAlt,
                    color: C.green,
                    flexShrink: 0,
                  }}
                >
                  <Landmark size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.ink, fontFamily: fontBody, fontWeight: 600, fontSize: "0.88rem" }}>
                    {c.conto}
                  </div>
                  {c.aggiornato && (
                    <div style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.72rem", marginTop: 2 }}>
                      Aggiornato il {c.aggiornato}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    color: c.saldo >= 0 ? C.ink : C.coral,
                    fontFamily: fontDisplay,
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  € {euro(c.saldo)}
                </div>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: 14,
                marginTop: 4,
              }}
            >
              <span style={{ color: C.inkMuted, fontSize: "0.8rem", letterSpacing: "0.05em" }}>SALDO ATTUALE</span>
              <span
                style={{
                  color: totaleConti >= 0 ? C.green : C.coral,
                  fontFamily: fontDisplay,
                  fontWeight: 700,
                  fontSize: "1.2rem",
                }}
              >
                € {euro(totaleConti)}
              </span>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet
        open={panel === "dapagare"}
        title="Da pagare"
        subtitle={
          isMeseCorrente && ricorrentiOk
            ? `€ ${euro(daPagare)} entro fine mese · ${giorniRestanti} giorni rimasti`
            : undefined
        }
        onClose={closePanel}
      >
        {!ricorrentiOk ? (
          <div style={{ color: C.inkMuted, fontSize: "0.86rem", lineHeight: 1.65 }}>
            Aggiungi al foglio Google un tab chiamato <b style={{ color: C.ink }}>Ricorrenti</b> con le colonne:
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: C.surfaceAlt,
                fontFamily: fontDisplay,
                fontSize: "0.78rem",
                color: C.amber,
              }}
            >
              Descrizione · Importo · Giorno · Categoria · Attivo · Note
            </div>
            <div style={{ marginTop: 10 }}>
              Una riga per ogni spesa fissa (affitto, Netflix, rata, bolletta). “Giorno” è il giorno del mese in cui
              esce; “Attivo” = SI/NO.
            </div>
          </div>
        ) : !isMeseCorrente ? (
          <div style={{ color: C.inkMuted, textAlign: "center", padding: "30px 0", fontSize: "0.88rem" }}>
            La proiezione è disponibile solo sul mese in corso.
          </div>
        ) : ricorrentiStato.length === 0 ? (
          <div style={{ color: C.inkMuted, textAlign: "center", padding: "30px 0", fontSize: "0.88rem" }}>
            Nessuna spesa ricorrente attiva.
          </div>
        ) : (
          <>
            {ricorrentiStato.map((r, i) => (
              <RicorrenteRow key={`${r.descrizione}-${i}`} r={r} />
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: 14,
                marginTop: 4,
              }}
            >
              <span style={{ color: C.inkMuted, fontSize: "0.8rem", letterSpacing: "0.05em" }}>TOTALE RESIDUO</span>
              <span style={{ color: C.amber, fontFamily: fontDisplay, fontWeight: 700, fontSize: "1.2rem" }}>
                € {euro(daPagare)}
              </span>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={panel === "trend"} title="Andamento" subtitle="Entrate e uscite per mese" onClose={closePanel}>
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ left: -22, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.coral} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.coral} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.hairline} vertical={false} />
              <XAxis
                dataKey="mese"
                stroke={C.inkMuted}
                tick={{ fontSize: 11, fontFamily: fontBody }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: C.surfaceAlt,
                  border: `1px solid ${C.hairline}`,
                  borderRadius: 10,
                  fontFamily: fontBody,
                  fontSize: 12,
                }}
                labelStyle={{ color: C.ink }}
                formatter={(v) => `€ ${euro(v)}`}
              />
              <Area type="monotone" dataKey="Entrate" stroke={C.green} fill="url(#gE)" strokeWidth={2} />
              <Area type="monotone" dataKey="Uscite" stroke={C.coral} fill="url(#gU)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.inkMuted, fontSize: "0.76rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: C.green }} /> Entrate
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.inkMuted, fontSize: "0.76rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: C.coral }} /> Uscite
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
