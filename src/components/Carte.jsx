import React from "react";
import {
  BarChart, Bar, Cell, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { C, fontBody, fontDisplay, colorFor } from "../config.js";
import { euro, euro0 } from "../utils.js";
import { Icona, iconeFor } from "./Icona.jsx";

export function CategoryBar({ nome, valore, max, attiva, onClick, colore, budget }) {
  const col = colore || colorFor(nome);
  let pct, barCol, destra;
  if (budget) {
    const rapporto = valore / budget.valore;
    pct = Math.min(100, Math.round(rapporto * 100));
    barCol = rapporto > 1 ? C.coral : rapporto > 0.85 ? C.amber : col;
    destra = (
      <span style={{ color: rapporto > 1 ? C.coral : C.inkMuted, fontFamily: fontDisplay }}>
        € {euro(valore)} <span style={{ opacity: 0.6 }}>/ {euro0(budget.valore)}</span>
      </span>
    );
  } else {
    pct = max > 0 ? Math.round((valore / max) * 100) : 0;
    barCol = col;
    destra = <span style={{ color: C.inkMuted, fontFamily: fontDisplay }}>€ {euro(valore)}</span>;
  }
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 py-2.5 w-full text-left rounded-xl px-2 -mx-2 transition-colors"
      style={{ background: attiva ? C.surfaceAlt : "transparent" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: attiva ? col : C.surfaceAlt, color: attiva ? C.bg : col, transition: "background 0.15s, color 0.15s" }}>
        <Icona nomi={iconeFor(nome)} size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1">
          <span style={{ color: C.ink, fontFamily: fontBody, fontWeight: attiva ? 700 : 500 }}>{nome}</span>
          {destra}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.hairline }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barCol }} />
        </div>
      </div>
    </button>
  );
}

export function AndamentoCategoria({ categoria, tipo, dati, meseCorrente }) {
  const col = tipo === "Entrata" ? C.green : colorFor(categoria);
  const valori = dati.map((d) => d.valore).filter((v) => v > 0);
  const media = valori.length ? valori.reduce((s, v) => s + v, 0) / valori.length : 0;
  const totale = dati.reduce((s, d) => s + d.valore, 0);

  return (
    <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="text-xs" style={{ color: C.inkMuted, letterSpacing: "0.06em" }}>
          ANDAMENTO — {tipo === "Entrata" ? "ENTRATA" : "SPESA"}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: C.surfaceAlt, color: col }}>
            <Icona nomi={iconeFor(categoria)} size={13} />
          </div>
          <span className="text-sm" style={{ color: C.ink, fontFamily: fontBody, fontWeight: 700 }}>{categoria}</span>
        </div>
      </div>
      <div className="flex gap-4 mb-4 text-xs flex-wrap" style={{ color: C.inkMuted, fontFamily: fontBody }}>
        <span>Media mensile: <span style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700 }}>€ {euro(media)}</span></span>
        <span>Totale periodo: <span style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700 }}>€ {euro(totale)}</span></span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={dati} margin={{ left: -20, right: 10 }}>
          <CartesianGrid stroke={C.hairline} vertical={false} />
          <XAxis dataKey="mese" stroke={C.inkMuted} tick={{ fontSize: 10, fontFamily: fontBody }}
            axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis hide />
          <Tooltip cursor={{ fill: `${C.hairline}55` }}
            contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.hairline}`, borderRadius: 10, fontFamily: fontBody, fontSize: 12 }}
            labelStyle={{ color: C.ink }} formatter={(v) => [`€ ${euro(v)}`, categoria]} />
          <ReferenceLine y={media} stroke={C.inkMuted} strokeDasharray="4 4" strokeOpacity={0.6} />
          <Bar dataKey="valore" radius={[5, 5, 0, 0]} maxBarSize={34}>
            {dati.map((d) => (
              <Cell key={d.mese} fill={d.mese === meseCorrente ? col : `${col}55`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-xs mt-1" style={{ color: C.inkMuted, fontFamily: fontBody }}>
        Linea tratteggiata = la tua media mensile. Barra piena = mese selezionato.
      </div>
    </div>
  );
}

export function FisseVariabili({ fisse, variabili }) {
  const tot = fisse + variabili;
  const pctF = tot > 0 ? Math.round((fisse / tot) * 100) : 0;
  return (
    <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
      <div className="text-xs mb-3" style={{ color: C.inkMuted, letterSpacing: "0.06em" }}>
        FISSE vs VARIABILI
      </div>
      <div className="h-3 rounded-full overflow-hidden flex" style={{ background: C.hairline }}>
        <div style={{ width: `${pctF}%`, background: "#7FB3D5" }} />
        <div style={{ width: `${100 - pctF}%`, background: C.amber }} />
      </div>
      <div className="flex justify-between mt-3 text-sm flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: C.inkMuted }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "#7FB3D5" }} /> Fisse ({pctF}%)
          </div>
          <div style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700 }}>€ {euro(fisse)}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-xs justify-end" style={{ color: C.inkMuted }}>
            <span className="w-2 h-2 rounded-full" style={{ background: C.amber }} /> Variabili ({100 - pctF}%)
          </div>
          <div style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700 }}>€ {euro(variabili)}</div>
        </div>
      </div>
      <div className="text-xs mt-3" style={{ color: C.inkMuted, fontFamily: fontBody }}>
        Le variabili sono il margine su cui puoi agire davvero: le fisse cambiano solo disdicendo o rinegoziando.
      </div>
    </div>
  );
}

export function ReceiptTape({ transazioni }) {
  return (
    <div className="relative">
      <div className="h-4 rounded-t-md"
        style={{ background: `radial-gradient(circle, ${C.bg} 3.5px, transparent 3.6px)`, backgroundSize: "16px 16px", backgroundPosition: "8px 4px", backgroundColor: C.paper }} />
      <div className="px-5 pb-2" style={{ background: C.paper }}>
        <div className="text-center text-xs pb-3 pt-1" style={{ color: C.paperMuted, fontFamily: fontDisplay, letterSpacing: "0.15em" }}>
          ULTIMI MOVIMENTI
        </div>
        {transazioni.length === 0 && (
          <div className="text-center text-sm py-6" style={{ color: C.paperMuted, fontFamily: fontBody }}>
            Nessun movimento nel periodo.
          </div>
        )}
        {transazioni.map((t, i) => (
          <div key={i} className="flex items-center justify-between py-2"
            style={{ borderBottom: i < transazioni.length - 1 ? `1px dashed ${C.paperMuted}55` : "none" }}>
            <div className="flex flex-col min-w-0 pr-2">
              <span style={{ color: C.paperInk, fontFamily: fontBody, fontWeight: 600, fontSize: "0.85rem" }} className="truncate">
                {t.descrizione}
              </span>
              <span style={{ color: C.paperMuted, fontFamily: fontBody, fontSize: "0.7rem" }}>
                {t.data} · {t.categoria}
              </span>
            </div>
            <span style={{ color: t.importo > 0 ? "#2E7D4F" : C.paperInk, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
              {t.importo > 0 ? "+" : "-"}€ {euro(t.importo)}
            </span>
          </div>
        ))}
      </div>
      <div className="h-3"
        style={{ background: C.paper, clipPath: "polygon(0% 0%,100% 0%,100% 60%,92% 100%,84% 60%,76% 100%,68% 60%,60% 100%,52% 60%,44% 100%,36% 60%,28% 100%,20% 60%,12% 100%,4% 60%,0% 100%)" }} />
    </div>
  );
}
