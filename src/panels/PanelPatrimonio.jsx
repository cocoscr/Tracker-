/* ------------------------------------------------------------------ *
 *  PANNELLO PATRIMONIO
 *  Net worth · andamento · conti · posizioni · PAC · tasso di risparmio
 * ------------------------------------------------------------------ */

import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2 } from "lucide-react";
import { C, fontBody, fontDisplay, CATEGORIE_NON_SPESA } from "../config.js";
import { euro, euroCompact } from "../utils.js";
import { usePatrimonio } from "../usePatrimonio.js";
import BottomSheet from "../components/BottomSheet.jsx";
import { CategoryBar, PosizioneRow } from "../components/Ui.jsx";

const Sezione = ({ titolo, extra, children }) => (
  <div style={{ marginTop: 22 }}>
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 10,
        color: C.inkMuted,
        fontSize: "0.7rem",
        letterSpacing: "0.08em",
        marginBottom: 6,
      }}
    >
      <span>{titolo}</span>
      {extra}
    </div>
    {children}
  </div>
);

export default function PanelPatrimonio({ open, onClose, transazioni, mesiDisponibili }) {
  return (
    <BottomSheet open={open} title="Patrimonio" subtitle="Conti, investimenti e risparmio" onClose={onClose}>
      {open && <Contenuto transazioni={transazioni} mesiDisponibili={mesiDisponibili} />}
    </BottomSheet>
  );
}

function Contenuto({ transazioni, mesiDisponibili }) {
  const { loading, pronto, conti, totale, posizioni, storico } = usePatrimonio();

  // PAC cumulato per mese (dalle transazioni con categoria "PAC")
  const pac = useMemo(() => {
    let cum = 0;
    return mesiDisponibili.map((m) => {
      const v = transazioni
        .filter((r) => r.mese === m && r.categoria === "PAC")
        .reduce((s, r) => s + Math.abs(r.importo), 0);
      cum += v;
      return { mese: m, Cumulato: Math.round(cum) };
    });
  }, [transazioni, mesiDisponibili]);
  const pacTotale = pac.length ? pac[pac.length - 1].Cumulato : 0;

  // Tasso di risparmio degli ultimi 6 mesi
  const risparmio = useMemo(
    () =>
      mesiDisponibili.slice(-6).map((m) => {
        const righe = transazioni.filter((r) => r.mese === m);
        const entrate = righe.filter((r) => r.tipo === "Entrata").reduce((s, r) => s + Math.abs(r.importo), 0);
        const uscite = righe
          .filter((r) => r.tipo === "Spesa" && !CATEGORIE_NON_SPESA.includes(r.categoria))
          .reduce((s, r) => s + Math.abs(r.importo), 0);
        return { mese: m, tasso: entrate > 0 ? ((entrate - uscite) / entrate) * 100 : null };
      }),
    [transazioni, mesiDisponibili]
  );

  const totInvestito = posizioni.reduce((s, p) => s + p.investito, 0);
  const totPl = posizioni.reduce((s, p) => s + p.pl, 0);
  const maxConto = conti.length ? Math.max(...conti.map((c) => c.totale)) : 0;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "50px 0", color: C.inkMuted }}>
        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carico il patrimonio…
      </div>
    );
  }

  if (!pronto) {
    return (
      <div style={{ color: C.inkMuted, fontSize: "0.86rem", lineHeight: 1.65 }}>
        Aggiungi al foglio Google tre tab: <b style={{ color: C.ink }}>Patrimonio</b>,{" "}
        <b style={{ color: C.ink }}>Posizioni</b> e <b style={{ color: C.ink }}>Storico Patrimonio</b>.
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 12,
            background: C.surfaceAlt,
            fontFamily: fontDisplay,
            fontSize: "0.75rem",
            color: C.amber,
            lineHeight: 1.7,
          }}
        >
          Patrimonio · Conto, Saldo Iniziale, Rettifica, Delta Movimenti, Liquidità, Investimenti, Totale
          <br />
          Posizioni · Ticker, Nome, Conto, Quantità, PMC, Prezzo Manuale, Prezzo, Valore, Investito, P/L, P/L %
          <br />
          Storico Patrimonio · Data, Liquidità, Investimenti, Totale
        </div>
        <div style={{ marginTop: 10 }}>Le formule esatte sono nella guida passo-passo.</div>
      </div>
    );
  }

  return (
    <>
      {/* --- TOTALE --- */}
      <div style={{ color: C.inkMuted, fontSize: "0.7rem", letterSpacing: "0.08em" }}>PATRIMONIO TOTALE</div>
      <div style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700, fontSize: "2.1rem", lineHeight: 1.1 }}>
        € {euro(totale.totale)}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.inkMuted, fontSize: "0.68rem", letterSpacing: "0.05em", marginBottom: 3 }}>LIQUIDITÀ</div>
          <div style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.98rem" }}>
            € {euro(totale.liquidita)}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.inkMuted, fontSize: "0.68rem", letterSpacing: "0.05em", marginBottom: 3 }}>
            INVESTIMENTI
          </div>
          <div style={{ color: C.blue, fontFamily: fontDisplay, fontWeight: 700, fontSize: "0.98rem" }}>
            € {euro(totale.investimenti)}
          </div>
        </div>
      </div>

      {/* --- ANDAMENTO --- */}
      <Sezione titolo="ANDAMENTO">
        {storico.length < 2 ? (
          <div style={{ color: C.inkMuted, fontSize: "0.82rem", padding: "14px 0", lineHeight: 1.6 }}>
            Lo storico si popola da solo, un punto al giorno, tramite lo script sul foglio. Servono almeno due giorni.
          </div>
        ) : (
          <>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={storico} margin={{ left: -14, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="gPatTot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.green} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPatInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.blue} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.hairline} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke={C.inkMuted}
                    tick={{ fontSize: 10, fontFamily: fontBody }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    stroke={C.inkMuted}
                    tick={{ fontSize: 10, fontFamily: fontDisplay }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    tickFormatter={euroCompact}
                    domain={["auto", "auto"]}
                  />
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
                  <Area type="monotone" dataKey="Totale" stroke={C.green} fill="url(#gPatTot)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Investimenti" stroke={C.blue} fill="url(#gPatInv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.inkMuted, fontSize: "0.76rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.green }} /> Totale
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.inkMuted, fontSize: "0.76rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.blue }} /> Investimenti
              </div>
            </div>
          </>
        )}
      </Sezione>

      {/* --- CONTI --- */}
      <Sezione titolo="PER CONTO">
        {conti.map((c) => (
          <CategoryBar key={c.conto} nome={c.conto} valore={c.totale} max={maxConto} colore={C.blue} />
        ))}
      </Sezione>

      {/* --- POSIZIONI --- */}
      <Sezione
        titolo="POSIZIONI"
        extra={
          totInvestito > 0 ? (
            <span style={{ color: totPl >= 0 ? C.green : C.coral, fontFamily: fontDisplay, fontSize: "0.8rem" }}>
              {totPl >= 0 ? "+" : "-"}€ {euro(totPl)}
            </span>
          ) : null
        }
      >
        {posizioni.length === 0 ? (
          <div style={{ color: C.inkMuted, fontSize: "0.82rem", padding: "10px 0" }}>
            Nessuna posizione nel tab “Posizioni”.
          </div>
        ) : (
          posizioni.map((p) => <PosizioneRow key={`${p.ticker}-${p.conto}`} p={p} />)
        )}
      </Sezione>

      {/* --- PAC --- */}
      <Sezione titolo="PAC CUMULATO">
        <div style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700, fontSize: "1.35rem" }}>
          € {euro(pacTotale)}
        </div>
        {pac.length > 1 && (
          <div style={{ height: 110, marginTop: 6 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pac} margin={{ left: -22, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gPac" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.amber} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="mese"
                  stroke={C.inkMuted}
                  tick={{ fontSize: 10, fontFamily: fontBody }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
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
                <Area type="monotone" dataKey="Cumulato" stroke={C.amber} fill="url(#gPac)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Sezione>

      {/* --- TASSO DI RISPARMIO --- */}
      <Sezione titolo="TASSO DI RISPARMIO">
        {risparmio.map((r) => (
          <div key={r.mese} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
            <span style={{ color: C.inkMuted, fontSize: "0.74rem", width: 62, flexShrink: 0 }}>{r.mese}</span>
            <div style={{ flex: 1, height: 6, borderRadius: 999, overflow: "hidden", background: C.hairline }}>
              <div
                style={{
                  width: `${Math.min(Math.max(r.tasso || 0, 0), 100)}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: (r.tasso || 0) >= 0 ? C.green : C.coral,
                }}
              />
            </div>
            <span
              style={{ color: C.ink, fontFamily: fontDisplay, fontSize: "0.76rem", width: 40, textAlign: "right", flexShrink: 0 }}
            >
              {r.tasso === null ? "—" : `${Math.round(r.tasso)}%`}
            </span>
          </div>
        ))}
        <div style={{ color: C.inkMuted, fontSize: "0.72rem", marginTop: 8, lineHeight: 1.6 }}>
          (Entrate − spese) / entrate. {CATEGORIE_NON_SPESA.join(" e ")} non contano come spesa.
        </div>
      </Sezione>
    </>
  );
}
