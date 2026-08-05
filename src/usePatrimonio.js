/* ------------------------------------------------------------------ *
 *  DATA LAYER — patrimonio, posizioni, storico
 *  Viene chiamato solo quando si apre il pannello Patrimonio,
 *  così l'apertura dell'app resta veloce.
 * ------------------------------------------------------------------ */

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { SHEET_PATRIMONIO, SHEET_POSIZIONI, SHEET_STORICO } from "./config.js";
import { fetchCsv, intestazioniValide } from "./useSheetData.js";
import { parseNumber, parseData } from "./utils.js";

// Legge un tab e verifica le intestazioni: se il tab non esiste Google
// restituisce il primo foglio del file, quindi non ci si può fidare del solo 200 OK.
function leggiTab(nome, richieste) {
  return fetchCsv(nome)
    .then((csv) => {
      if (!csv || csv.trim().startsWith("<")) return { ok: false, rows: [] };
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      if (!intestazioniValide(parsed, richieste)) return { ok: false, rows: [] };
      return { ok: true, rows: parsed.data };
    })
    .catch(() => ({ ok: false, rows: [] }));
}

export function usePatrimonio() {
  const [state, setState] = useState({
    loading: true,
    pronto: false,
    conti: [],
    totale: { liquidita: 0, investimenti: 0, totale: 0 },
    posizioni: [],
    storico: [],
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      leggiTab(SHEET_PATRIMONIO, ["conto", "totale"]),
      leggiTab(SHEET_POSIZIONI, ["ticker", "valore"]),
      leggiTab(SHEET_STORICO, ["data", "totale"]),
    ]).then(([pat, pos, sto]) => {
      if (cancelled) return;

      const tutti = pat.rows
        .map((r) => ({
          conto: (r["Conto"] || "").trim(),
          liquidita: parseNumber(r["Liquidità"]),
          investimenti: parseNumber(r["Investimenti"]),
          totale: parseNumber(r["Totale"]),
        }))
        .filter((r) => r.conto);

      const rigaTot = tutti.find((c) => c.conto.toUpperCase() === "TOTALE");
      const conti = tutti.filter((c) => c.conto.toUpperCase() !== "TOTALE");
      const totale = rigaTot || {
        liquidita: conti.reduce((s, c) => s + c.liquidita, 0),
        investimenti: conti.reduce((s, c) => s + c.investimenti, 0),
        totale: conti.reduce((s, c) => s + c.totale, 0),
      };

      const posizioni = pos.rows
        .map((r) => ({
          ticker: (r["Ticker"] || "").trim(),
          nome: (r["Nome"] || "").trim(),
          conto: (r["Conto"] || "").trim(),
          quantita: parseNumber(r["Quantità"]),
          valore: parseNumber(r["Valore"]),
          investito: parseNumber(r["Investito"]),
          pl: parseNumber(r["P/L"]),
        }))
        .filter((p) => p.ticker && p.quantita > 0)
        .sort((a, b) => b.valore - a.valore);

      const storico = sto.rows
        .map((r) => {
          const d = parseData(r["Data"]);
          if (!d) return null;
          return {
            t: d.getTime(),
            label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
            Totale: Math.round(parseNumber(r["Totale"])),
            Investimenti: Math.round(parseNumber(r["Investimenti"])),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.t - b.t)
        .slice(-120);

      setState({
        loading: false,
        pronto: pat.ok && conti.length > 0,
        conti,
        totale,
        posizioni,
        storico,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
