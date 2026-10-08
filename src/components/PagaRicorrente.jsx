/* ------------------------------------------------------------------ *
 *  PAGA RICORRENTE — riquadro che si apre sotto una spesa fissa nel
 *  pannello "Da pagare": importo (modificabile) → "Segna pagata" →
 *  la riga viene scritta in Transazioni dall'Apps Script.
 *  Al primo uso chiede di incollare l'indirizzo dello script.
 * ------------------------------------------------------------------ */

import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { C, fontBody, fontDisplay } from "../config.js";
import { parseImporto } from "../utils.js";
import { inviaAlFoglio, leggiUrlScript, salvaUrlScript, urlScriptValido } from "../scriptApi.js";

const campo = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 12,
  border: `1px solid ${C.hairline}`,
  background: C.bg,
  color: C.ink,
  fontFamily: fontBody,
  fontSize: "16px", // 16px: sotto questa misura l'iPhone fa lo zoom sul campo
  outline: "none",
};

const bottone = (sfondo, testo) => ({
  flex: 1,
  padding: "11px 0",
  borderRadius: 999,
  border: sfondo === "transparent" ? `1px solid ${C.hairline}` : "none",
  background: sfondo,
  color: testo,
  fontFamily: fontBody,
  fontWeight: 700,
  fontSize: "0.86rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
});

const importoInCampo = (n) => (n > 0 ? n.toFixed(2).replace(".", ",") : "");

export default function PagaRicorrente({ r, onPagata, onAnnulla }) {
  const [url, setUrl] = useState(leggiUrlScript());
  const [urlBozza, setUrlBozza] = useState("");
  const [importo, setImporto] = useState(importoInCampo(r.importo));
  const [stato, setStato] = useState({ fase: "pronto", msg: "" }); // pronto | invio | duplicato | errore

  const box = {
    margin: "0 0 10px",
    padding: 14,
    borderRadius: 16,
    background: C.surfaceAlt,
    border: `1px solid ${C.hairline}`,
  };

  // --- primo uso: manca l'indirizzo dello script ---
  if (!url) {
    const ok = urlScriptValido(urlBozza);
    return (
      <div style={box}>
        <div style={{ color: C.ink, fontFamily: fontBody, fontWeight: 600, fontSize: "0.86rem", marginBottom: 6 }}>
          Collega l'app al foglio (solo la prima volta)
        </div>
        <div style={{ color: C.inkMuted, fontFamily: fontBody, fontSize: "0.76rem", lineHeight: 1.55, marginBottom: 10 }}>
          Incolla l'indirizzo dell'Apps Script: è lo stesso del comando rapido NFC (inizia con
          https://script.google.com/macros/s/… e finisce con /exec). Resta salvato solo su questo telefono.
        </div>
        <input
          value={urlBozza}
          onChange={(e) => setUrlBozza(e.target.value)}
          placeholder="https://script.google.com/macros/s/…/exec"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={campo}
        />
        {urlBozza && !ok && (
          <div style={{ color: C.coral, fontSize: "0.74rem", marginTop: 6 }}>
            Non sembra l'indirizzo giusto: deve iniziare con https://script.google.com/macros/s/ e finire con /exec
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={onAnnulla} style={bottone("transparent", C.inkMuted)}>
            Annulla
          </button>
          <button
            disabled={!ok}
            onClick={() => {
              salvaUrlScript(urlBozza);
              setUrl(urlBozza.trim());
            }}
            style={{ ...bottone(C.green, C.bg), opacity: ok ? 1 : 0.4 }}
          >
            Salva
          </button>
        </div>
      </div>
    );
  }

  const valore = parseImporto(importo);
  const valido = valore > 0;

  const invia = async (forza) => {
    setStato({ fase: "invio", msg: "" });
    try {
      const esito = await inviaAlFoglio({
        action: "ricorrente",
        descrizione: r.descrizione,
        importo: valore,
        categoria: r.categoria,
        conto: r.conto || "",
        forza: forza ? 1 : 0,
      });
      if (esito.status === "ok") {
        onPagata({ ...r, importo: esito.importo ?? valore, data: esito.data, riga: esito.riga });
      } else if (esito.status === "duplicato") {
        setStato({ fase: "duplicato", msg: esito.testo });
      } else {
        setStato({ fase: "errore", msg: esito.testo || esito.message || "Errore sconosciuto." });
      }
    } catch (err) {
      setStato({ fase: "errore", msg: err.message || String(err) });
    }
  };

  return (
    <div style={box}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <label style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.inkMuted, fontSize: "0.68rem", letterSpacing: "0.06em", marginBottom: 4 }}>IMPORTO €</div>
          <input
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            inputMode="decimal"
            style={{ ...campo, fontFamily: fontDisplay, fontWeight: 700 }}
          />
        </label>
        <div style={{ color: C.inkMuted, fontSize: "0.74rem", lineHeight: 1.5, paddingBottom: 4, textAlign: "right" }}>
          oggi
          {r.conto ? <><br />{r.conto}</> : null}
        </div>
      </div>

      {stato.msg && (
        <div
          style={{
            color: stato.fase === "duplicato" ? C.amber : C.coral,
            fontSize: "0.76rem",
            lineHeight: 1.5,
            marginTop: 10,
          }}
        >
          {stato.msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onAnnulla} style={bottone("transparent", C.inkMuted)}>
          Annulla
        </button>
        <button
          disabled={!valido || stato.fase === "invio"}
          onClick={() => invia(stato.fase === "duplicato")}
          style={{ ...bottone(C.green, C.bg), opacity: valido ? 1 : 0.4 }}
        >
          {stato.fase === "invio" ? (
            <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Check size={15} />
          )}
          {stato.fase === "duplicato" ? "Registra comunque" : "Segna pagata"}
        </button>
      </div>

      {stato.fase === "errore" && /indirizzo/i.test(stato.msg) && (
        <button
          onClick={() => {
            salvaUrlScript("");
            setUrl("");
          }}
          style={{ marginTop: 10, background: "none", border: "none", color: C.inkMuted, fontSize: "0.74rem", textDecoration: "underline", cursor: "pointer" }}
        >
          Reinserisci l'indirizzo dello script
        </button>
      )}
    </div>
  );
}
