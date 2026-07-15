import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { C, fontBody, fontDisplay, SHEET_NAME, CATEGORIE_FISSE } from "./config.js";
import { euro, euro0, infoMese, chiaveOrdinamentoMese, parseGiorno } from "./utils.js";
import { useSheetData } from "./useSheetData.js";
import { Icona } from "./components/Icona.jsx";
import { SegmentToggle, StatChip, Verdetto, SegnaleCard } from "./components/Controlli.jsx";
import { DrawerTrasferimenti } from "./components/DrawerTrasferimenti.jsx";
import { CategoryBar, AndamentoCategoria, FisseVariabili, ReceiptTape } from "./components/Carte.jsx";

export default function App() {
  const { loading, error, rows, scartate, budgetManuale, ricarica } = useSheetData();
  const [drawerTrasf, setDrawerTrasf] = useState(false);

  const mesiDisponibili = useMemo(() => {
    const uniq = [...new Set(rows.map((r) => r.mese))].filter(Boolean);
    return uniq
      .map((m, i) => ({ m, k: chiaveOrdinamentoMese(m, i) }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.m);
  }, [rows]);

  const [mese, setMese] = useState(null);
  useEffect(() => {
    if (!mese && mesiDisponibili.length > 0) setMese(mesiDisponibili[mesiDisponibili.length - 1]);
  }, [mesiDisponibili, mese]);

  const meseIndex = mesiDisponibili.indexOf(mese);
  const meseScorso = meseIndex > 0 ? mesiDisponibili[meseIndex - 1] : null;
  const mesiPrecedenti = meseIndex > 0 ? mesiDisponibili.slice(0, meseIndex) : [];

  const calcolaTotali = (m) => {
    const righe = rows.filter((r) => r.mese === m);
    const operative = righe.filter((r) => !r.trasferimento);
    const entrate = operative.filter((r) => r.importo > 0).reduce((s, r) => s + r.importo, 0);
    const uscite = operative.filter((r) => r.importo < 0).reduce((s, r) => s + Math.abs(r.importo), 0);
    const trasf = righe.filter((r) => r.trasferimento);
    const trasfOut = trasf.filter((r) => r.importo < 0).reduce((s, r) => s + Math.abs(r.importo), 0);
    const trasfIn = trasf.filter((r) => r.importo > 0).reduce((s, r) => s + r.importo, 0);
    return { entrate, uscite, trasfOut, trasfIn, trasfCount: trasf.length };
  };

  const corrente = mese ? calcolaTotali(mese) : { entrate: 0, uscite: 0, trasfOut: 0, trasfIn: 0, trasfCount: 0 };
  const precedente = meseScorso ? calcolaTotali(meseScorso) : null;
  const entrateDelta = precedente && precedente.entrate ? ((corrente.entrate - precedente.entrate) / precedente.entrate) * 100 : null;
  const usciteDelta = precedente && precedente.uscite ? ((corrente.uscite - precedente.uscite) / precedente.uscite) * 100 : null;
  const saldo = corrente.entrate - corrente.uscite;
  const tassoRisparmio = corrente.entrate > 0 ? saldo / corrente.entrate : null;

  // trasferimenti del mese selezionato (per il drawer di dettaglio)
  const trasferimentiMese = useMemo(() => {
    if (!mese) return [];
    return rows.filter((r) => r.mese === mese && r.trasferimento);
  }, [rows, mese]);

  // spese e entrate per categoria nel mese selezionato
  const perCategoria = (tipo) => {
    if (!mese) return [];
    const map = {};
    rows.filter((r) => r.mese === mese && r.tipo === tipo && !r.trasferimento).forEach((r) => {
      map[r.categoria] = (map[r.categoria] || 0) + Math.abs(r.importo);
    });
    return Object.entries(map).map(([nome, valore]) => ({ nome, valore })).sort((a, b) => b.valore - a.valore);
  };
  const categorieSpese = useMemo(() => perCategoria("Spesa"), [rows, mese]);
  const categorieEntrate = useMemo(() => perCategoria("Entrata"), [rows, mese]);

  // categoria + tipo selezionati per il grafico dei parziali
  const [selezione, setSelezione] = useState(null); // { nome, tipo }
  useEffect(() => {
    if (categorieSpese.length === 0 && categorieEntrate.length === 0) return;
    const pool = selezione && selezione.tipo === "Entrata" ? categorieEntrate : categorieSpese;
    const esiste = selezione && pool.some((c) => c.nome === selezione.nome);
    if (!selezione || !esiste) {
      if (categorieSpese.length > 0) setSelezione({ nome: categorieSpese[0].nome, tipo: "Spesa" });
      else setSelezione({ nome: categorieEntrate[0].nome, tipo: "Entrata" });
    }
  }, [categorieSpese, categorieEntrate]);

  const serieCategoria = useMemo(() => {
    if (!selezione) return [];
    return mesiDisponibili.map((m) => {
      const valore = rows
        .filter((r) => r.mese === m && r.tipo === selezione.tipo && r.categoria === selezione.nome)
        .reduce((s, r) => s + Math.abs(r.importo), 0);
      return { mese: m, valore: Math.round(valore * 100) / 100 };
    });
  }, [rows, mesiDisponibili, selezione]);

  const trend = useMemo(() => {
    const ultimiMesi = mesiDisponibili.slice(-6);
    return ultimiMesi.map((m) => {
      const t = calcolaTotali(m);
      return { mese: m, Entrate: Math.round(t.entrate), Uscite: Math.round(t.uscite) };
    });
  }, [rows, mesiDisponibili]);

  const transazioniRecenti = useMemo(() => {
    if (!mese) return [];
    return rows.filter((r) => r.mese === mese && !r.trasferimento).slice(-10).reverse();
  }, [rows, mese]);

  // fisse vs variabili nel mese
  const speseFisse = categorieSpese.filter((c) => CATEGORIE_FISSE.includes(c.nome)).reduce((s, c) => s + c.valore, 0);
  const speseVariabili = corrente.uscite - speseFisse;

  // media storica uscite (mesi precedenti a quello selezionato)
  const mediaUsciteStorica = useMemo(() => {
    if (mesiPrecedenti.length === 0) return null;
    const tot = mesiPrecedenti.reduce((s, m) => s + calcolaTotali(m).uscite, 0);
    return tot / mesiPrecedenti.length;
  }, [rows, mesiPrecedenti]);

  // media storica per categoria (solo spese, mesi precedenti)
  const mediaCategorie = useMemo(() => {
    const somme = {}; const conteggi = {};
    mesiPrecedenti.forEach((m) => {
      const perCat = {};
      rows.filter((r) => r.mese === m && r.tipo === "Spesa" && !r.trasferimento).forEach((r) => {
        perCat[r.categoria] = (perCat[r.categoria] || 0) + Math.abs(r.importo);
      });
      Object.entries(perCat).forEach(([c, v]) => {
        somme[c] = (somme[c] || 0) + v;
        conteggi[c] = (conteggi[c] || 0) + 1;
      });
    });
    const media = {};
    Object.keys(somme).forEach((c) => { media[c] = somme[c] / conteggi[c]; });
    return media;
  }, [rows, mesiPrecedenti]);

  // ---- budget per categoria: dal foglio "Budget" se presente, altrimenti automatico (media storica +5%) ----
  const budgets = useMemo(() => {
    const out = {};
    const arrotonda = (v) => Math.max(10, Math.round(v / 10) * 10);
    categorieSpese.forEach((c) => {
      if (budgetManuale[c.nome]) out[c.nome] = { valore: budgetManuale[c.nome], fonte: "manuale" };
      else if (mediaCategorie[c.nome]) out[c.nome] = { valore: arrotonda(mediaCategorie[c.nome] * 1.05), fonte: "auto" };
    });
    return out;
  }, [categorieSpese, mediaCategorie, budgetManuale]);
  const budgetTotale = Object.values(budgets).reduce((s, b) => s + b.valore, 0);
  const spesoConBudget = categorieSpese.filter((c) => budgets[c.nome]).reduce((s, c) => s + c.valore, 0);

  // ---- verdetto principale ----
  const verdetto = useMemo(() => {
    if (!mese) return null;
    if (mediaUsciteStorica === null || mediaUsciteStorica === 0) {
      return { testo: "Primo mese di dati: da qui in poi ogni mese potrò confrontarti con la tua media.", tono: "ambra" };
    }
    const diff = ((corrente.uscite - mediaUsciteStorica) / mediaUsciteStorica) * 100;
    if (Math.abs(diff) < 8) {
      return { testo: `Tutto regolare: le uscite sono in linea con la tua media (€ ${euro0(mediaUsciteStorica)} al mese).`, tono: "verde" };
    }
    if (diff > 0) {
      return {
        testo: `Stai spendendo il ${Math.round(diff)}% in più della tua media mensile (€ ${euro0(mediaUsciteStorica)}).`,
        tono: diff > 25 ? "corallo" : "ambra",
      };
    }
    return { testo: `Ottimo: stai spendendo il ${Math.abs(Math.round(diff))}% in meno della tua media mensile (€ ${euro0(mediaUsciteStorica)}).`, tono: "verde" };
  }, [mese, corrente.uscite, mediaUsciteStorica]);

  // ---- proiezione fine mese (solo se il mese è "in corso" nei dati) ----
  const proiezione = useMemo(() => {
    if (!mese || meseIndex !== mesiDisponibili.length - 1) return null;
    const { meseIdx, anno } = infoMese(mese);
    if (meseIdx === -1) return null;
    const giorniMese = new Date(anno || new Date().getFullYear(), meseIdx + 1, 0).getDate();
    const giorni = rows.filter((r) => r.mese === mese).map((r) => parseGiorno(r.data)).filter((g) => g !== null);
    if (giorni.length === 0) return null;
    const giornoMax = Math.max(...giorni);
    if (giornoMax < 5 || giornoMax >= giorniMese - 1) return null;
    return { valore: (corrente.uscite / giornoMax) * giorniMese, giorno: giornoMax, giorniMese };
  }, [rows, mese, meseIndex, mesiDisponibili, corrente.uscite]);

  // ---- segnali automatici ----
  const segnali = useMemo(() => {
    if (!mese) return [];
    const out = [];

    // budget sforati o quasi
    categorieSpese.forEach((c) => {
      const b = budgets[c.nome];
      if (!b || c.valore < 15) return;
      if (c.valore > b.valore) {
        out.push({
          tono: "corallo",
          titolo: `${c.nome} oltre budget: € ${euro0(c.valore)} su € ${euro0(b.valore)}`,
          dettaglio: b.fonte === "auto"
            ? `Budget automatico dalla tua media storica (≈ € ${euro0(mediaCategorie[c.nome] || b.valore)}/mese).`
            : "Budget impostato da te nel foglio.",
          peso: (c.valore - b.valore) + 2000,
        });
      } else if (c.valore > b.valore * 0.85) {
        out.push({
          tono: "ambra",
          titolo: `${c.nome} al ${Math.round((c.valore / b.valore) * 100)}% del budget (€ ${euro0(b.valore)})`,
          dettaglio: `Restano € ${euro0(b.valore - c.valore)}.`,
          peso: c.valore,
        });
      }
    });

    // spese singole anomale
    const mediaTx = {};
    const contTx = {};
    rows.filter((r) => r.tipo === "Spesa" && !r.trasferimento).forEach((r) => {
      mediaTx[r.categoria] = (mediaTx[r.categoria] || 0) + Math.abs(r.importo);
      contTx[r.categoria] = (contTx[r.categoria] || 0) + 1;
    });
    Object.keys(mediaTx).forEach((c) => (mediaTx[c] = mediaTx[c] / contTx[c]));
    const anomale = rows
      .filter((r) => r.mese === mese && r.tipo === "Spesa" && !r.trasferimento)
      .filter((r) => {
        const m = mediaTx[r.categoria] || 0;
        return contTx[r.categoria] >= 4 && Math.abs(r.importo) >= Math.max(60, m * 2.5);
      })
      .sort((a, b) => Math.abs(b.importo) - Math.abs(a.importo))
      .slice(0, 2);
    anomale.forEach((r) => {
      out.push({
        tono: "ambra",
        titolo: `Spesa fuori scala: ${r.descrizione || r.categoria} — € ${euro0(r.importo)}`,
        dettaglio: `Molto sopra la tua spesa tipica in ${r.categoria} (≈ € ${euro0(mediaTx[r.categoria])}).`,
        peso: Math.abs(r.importo),
      });
    });

    // microspese che si sommano
    const micro = rows.filter((r) => r.mese === mese && r.tipo === "Spesa" && !r.trasferimento && Math.abs(r.importo) > 0 && Math.abs(r.importo) < 15);
    const totMicro = micro.reduce((s, r) => s + Math.abs(r.importo), 0);
    if (micro.length >= 8) {
      out.push({
        tono: "ambra",
        titolo: `${micro.length} microspese sotto i €15 = € ${euro0(totMicro)}`,
        dettaglio: "Sono le spese più facili da dimenticare: da sole fanno una voce di bilancio.",
        peso: totMicro,
      });
    }

    // risparmio
    if (tassoRisparmio !== null) {
      if (tassoRisparmio < 0) {
        out.push({ tono: "corallo", titolo: "Questo mese hai speso più di quanto hai incassato", dettaglio: `Saldo € ${euro0(saldo)} in negativo.`, peso: 10000 });
      } else if (tassoRisparmio < 0.1) {
        out.push({ tono: "ambra", titolo: `Risparmio sottile: ${Math.round(tassoRisparmio * 100)}% delle entrate`, dettaglio: "Sotto il 10% basta un imprevisto per andare in rosso.", peso: 5000 });
      } else if (tassoRisparmio >= 0.2) {
        out.push({ tono: "verde", titolo: `Stai mettendo da parte il ${Math.round(tassoRisparmio * 100)}% delle entrate`, dettaglio: "Sopra il 20%: ottimo margine di sicurezza.", peso: 1 });
      }
    }

    // fisse troppo pesanti
    if (corrente.uscite > 0 && speseFisse / corrente.uscite > 0.6) {
      out.push({
        tono: "ambra",
        titolo: `Le spese fisse assorbono il ${Math.round((speseFisse / corrente.uscite) * 100)}% delle uscite`,
        dettaglio: "Margine di manovra ridotto: vale la pena rivedere abbonamenti e contratti.",
        peso: 3000,
      });
    }

    // categorie ben sotto media (max 1, per chiudere in positivo)
    const positive = categorieSpese
      .filter((c) => {
        const media = mediaCategorie[c.nome];
        return media && c.valore < media * 0.6 && media - c.valore >= 20;
      })
      .sort((a, b) => (mediaCategorie[b.nome] - b.valore) - (mediaCategorie[a.nome] - a.valore))
      .slice(0, 1);
    positive.forEach((c) => {
      out.push({
        tono: "verde",
        titolo: `${c.nome} ben sotto la tua media: € ${euro0(c.valore)} invece di ≈ € ${euro0(mediaCategorie[c.nome])}`,
        peso: 1,
      });
    });

    const ordine = { corallo: 0, ambra: 1, verde: 2 };
    return out.sort((a, b) => ordine[a.tono] - ordine[b.tono] || b.peso - a.peso).slice(0, 6);
  }, [rows, mese, categorieSpese, mediaCategorie, budgets, tassoRisparmio, saldo, speseFisse, corrente.uscite]);

  const maxSpese = categorieSpese.length ? Math.max(...categorieSpese.map((c) => c.valore)) : 0;
  const maxEntrate = categorieEntrate.length ? Math.max(...categorieEntrate.map((c) => c.valore)) : 0;
  const trasfSbilanciati = Math.abs(corrente.trasfOut - corrente.trasfIn) > 0.005;

  return (
    <div className="min-h-screen w-full" style={{ background: C.bg, fontFamily: fontBody }}>
      {drawerTrasf && (
        <DrawerTrasferimenti
          trasferimenti={trasferimentiMese}
          mese={mese}
          onClose={() => setDrawerTrasf(false)}
        />
      )}
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12"
        style={{
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
          paddingTop: "max(2rem, env(safe-area-inset-top))",
          paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        }}>
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.surfaceAlt, color: C.green }}>
              <Icona nomi={["Wallet"]} size={19} />
            </div>
            <div>
              <div style={{ color: C.ink, fontFamily: fontBody, fontWeight: 800 }} className="text-lg leading-none">Portafoglio</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: loading ? C.amber : error ? C.coral : C.green }} />
                <span className="text-xs" style={{ color: C.inkMuted, fontFamily: fontBody }}>
                  {loading ? "Caricamento dal foglio..." : error ? "Errore di lettura" : `Collegato a "${SHEET_NAME}"`}
                </span>
                {!loading && (
                  <button onClick={ricarica} title="Ricarica i dati dal foglio" className="ml-1 p-0.5 rounded" style={{ color: C.inkMuted }}>
                    <Icona nomi={["RefreshCw"]} size={11} />
                  </button>
                )}
              </div>
              {!loading && !error && scartate > 0 && (
                <div className="text-xs mt-0.5" style={{ color: C.amber, fontFamily: fontBody }}>
                  {scartate} {scartate === 1 ? "riga ignorata" : "righe ignorate"}: data e mese non leggibili nel foglio.
                </div>
              )}
            </div>
          </div>
          {mesiDisponibili.length > 0 && (
            <SegmentToggle options={mesiDisponibili} value={mese} onChange={(m) => { setMese(m); setDrawerTrasf(false); }} />
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 justify-center py-20" style={{ color: C.inkMuted }}>
            <Icona nomi={["LoaderCircle", "Loader2"]} size={18} className="animate-spin" /> Carico i dati dal foglio...
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-6 flex items-start gap-3" style={{ background: C.surface, border: `1px solid ${C.coral}55` }}>
            <Icona nomi={["CircleAlert", "AlertCircle"]} size={18} style={{ color: C.coral }} className="shrink-0 mt-0.5" />
            <div style={{ color: C.ink, fontFamily: fontBody, fontSize: "0.9rem" }}>
              {error}. Controlla che il foglio sia condiviso con accesso "Chiunque abbia il link" (visualizzatore).
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="grid md:grid-cols-5 gap-5">
            <div className="md:col-span-3 space-y-5">

              {/* SALDO + VERDETTO */}
              <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
                <div className="text-xs mb-2" style={{ color: C.inkMuted, letterSpacing: "0.06em" }}>
                  SALDO NETTO — {(mese || "").toUpperCase()}
                </div>
                <div style={{ color: saldo >= 0 ? C.ink : C.coral, fontFamily: fontDisplay, fontWeight: 700, fontSize: "clamp(1.8rem, 8vw, 2.5rem)", lineHeight: 1.1 }}>
                  {saldo < 0 ? "-" : ""}€ {euro(saldo)}
                </div>
                {verdetto && <Verdetto testo={verdetto.testo} tono={verdetto.tono} />}
                {proiezione && (
                  <Verdetto
                    testo={`Ritmo attuale (giorno ${proiezione.giorno} di ${proiezione.giorniMese}): a fine mese le uscite arriverebbero a circa € ${euro0(proiezione.valore)}.`}
                    tono={mediaUsciteStorica && proiezione.valore > mediaUsciteStorica * 1.1 ? "ambra" : "verde"}
                  />
                )}
                <div className="flex gap-3 mt-5 flex-wrap">
                  <StatChip label="ENTRATE" value={corrente.entrate} delta={entrateDelta} positive />
                  <StatChip label="USCITE" value={corrente.uscite} delta={usciteDelta} positive={false} />
                  <StatChip
                    label="RISPARMIO"
                    value={saldo}
                    sub={tassoRisparmio !== null ? `${Math.round(tassoRisparmio * 100)}% delle entrate` : "—"}
                    subColor={tassoRisparmio === null ? C.inkMuted : tassoRisparmio < 0 ? C.coral : tassoRisparmio < 0.1 ? C.amber : C.green}
                  />
                </div>
                {corrente.trasfCount > 0 && (
                  <button onClick={() => setDrawerTrasf(true)}
                    className="flex items-center gap-3 mt-3 rounded-2xl px-4 py-3 w-full text-left transition-colors"
                    style={{ background: C.surfaceAlt, border: `1px dashed ${trasfSbilanciati ? C.amber + "88" : C.hairline}` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.surface, color: C.inkMuted }}>
                      <Icona nomi={["ArrowLeftRight"]} size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs" style={{ color: C.inkMuted, letterSpacing: "0.04em" }}>
                        TRA CONTI — {corrente.trasfCount} {corrente.trasfCount === 1 ? "movimento" : "movimenti"} (esclusi dai totali)
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: C.ink, fontFamily: fontDisplay, fontWeight: 700 }}>
                        → € {euro(corrente.trasfOut)} <span style={{ color: C.inkMuted, fontWeight: 400 }}>·</span> ← € {euro(corrente.trasfIn)}
                      </div>
                      {trasfSbilanciati && (
                        <div className="text-xs mt-0.5" style={{ color: C.amber }}>
                          Non quadrano: € {euro(corrente.trasfOut - corrente.trasfIn)} di differenza — tocca per il dettaglio.
                        </div>
                      )}
                    </div>
                    <Icona nomi={["ChevronRight"]} size={15} style={{ color: C.inkMuted }} className="shrink-0" />
                  </button>
                )}
              </div>

              {/* SEGNALI */}
              <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
                <div className="text-xs mb-2" style={{ color: C.inkMuted, letterSpacing: "0.06em" }}>
                  SEGNALI DEL MESE
                </div>
                {segnali.length === 0 && (
                  <div className="text-sm py-3" style={{ color: C.inkMuted, fontFamily: fontBody }}>
                    Nessun segnale particolare: mese nella norma.
                  </div>
                )}
                {segnali.map((s, i) => <SegnaleCard key={i} s={s} />)}
              </div>

              {/* TREND */}
              <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
                <div className="text-xs mb-4" style={{ color: C.inkMuted, letterSpacing: "0.06em" }}>
                  TREND ULTIMI MESI
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={trend} margin={{ left: -20, right: 10 }}>
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
                    <XAxis dataKey="mese" stroke={C.inkMuted} tick={{ fontSize: 11, fontFamily: fontBody }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: C.surfaceAlt, border: `1px solid ${C.hairline}`, borderRadius: 10, fontFamily: fontBody, fontSize: 12 }}
                      labelStyle={{ color: C.ink }} formatter={(v) => `€ ${euro(v)}`} />
                    <Area type="monotone" dataKey="Entrate" stroke={C.green} fill="url(#gE)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Uscite" stroke={C.coral} fill="url(#gU)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.inkMuted }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: C.green }} /> Entrate
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.inkMuted }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: C.coral }} /> Uscite
                  </div>
                </div>
              </div>

              {/* ANDAMENTO CATEGORIA */}
              {selezione && serieCategoria.length > 0 && (
                <AndamentoCategoria categoria={selezione.nome} tipo={selezione.tipo} dati={serieCategoria} meseCorrente={mese} />
              )}

              {/* FISSE vs VARIABILI */}
              {corrente.uscite > 0 && <FisseVariabili fisse={speseFisse} variabili={speseVariabili} />}

              {/* SPESE PER CATEGORIA */}
              <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <div className="text-xs" style={{ color: C.inkMuted, letterSpacing: "0.06em" }}>
                    SPESE PER CATEGORIA
                  </div>
                  {budgetTotale > 0 && (
                    <div className="text-xs" style={{ fontFamily: fontDisplay, color: spesoConBudget > budgetTotale ? C.coral : C.inkMuted }}>
                      € {euro0(spesoConBudget)} / {euro0(budgetTotale)} budget
                    </div>
                  )}
                </div>
                <div className="text-xs mb-2" style={{ color: `${C.inkMuted}99`, fontFamily: fontBody }}>
                  La barra è la quota di budget usata: ambra oltre l'85%, corallo se sforato. Tocca per l'andamento nel tempo.
                </div>
                {categorieSpese.map((c) => (
                  <CategoryBar key={c.nome} {...c} max={maxSpese} budget={budgets[c.nome]}
                    attiva={selezione && selezione.tipo === "Spesa" && c.nome === selezione.nome}
                    onClick={() => setSelezione({ nome: c.nome, tipo: "Spesa" })} />
                ))}
              </div>

              {/* ENTRATE PER CATEGORIA */}
              {categorieEntrate.length > 0 && (
                <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.hairline}` }}>
                  <div className="text-xs mb-2" style={{ color: C.inkMuted, letterSpacing: "0.06em" }}>
                    ENTRATE PER CATEGORIA
                  </div>
                  {categorieEntrate.map((c) => (
                    <CategoryBar key={c.nome} {...c} max={maxEntrate} colore={C.green}
                      attiva={selezione && selezione.tipo === "Entrata" && c.nome === selezione.nome}
                      onClick={() => setSelezione({ nome: c.nome, tipo: "Entrata" })} />
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="sticky top-6">
                <ReceiptTape transazioni={transazioniRecenti} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
