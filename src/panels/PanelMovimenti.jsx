/* ------------------------------------------------------------------ *
 *  PANNELLO TRANSAZIONI — elenco dei movimenti del mese
 * ------------------------------------------------------------------ */

import React, { useMemo, useState } from "react";
import { C, fontBody } from "../config.js";
import { euro } from "../utils.js";
import BottomSheet from "../components/BottomSheet.jsx";
import MovimentoRow from "../components/MovimentoRow.jsx";

const PASSO = 40; // quanti movimenti mostrare per volta

export default function PanelMovimenti({ open, onClose, righeMese, mese }) {
  const [quanti, setQuanti] = useState(PASSO);

  // dal più recente al più vecchio
  const ordinate = useMemo(() => {
    const copia = [...righeMese];
    copia.sort((a, b) => {
      const ta = a.dataObj ? a.dataObj.getTime() : 0;
      const tb = b.dataObj ? b.dataObj.getTime() : 0;
      return tb - ta;
    });
    return copia;
  }, [righeMese]);

  const visibili = ordinate.slice(0, quanti);

  return (
    <BottomSheet
      open={open}
      title="Transazioni"
      subtitle={`${mese || ""} · ${ordinate.length} movimenti`}
      onClose={onClose}
    >
      {ordinate.length === 0 ? (
        <div style={{ color: C.inkMuted, textAlign: "center", padding: "30px 0", fontSize: "0.88rem" }}>
          Nessun movimento in questo mese.
        </div>
      ) : (
        <>
          {visibili.map((m, i) => (
            <MovimentoRow key={`${m.data}-${m.descrizione}-${i}`} m={m} />
          ))}

          {quanti < ordinate.length && (
            <button
              onClick={() => setQuanti((q) => q + PASSO)}
              style={{
                width: "100%",
                marginTop: 14,
                padding: "11px 0",
                borderRadius: 999,
                background: "transparent",
                border: `1px solid ${C.hairline}`,
                color: C.inkMuted,
                fontFamily: fontBody,
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Mostra altri {Math.min(PASSO, ordinate.length - quanti)}
            </button>
          )}
        </>
      )}
    </BottomSheet>
  );
}
