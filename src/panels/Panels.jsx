/* ------------------------------------------------------------------ *
 *  PANNELLI — Categorie · Da pagare · Andamento
 * ------------------------------------------------------------------ */

import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { C, fontBody, fontDisplay, contaNelTotale } from "../config.js";
import { euro } from "../utils.js";
import BottomSheet from "../components/BottomSheet.jsx";
import { CategoryBar, RicorrenteRow } from "../components/Ui.jsx";
import MovimentoRow from "../components/MovimentoRow.jsx";
import PagaRicorrente from "../components/PagaRicorrente.jsx";
import { inviaAlFoglio, leggiUrlScript } from "../scriptApi.js";

const Vuoto = ({ children }) => (
  <div style={{ color: C.inkMuted, textAlign: "center", padding: "30px 0", fontSize: "0.88rem" }}>{children}</div>
);

/* ---------------------------- CATEGORIE ---------------------------- */
// Tocca una categoria per vedere sotto le sue spese del mese (tocca di nuovo per chiudere).
export function PanelCategorie({ open, onClose, mese, speso, categorie, maxCat, righeMese = [] }) {
  const [aperta, setAperta] = useState(null);

  // si riparte chiusi quando si cambia mese o si chiude il pannello
  useEffect(() => setAperta(null), [mese, open]);

  // spese del mese raggruppate per categoria, dalla più recente
  const perCategoria = useMemo(() => {
    const map = {};
    righeMese
      .filter((r) => r.tipo === "Spesa" && contaNelTotale(r))
      .forEach((r) => {
        (map[r.categoria] = map[r.categoria] || []).push(r);
      });
    Object.values(map).forEach((lista) =>
      lista.sort((a, b) => (b.dataObj?.getTime() || 0) - (a.dataObj?.getTime() || 0))
    );
    return map;
  }, [righeMese]);

  return (
    <BottomSheet open={open} title="Categorie" subtitle={`${mese || ""} · € ${euro(speso)} spesi`} onClose={onClose}>
      {categorie.length === 0 ? (
        <Vuoto>Nessuna spesa registrata in questo mese.</Vuoto>
      ) : (
        categorie.map((c) => {
          const movimenti = perCategoria[c.nome] || [];
          const isAperta = aperta === c.nome;
          return (
            <div key={c.nome}>
              <CategoryBar
                {...c}
                max={maxCat}
                conteggio={movimenti.length}
                aperta={isAperta}
                onClick={() => setAperta(isAperta ? null : c.nome)}
              />
              {isAperta && (
                <div
                  style={{
                    margin: "2px 0 10px 44px",
                    paddingLeft: 12,
                    borderLeft: `2px solid ${C.hairline}`,
                  }}
                >
                  {movimenti.map((m, i) => (
                    <MovimentoRow key={`${m.data}-${m.descrizione}-${i}`} m={m} senzaCategoria />
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "9px 0 2px",
                      color: C.inkMuted,
                      fontSize: "0.74rem",
                    }}
                  >
                    <span>
                      {movimenti.length} {movimenti.length === 1 ? "movimento" : "movimenti"}
                      {speso > 0 ? ` · ${Math.round((c.valore / speso) * 100)}% del mese` : ""}
                    </span>
                    <span style={{ fontFamily: fontDisplay }}>€ {euro(c.valore)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </BottomSheet>
  );
}

/* ---------------------------- DA PAGARE ---------------------------- */
export function PanelDaPagare({
  open,
  onClose,
  ricorrentiOk,
  isMeseCorrente,
  ricorrentiStato,
  daPagare,
  giorniRestanti,
  onPagata,
  onAnnullata,
}) {
  // spesa fissa aperta per cambiare l'importo (tocco sulla riga)
  const [aperta, setAperta] = useState(null);
  // spesa in invio (tocco su "Paga") e avviso in basso con "Annulla"
  const [invio, setInvio] = useState(null);
  const [avviso, setAvviso] = useState(null); // { testo, tipo: ok|errore, pagata? }
  useEffect(() => setAperta(null), [open]);

  // l'avviso sparisce da solo dopo qualche secondo
  useEffect(() => {
    if (!avviso || avviso.inAnnullo) return;
    const t = setTimeout(() => setAvviso(null), avviso.tipo === "ok" ? 6000 : 5000);
    return () => clearTimeout(t);
  }, [avviso]);

  // Un tocco su "Paga": scrive subito la riga con l'importo del tab Ricorrenti.
  const pagaSubito = async (r, key) => {
    if (!leggiUrlScript()) {
      setAperta(key); // primo uso: il riquadro chiede l'indirizzo dello script
      return;
    }
    setInvio(key);
    setAvviso(null);
    try {
      const esito = await inviaAlFoglio({
        action: "ricorrente",
        descrizione: r.descrizione,
        importo: r.importo,
        categoria: r.categoria,
        conto: r.conto || "",
      });
      if (esito.status === "ok") {
        const pagata = { ...r, importo: esito.importo ?? r.importo, data: esito.data, riga: esito.riga };
        onPagata(pagata);
        setAvviso({ tipo: "ok", testo: `${r.descrizione} · € ${euro(pagata.importo)} registrata`, pagata });
      } else if (esito.status === "duplicato") {
        setAvviso({ tipo: "errore", testo: `${r.descrizione} è già registrata questo mese.` });
      } else {
        setAvviso({ tipo: "errore", testo: esito.testo || "Errore dallo script." });
      }
    } catch (err) {
      setAvviso({ tipo: "errore", testo: err.message || String(err) });
    } finally {
      setInvio(null);
    }
  };

  const annulla = async () => {
    const p = avviso?.pagata;
    if (!p) return;
    setAvviso({ ...avviso, inAnnullo: true });
    try {
      const esito = await inviaAlFoglio({ action: "annullaRicorrente", riga: p.riga, descrizione: p.descrizione });
      if (esito.status === "ok") {
        onAnnullata && onAnnullata(p.riga);
        setAvviso({ tipo: "info", testo: `${p.descrizione}: annullata` });
      } else {
        setAvviso({ tipo: "errore", testo: esito.testo || "Non sono riuscito ad annullare." });
      }
    } catch (err) {
      setAvviso({ tipo: "errore", testo: err.message || String(err) });
    }
  };

  return (
    <>
    <BottomSheet
      open={open}
      title="Da pagare"
      subtitle={
        isMeseCorrente && ricorrentiOk
          ? `€ ${euro(daPagare)} entro fine mese · ${giorniRestanti} giorni rimasti`
          : undefined
      }
      onClose={onClose}
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
            Una riga per ogni spesa fissa (affitto, Netflix, rata, bolletta). “Giorno” è il giorno del mese in cui esce;
            “Attivo” = SI/NO.
          </div>
        </div>
      ) : !isMeseCorrente ? (
        <Vuoto>La proiezione è disponibile solo sul mese in corso.</Vuoto>
      ) : ricorrentiStato.length === 0 ? (
        <Vuoto>Nessuna spesa ricorrente attiva.</Vuoto>
      ) : (
        <>
          {ricorrentiStato.map((r, i) => {
            const key = `${r.descrizione}-${i}`;
            const pagabile = r.stato !== "pagata" && !!onPagata;
            const isAperta = aperta === key;
            return (
              <div key={key}>
                <RicorrenteRow
                  r={r}
                  aperta={isAperta}
                  onClick={pagabile ? () => setAperta(isAperta ? null : key) : undefined}
                  onPaga={pagabile && !isAperta ? () => pagaSubito(r, key) : undefined}
                  invio={invio === key}
                />
                {isAperta && (
                  <PagaRicorrente
                    r={r}
                    onAnnulla={() => setAperta(null)}
                    onPagata={(pagata) => {
                      setAperta(null);
                      onPagata(pagata);
                      setAvviso({ tipo: "ok", testo: `${pagata.descrizione} · € ${euro(pagata.importo)} registrata`, pagata });
                    }}
                  />
                )}
              </div>
            );
          })}
          {onPagata && ricorrentiStato.some((r) => r.stato !== "pagata") && (
            <div style={{ color: C.inkMuted, fontSize: "0.72rem", marginTop: 10, lineHeight: 1.5 }}>
              “Paga” registra la spesa sul foglio con la data di oggi. Tocca la riga se l'importo è diverso.
            </div>
          )}
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
    {avviso && (
      <div
        role="status"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "calc(20px + env(safe-area-inset-bottom))",
          zIndex: 1000,
          width: "min(560px, calc(100% - 32px))",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 16,
          background: C.surfaceAlt,
          border: `1px solid ${avviso.tipo === "errore" ? C.coral : C.hairline}`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          fontFamily: fontBody,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, color: avviso.tipo === "errore" ? C.coral : C.ink, fontSize: "0.84rem" }}>
          {avviso.testo}
        </span>
        {avviso.pagata && (
          <button
            onClick={annulla}
            disabled={avviso.inAnnullo}
            style={{
              background: "none",
              border: "none",
              color: C.amber,
              fontFamily: fontBody,
              fontWeight: 700,
              fontSize: "0.84rem",
              cursor: "pointer",
              flexShrink: 0,
              opacity: avviso.inAnnullo ? 0.5 : 1,
            }}
          >
            {avviso.inAnnullo ? "Annullo…" : "Annulla"}
          </button>
        )}
      </div>
    )}
    </>
  );
}

/* ---------------------------- ANDAMENTO ---------------------------- */
export function PanelTrend({ open, onClose, trend }) {
  return (
    <BottomSheet open={open} title="Andamento" subtitle="Entrate e uscite per mese" onClose={onClose}>
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
  );
}
