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
}) {
  // spesa fissa aperta per segnarla pagata (tocca una riga non ancora pagata)
  const [aperta, setAperta] = useState(null);
  useEffect(() => setAperta(null), [open]);

  return (
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
                />
                {isAperta && (
                  <PagaRicorrente
                    r={r}
                    onAnnulla={() => setAperta(null)}
                    onPagata={(pagata) => {
                      setAperta(null);
                      onPagata(pagata);
                    }}
                  />
                )}
              </div>
            );
          })}
          {onPagata && ricorrentiStato.some((r) => r.stato !== "pagata") && (
            <div style={{ color: C.inkMuted, fontSize: "0.72rem", marginTop: 10, lineHeight: 1.5 }}>
              Tocca una spesa per segnarla pagata: la riga viene scritta sul foglio con la data di oggi.
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
