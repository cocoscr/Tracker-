/* ------------------------------------------------------------------ *
 *  RIGA MOVIMENTO — una singola spesa o entrata
 * ------------------------------------------------------------------ */

import React from "react";
import { C, fontBody, fontDisplay, iconFor } from "../config.js";
import { euro } from "../utils.js";

export default function MovimentoRow({ m, senzaCategoria }) {
  const Icon = iconFor(m.categoria);
  const entrata = m.tipo === "Entrata";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 0",
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
          color: entrata ? C.green : C.inkMuted,
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
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {m.descrizione || m.categoria}
        </div>
        <div style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.72rem", marginTop: 2 }}>
          {[m.data, senzaCategoria ? null : m.categoria, m.conto].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div
        style={{
          color: entrata ? C.green : C.ink,
          fontFamily: fontDisplay,
          fontWeight: 700,
          fontSize: "0.88rem",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {entrata ? "+" : "−"}€ {euro(m.importo)}
      </div>
    </div>
  );
}
