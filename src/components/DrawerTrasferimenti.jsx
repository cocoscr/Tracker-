import React, { useEffect } from "react";
import { C, fontBody, fontDisplay } from "../config.js";
import { euro, chiaveOrdinamentoMese } from "../utils.js";
import { Icona } from "./Icona.jsx";

export function DrawerTrasferimenti({ trasferimenti, mese, onClose }) {
  const usciti = trasferimenti.filter((t) => t.importo < 0).reduce((s, t) => s + Math.abs(t.importo), 0);
  const entrati = trasferimenti.filter((t) => t.importo > 0).reduce((s, t) => s + t.importo, 0);
  const diff = usciti - entrati;
  const sbilanciato = Math.abs(diff) > 0.005;
  const ordinati = [...trasferimenti].sort((a, b) => {
    const ka = a.dataObj ? a.dataObj.getTime() : 0;
    const kb = b.dataObj ? b.dataObj.getTime() : 0;
    return kb - ka;
  });

  // blocca lo scroll della pagina sotto e chiudi con tasto Esc
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(15,22,19,0.85)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" }}
      onClick={onClose}>
      <div className="w-full md:max-w-lg rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: C.surface, border: `1px solid ${C.hairline}`, maxHeight: "85vh", paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* intestazione */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${C.hairline}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.surfaceAlt, color: C.inkMuted }}>
              <Icona nomi={["ArrowLeftRight"]} size={16} />
            </div>
            <div>
              <div className="text-xs" style={{ color: C.inkMuted, letterSpacing: "0.08em" }}>TRA CONTI</div>
              <div style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.95rem" }}>
                {(mese || "").toUpperCase()}
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Chiudi"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: C.surfaceAlt, color: C.inkMuted }}>
            <Icona nomi={["X"]} size={15} />
          </button>
        </div>

        {/* sommario a tre colonne */}
        <div className="grid grid-cols-3 shrink-0" style={{ borderBottom: `1px solid ${C.hairline}` }}>
          <div className="flex flex-col items-center py-4" style={{ borderRight: `1px solid ${C.hairline}` }}>
            <div className="text-xs mb-1" style={{ color: C.inkMuted, letterSpacing: "0.05em" }}>MOVIMENTI</div>
            <div style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700, fontSize: "1.05rem" }}>
              {trasferimenti.length}
            </div>
          </div>
          <div className="flex flex-col items-center py-4" style={{ borderRight: `1px solid ${C.hairline}` }}>
            <div className="text-xs mb-1" style={{ color: C.inkMuted, letterSpacing: "0.05em" }}>→ USCITI</div>
            <div style={{ color: C.coral, fontFamily: fontDisplay, fontWeight: 700, fontSize: "1.05rem" }}>
              € {euro(usciti)}
            </div>
          </div>
          <div className="flex flex-col items-center py-4">
            <div className="text-xs mb-1" style={{ color: C.inkMuted, letterSpacing: "0.05em" }}>← ENTRATI</div>
            <div style={{ color: C.green, fontFamily: fontDisplay, fontWeight: 700, fontSize: "1.05rem" }}>
              € {euro(entrati)}
            </div>
          </div>
        </div>

        {/* avviso se i due lati non quadrano */}
        {sbilanciato && (
          <div className="mx-5 mt-4 shrink-0 flex items-start gap-2.5 rounded-xl px-4 py-3"
            style={{ background: `${C.amber}14`, border: `1px solid ${C.amber}44` }}>
            <Icona nomi={["CircleAlert", "AlertCircle"]} size={15} style={{ color: C.amber }} className="shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed" style={{ color: C.ink, fontFamily: fontBody }}>
              I due lati non quadrano: <span style={{ color: C.amber, fontFamily: fontDisplay, fontWeight: 700 }}>€ {euro(diff)}</span> di differenza.
              Probabilmente un movimento è un pagamento a terzi categorizzato come "Trasferimento": trovalo qui sotto e ricategorizzalo nel foglio.
            </div>
          </div>
        )}

        {/* lista movimenti */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2" style={{ WebkitOverflowScrolling: "touch" }}>
          {ordinati.length === 0 && (
            <div className="text-center text-sm py-8" style={{ color: C.inkMuted, fontFamily: fontBody }}>
              Nessun trasferimento in questo mese.
            </div>
          )}
          {ordinati.map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: C.surfaceAlt }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: C.surface, color: t.importo < 0 ? C.coral : C.green }}>
                <Icona nomi={t.importo < 0 ? ["ArrowUpRight"] : ["ArrowDownLeft", "ArrowDownRight"]} size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: C.ink, fontFamily: fontBody, fontWeight: 600 }}>
                  {t.descrizione || "(senza descrizione)"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: C.inkMuted, fontFamily: fontBody }}>
                  {t.data}
                  {t.conto ? ` · ${t.conto}` : ""}
                  {t.metodo ? ` · ${t.metodo}` : ""}
                </div>
              </div>
              <span style={{ color: t.importo < 0 ? C.coral : C.green, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                {t.importo < 0 ? "→" : "←"} € {euro(t.importo)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
