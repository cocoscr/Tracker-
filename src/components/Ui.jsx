/* ------------------------------------------------------------------ *
 *  COMPONENTI RIUTILIZZABILI
 *  MiniStat · Tile · CategoryBar · RicorrenteRow · PosizioneRow
 * ------------------------------------------------------------------ */

import React from "react";
import { ChevronRight, Check, Clock, AlertCircle, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { C, fontBody, fontDisplay, iconFor } from "../config.js";
import { euro } from "../utils.js";

/* --- numerino con etichetta e icona (riga sotto il saldo) --- */
export function MiniStat({ label, value, tone, icon: Icon }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
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
      </div>
      <div style={{ color: tone, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.98rem" }}>€ {euro(value)}</div>
    </div>
  );
}

/* --- tessera cliccabile che apre un pannello --- */
export function Tile({ icon: Icon, titolo, sub, onClick, accent }) {
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

/* --- barra orizzontale con icona: categorie e conti ---
 * Con onClick diventa un pulsante (freccia a destra che ruota quando è aperta). */
export function CategoryBar({ nome, valore, max, colore, onClick, aperta, conteggio }) {
  const Icon = iconFor(nome);
  const pct = max > 0 ? Math.round((valore / max) * 100) : 0;
  const tinta = colore || C.amber;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      aria-expanded={onClick ? !!aperta : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 0",
        width: "100%",
        background: "transparent",
        border: "none",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        font: "inherit",
        color: "inherit",
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
          background: aperta ? tinta : C.surfaceAlt,
          color: aperta ? C.bg : tinta,
          flexShrink: 0,
          transition: "background 0.15s, color 0.15s",
        }}
      >
        <Icon size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.87rem", marginBottom: 5 }}>
          <span style={{ color: C.ink, fontFamily: fontBody, fontWeight: 500, minWidth: 0 }}>
            {nome}
            {conteggio > 0 && (
              <span style={{ color: C.inkMuted, fontWeight: 400, fontSize: "0.74rem" }}> · {conteggio}</span>
            )}
          </span>
          <span style={{ color: C.inkMuted, fontFamily: fontDisplay, flexShrink: 0 }}>€ {euro(valore)}</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, overflow: "hidden", background: C.hairline }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: tinta }} />
        </div>
      </div>
      {onClick && (
        <ChevronRight
          size={16}
          style={{
            color: C.inkMuted,
            flexShrink: 0,
            transform: aperta ? "rotate(90deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      )}
    </Tag>
  );
}

/* --- riga di una spesa ricorrente ---
 * onPaga  → pulsante "Paga" a destra: un tocco e la spesa viene registrata
 * onClick → tocco sul resto della riga: apre il riquadro per cambiare l'importo
 * invio   → mostra la rotellina sul pulsante mentre scrive sul foglio */
export function RicorrenteRow({ r, onClick, aperta, onPaga, invio }) {
  const Icon = iconFor(r.categoria);
  const stato =
    r.stato === "pagata"
      ? { label: "Pagata", color: C.green, Ico: Check }
      : r.stato === "ritardo"
      ? { label: "In ritardo", color: C.coral, Ico: AlertCircle }
      : { label: `Il ${r.giorno}`, color: C.amber, Ico: Clock };
  const Corpo = onClick ? "button" : "div";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: aperta ? "1px solid transparent" : `1px solid ${C.hairline}`,
        opacity: r.stato === "pagata" ? 0.5 : 1,
      }}
    >
      <Corpo
        onClick={onClick}
        aria-expanded={onClick ? !!aperta : undefined}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "11px 0",
          background: "transparent",
          border: "none",
          textAlign: "left",
          font: "inherit",
          color: "inherit",
          cursor: onClick ? "pointer" : "default",
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
          {r.importo > 0 ? `€ ${euro(r.importo)}` : "—"}
        </div>
      </Corpo>
      {onPaga && (
        <button
          onClick={onPaga}
          disabled={invio}
          aria-label={`Segna ${r.descrizione} come pagata`}
          style={{
            flexShrink: 0,
            minWidth: 64,
            height: 34,
            padding: "0 12px",
            borderRadius: 999,
            border: "none",
            background: C.green,
            color: C.bg,
            fontFamily: fontBody,
            fontWeight: 700,
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            cursor: "pointer",
          }}
        >
          {invio ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
          {invio ? "" : "Paga"}
        </button>
      )}
    </div>
  );
}

/* --- riga di una posizione (ETF / azione) --- */
export function PosizioneRow({ p }) {
  const gain = p.pl >= 0;
  const pct = p.investito > 0 ? (p.pl / p.investito) * 100 : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "11px 0",
        borderBottom: `1px solid ${C.hairline}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: C.ink,
            fontFamily: fontBody,
            fontWeight: 600,
            fontSize: "0.88rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {p.nome || p.ticker}
        </div>
        <div style={{ color: C.inkMuted, fontFamily: fontDisplay, fontSize: "0.71rem", marginTop: 2 }}>
          {p.ticker} · {p.quantita} q.tà · {p.conto}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.88rem" }}>
          € {euro(p.valore)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 2,
            color: gain ? C.green : C.coral,
            fontFamily: fontBody,
            fontSize: "0.72rem",
            marginTop: 2,
          }}
        >
          {gain ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {gain ? "+" : "-"}€ {euro(p.pl)} ({Math.abs(pct).toFixed(1)}%)
        </div>
      </div>
    </div>
  );
}
