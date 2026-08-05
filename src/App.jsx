/* ------------------------------------------------------------------ *
 *  APP — schermata principale
 *  Qui restano solo: header, saldo, tessere e collegamento ai pannelli.
 *  Colori e nomi dei fogli → config.js
 *  Parsing e formattazione → utils.js
 *  Lettura del foglio       → useSheetData.js / usePatrimonio.js
 * ------------------------------------------------------------------ */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  PieChart,
  CalendarClock,
  TrendingUp,
  Landmark,
  ReceiptText,
} from "lucide-react";
import { C, fontBody, fontDisplay } from "./config.js";
import { euro, norm, giorniNelMese } from "./utils.js";
import { useSheetData } from "./useSheetData.js";
import { MiniStat, Tile } from "./components/Ui.jsx";
import { PanelCategorie, PanelDaPagare, PanelTrend } from "./panels/Panels.jsx";
import PanelMovimenti from "./panels/PanelMovimenti.jsx";
import PanelPatrimonio from "./panels/PanelPatrimonio.jsx";

export default function Dashboard() {
  const { loading, error, rows, ricorrenti, ricorrentiOk } = useSheetData();
  const [panel, setPanel] = useState(null);
  const closePanel = useCallback(() => setPanel(null), []);

  const oggi = useMemo(() => new Date(), []);

  const mesiDisponibili = useMemo(() => [...new Set(rows.map((r) => r.mese))].filter(Boolean), [rows]);

  const [mese, setMese] = useState(null);
  useEffect(() => {
    if (!mese && mesiDisponibili.length > 0) setMese(mesiDisponibili[mesiDisponibili.length - 1]);
  }, [mesiDisponibili, mese]);

  const isMeseCorrente = mese && mese === mesiDisponibili[mesiDisponibili.length - 1];

  const righeMese = useMemo(() => rows.filter((r) => r.mese === mese), [rows, mese]);

  const entrate = useMemo(
    () => righeMese.filter((r) => r.tipo === "Entrata").reduce((s, r) => s + Math.abs(r.importo), 0),
    [righeMese]
  );
  const speso = useMemo(
    () => righeMese.filter((r) => r.tipo === "Spesa").reduce((s, r) => s + Math.abs(r.importo), 0),
    [righeMese]
  );

  // --- spese ricorrenti: stato pagata / in ritardo / in arrivo -------------
  const ricorrentiStato = useMemo(() => {
    if (!isMeseCorrente) return [];
    const descMese = righeMese.filter((r) => r.tipo === "Spesa").map((r) => norm(r.descrizione));
    const maxGiorno = giorniNelMese(oggi);
    const giornoOggi = oggi.getDate();
    return ricorrenti
      .map((r) => {
        const key = norm(r.descrizione);
        const pagata = key.length >= 3 && descMese.some((d) => d.includes(key) || key.includes(d));
        const giorno = Math.min(r.giorno, maxGiorno);
        const stato = pagata ? "pagata" : giorno < giornoOggi ? "ritardo" : "attesa";
        return { ...r, giorno, stato };
      })
      .sort((a, b) => {
        const ord = { ritardo: 0, attesa: 1, pagata: 2 };
        return ord[a.stato] - ord[b.stato] || a.giorno - b.giorno;
      });
  }, [ricorrenti, righeMese, isMeseCorrente, oggi]);

  const daPagare = useMemo(
    () => ricorrentiStato.filter((r) => r.stato !== "pagata").reduce((s, r) => s + r.importo, 0),
    [ricorrentiStato]
  );

  const saldoOggi = entrate - speso;
  const saldoProiettato = saldoOggi - daPagare;

  const categorie = useMemo(() => {
    const map = {};
    righeMese
      .filter((r) => r.tipo === "Spesa")
      .forEach((r) => {
        map[r.categoria] = (map[r.categoria] || 0) + Math.abs(r.importo);
      });
    return Object.entries(map)
      .map(([nome, valore]) => ({ nome, valore }))
      .sort((a, b) => b.valore - a.valore);
  }, [righeMese]);

  const maxCat = categorie.length ? Math.max(...categorie.map((c) => c.valore)) : 0;

  const trend = useMemo(
    () =>
      mesiDisponibili.slice(-6).map((m) => {
        const righe = rows.filter((r) => r.mese === m);
        return {
          mese: m,
          Entrate: Math.round(righe.filter((r) => r.tipo === "Entrata").reduce((s, r) => s + Math.abs(r.importo), 0)),
          Uscite: Math.round(righe.filter((r) => r.tipo === "Spesa").reduce((s, r) => s + Math.abs(r.importo), 0)),
        };
      }),
    [rows, mesiDisponibili]
  );

  const giorniRestanti = isMeseCorrente ? giorniNelMese(oggi) - oggi.getDate() : 0;

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: C.bg,
        fontFamily: fontBody,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Manrope:wght@400;500;600;700;800&display=swap');
        @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { -webkit-tap-highlight-color: transparent; }
        button { font: inherit; }`}</style>

      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          padding: "0 18px 40px",
          paddingTop: "max(76px, calc(env(safe-area-inset-top) + 28px))",
          paddingLeft: "max(18px, env(safe-area-inset-left))",
          paddingRight: "max(18px, env(safe-area-inset-right))",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: C.surfaceAlt,
              color: C.green,
            }}
          >
            <Wallet size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.ink, fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.1 }}>Portafoglio</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: loading ? C.amber : error ? C.coral : C.green,
                }}
              />
              <span style={{ color: C.inkMuted, fontSize: "0.73rem" }}>
                {loading
                  ? "Caricamento…"
                  : error
                  ? "Errore di lettura"
                  : `Aggiornato al ${oggi.toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`}
              </span>
            </div>
          </div>
          {mesiDisponibili.length > 1 && (
            <select
              value={mese || ""}
              onChange={(e) => setMese(e.target.value)}
              style={{
                background: C.surfaceAlt,
                color: C.ink,
                border: `1px solid ${C.hairline}`,
                borderRadius: 999,
                padding: "0 16px",
                height: 44,
                minWidth: 108,
                fontSize: "0.85rem",
                fontFamily: fontBody,
                fontWeight: 600,
                appearance: "none",
                textAlign: "center",
                textAlignLast: "center",
              }}
            >
              {mesiDisponibili
                .slice()
                .reverse()
                .map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </select>
          )}
        </div>

        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              padding: "70px 0",
              color: C.inkMuted,
            }}
          >
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carico i dati dal foglio…
          </div>
        )}

        {error && (
          <div
            style={{
              borderRadius: 18,
              padding: 20,
              display: "flex",
              gap: 11,
              background: C.surface,
              border: `1px solid ${C.coral}55`,
            }}
          >
            <AlertCircle size={18} style={{ color: C.coral, flexShrink: 0, marginTop: 2 }} />
            <div style={{ color: C.ink, fontSize: "0.88rem" }}>
              {error}. Controlla che il foglio sia condiviso con accesso “Chiunque abbia il link” (visualizzatore).
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* SALDO */}
            <div
              style={{
                borderRadius: 22,
                padding: "22px 20px 18px",
                background: C.surface,
                border: `1px solid ${C.hairline}`,
                marginBottom: 14,
              }}
            >
              <div style={{ color: C.inkMuted, fontSize: "0.7rem", letterSpacing: "0.08em", marginBottom: 6 }}>
                {isMeseCorrente ? "DISPONIBILE OGGI" : `SALDO — ${(mese || "").toUpperCase()}`}
              </div>
              <div
                style={{
                  color: saldoOggi >= 0 ? C.ink : C.coral,
                  fontFamily: fontDisplay,
                  fontWeight: 700,
                  fontSize: "2.4rem",
                  lineHeight: 1.05,
                }}
              >
                € {euro(saldoOggi)}
              </div>

              {isMeseCorrente && daPagare > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "11px 13px",
                    borderRadius: 14,
                    background: C.surfaceAlt,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: C.inkMuted, fontSize: "0.68rem", letterSpacing: "0.05em" }}>
                      A FINE MESE, DOPO € {euro(daPagare)} DA PAGARE
                    </div>
                    <div
                      style={{
                        color: saldoProiettato >= 0 ? C.green : C.coral,
                        fontFamily: fontDisplay,
                        fontWeight: 700,
                        fontSize: "1.3rem",
                        marginTop: 2,
                      }}
                    >
                      € {euro(saldoProiettato)}
                    </div>
                  </div>
                  <button
                    onClick={() => setPanel("dapagare")}
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.hairline}`,
                      color: C.inkMuted,
                      borderRadius: 999,
                      padding: "6px 11px",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Dettagli
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
                <MiniStat label="ENTRATE" value={entrate} tone={C.green} icon={ArrowUpRight} />
                <MiniStat label="SPESO" value={speso} tone={C.coral} icon={ArrowDownRight} />
                {isMeseCorrente && <MiniStat label="DA PAGARE" value={daPagare} tone={C.amber} icon={CalendarClock} />}
              </div>
            </div>

            {/* TESSERE */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Tile
                icon={ReceiptText}
                titolo="Transazioni"
                sub={
                  righeMese.length
                    ? `${righeMese.length} movimenti in ${mese}`
                    : "Nessun movimento nel periodo"
                }
                onClick={() => setPanel("movimenti")}
              />
              <Tile
                icon={PieChart}
                titolo="Categorie"
                sub={
                  categorie.length ? `${categorie.length} attive · top ${categorie[0].nome}` : "Nessuna spesa nel periodo"
                }
                onClick={() => setPanel("categorie")}
              />
              {ricorrentiOk && (
                <Tile
                  icon={CalendarClock}
                  titolo="Da pagare"
                  accent={C.coral}
                  sub={
                    !isMeseCorrente
                      ? "Solo per il mese in corso"
                      : daPagare > 0
                      ? `€ ${euro(daPagare)} nei prossimi ${giorniRestanti} giorni`
                      : "Tutto pagato, per ora"
                  }
                  onClick={() => setPanel("dapagare")}
                />
              )}
              <Tile
                icon={TrendingUp}
                titolo="Andamento"
                accent={C.green}
                sub={`Ultimi ${trend.length} mesi`}
                onClick={() => setPanel("trend")}
              />
              <Tile
                icon={Landmark}
                titolo="Patrimonio"
                accent={C.blue}
                sub="Conti, investimenti e risparmio"
                onClick={() => setPanel("patrimonio")}
              />
            </div>
          </>
        )}
      </div>

      {/* ---------------- PANNELLI ---------------- */}
      <PanelMovimenti open={panel === "movimenti"} onClose={closePanel} righeMese={righeMese} mese={mese} />

      <PanelCategorie
        open={panel === "categorie"}
        onClose={closePanel}
        mese={mese}
        speso={speso}
        categorie={categorie}
        maxCat={maxCat}
      />

      <PanelDaPagare
        open={panel === "dapagare"}
        onClose={closePanel}
        ricorrentiOk={ricorrentiOk}
        isMeseCorrente={isMeseCorrente}
        ricorrentiStato={ricorrentiStato}
        daPagare={daPagare}
        giorniRestanti={giorniRestanti}
      />

      <PanelTrend open={panel === "trend"} onClose={closePanel} trend={trend} />

      <PanelPatrimonio
        open={panel === "patrimonio"}
        onClose={closePanel}
        transazioni={rows}
        mesiDisponibili={mesiDisponibili}
      />
    </div>
  );
}
