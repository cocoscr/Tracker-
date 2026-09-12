/* ------------------------------------------------------------------ *
 *  ULTIMA TRANSAZIONE — il feedback post-pagamento dentro la webapp
 *  Mostra gli stessi tre numeri della notifica del comando rapido:
 *  importo appena speso · totale della categoria nel mese · totale mese.
 *  Guarda sempre l'ULTIMA riga del foglio, non il mese selezionato.
 * ------------------------------------------------------------------ */

import React from "react";
import { Sparkles } from "lucide-react";
import { C, fontBody, fontDisplay, iconFor } from "../config.js";
import { euro } from "../utils.js";

export default function UltimaTransazione({ dati, oggi }) {
  if (!dati) return null;
  const { t, totaleCategoria, totaleMese } = dati;
  const Icon = iconFor(t.categoria);
  const quota = totaleMese > 0 ? Math.min(100, Math.round((totaleCategoria / totaleMese) * 100)) : 0;

  const oggiStr = oggi.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const quando = t.data === oggiStr ? "oggi" : t.data;

  return (
    <div
      style={{
        borderRadius: 22,
        padding: "16px 18px 14px",
        background: C.surface,
        border: `1px solid ${C.amber}55`,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          color: C.amber,
          fontFamily: fontBody,
          fontSize: "0.68rem",
          letterSpacing: "0.08em",
          marginBottom: 10,
        }}
      >
        <Sparkles size={12} />
        ULTIMA TRANSAZIONE
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: C.surfaceAlt,
            color: C.amber,
            flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: C.ink,
              fontFamily: fontBody,
              fontWeight: 700,
              fontSize: "0.95rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {t.descrizione || "—"}
          </div>
          <div style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.74rem", marginTop: 2 }}>
            {t.categoria} · {quando}
          </div>
        </div>
        <div
          style={{
            color: C.ink,
            fontFamily: fontDisplay,
            fontWeight: 700,
            fontSize: "1.25rem",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          € {euro(t.importo)}
        </div>
      </div>

      <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 14, background: C.surfaceAlt }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.74rem" }}>
            {t.categoria} a {t.mese}
          </span>
          <span style={{ color: C.amber, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.92rem" }}>
            € {euro(totaleCategoria)}
          </span>
        </div>
        <div style={{ height: 5, borderRadius: 999, overflow: "hidden", background: C.hairline, margin: "7px 0" }}>
          <div style={{ width: `${quota}%`, height: "100%", borderRadius: 999, background: C.amber }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.74rem" }}>Totale {t.mese}</span>
          <span style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.92rem" }}>
            € {euro(totaleMese)}
          </span>
        </div>
      </div>
    </div>
  );
}
