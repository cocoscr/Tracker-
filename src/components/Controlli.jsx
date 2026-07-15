import React from "react";
import { C, fontBody, fontDisplay } from "../config.js";
import { euro } from "../utils.js";
import { Icona } from "./Icona.jsx";

export function SegmentToggle({ options, value, onChange, accent = C.green }) {
  return (
    <div className="flex rounded-full p-1 overflow-x-auto max-w-full"
      style={{ background: C.surfaceAlt, border: `1px solid ${C.hairline}`, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
      {options.map((k) => (
        <button key={k} onClick={() => onChange(k)}
          className="px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap shrink-0"
          style={{ fontFamily: fontBody, fontWeight: 600, color: value === k ? C.bg : C.inkMuted, background: value === k ? accent : "transparent" }}>
          {k}
        </button>
      ))}
    </div>
  );
}

export function StatChip({ label, value, delta, positive, sub, subColor }) {
  const hasDelta = delta !== null && delta !== undefined && isFinite(delta);
  const frecce = delta >= 0 ? ["ArrowUpRight"] : ["ArrowDownRight"];
  const good = positive ? delta >= 0 : delta < 0;
  return (
    <div className="flex-1 rounded-2xl p-4 min-w-[130px]" style={{ background: C.surfaceAlt, border: `1px solid ${C.hairline}` }}>
      <div className="text-xs mb-1" style={{ color: C.inkMuted, fontFamily: fontBody, letterSpacing: "0.04em" }}>{label}</div>
      <div className="text-xl" style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700 }}>€ {euro(value)}</div>
      {hasDelta && (
        <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: good ? C.green : C.coral, fontFamily: fontBody }}>
          <Icona nomi={frecce} size={13} />
          {Math.abs(Math.round(delta))}% vs mese prec.
        </div>
      )}
      {sub && (
        <div className="mt-1 text-xs" style={{ color: subColor || C.inkMuted, fontFamily: fontBody }}>{sub}</div>
      )}
    </div>
  );
}

// ---- verdetto in linguaggio naturale ----
export function Verdetto({ testo, tono }) {
  const colore = tono === "verde" ? C.green : tono === "corallo" ? C.coral : C.amber;
  const icone = tono === "verde" ? ["CircleCheck", "CheckCircle2", "CheckCircle"] : tono === "corallo" ? ["TriangleAlert", "AlertTriangle"] : ["Info"];
  return (
    <div className="flex items-start gap-2 mt-3 rounded-xl px-3 py-2.5"
      style={{ background: `${colore}14`, border: `1px solid ${colore}44` }}>
      <Icona nomi={icone} size={16} style={{ color: colore }} className="shrink-0 mt-0.5" />
      <span className="text-sm" style={{ color: C.ink, fontFamily: fontBody }}>{testo}</span>
    </div>
  );
}

export function SegnaleCard({ s }) {
  const colore = s.tono === "verde" ? C.green : s.tono === "corallo" ? C.coral : C.amber;
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: `1px solid ${C.hairline}` }}>
      <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: colore }} />
      <div className="min-w-0">
        <div className="text-sm" style={{ color: C.ink, fontFamily: fontBody, fontWeight: 600 }}>{s.titolo}</div>
        {s.dettaglio && <div className="text-xs mt-0.5" style={{ color: C.inkMuted, fontFamily: fontBody }}>{s.dettaglio}</div>}
      </div>
    </div>
  );
}
