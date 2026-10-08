/* ------------------------------------------------------------------ *
 *  DATA LAYER — transazioni + spese ricorrenti
 * ------------------------------------------------------------------ */

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { csvUrl, SHEET_TRANSAZIONI, SHEET_RICORRENTI } from "./config.js";
import { parseImporto, parseData, meseDaData } from "./utils.js";

export function fetchCsv(nome) {
  return fetch(csvUrl(nome)).then((res) => {
    if (!res.ok) throw new Error(`Foglio "${nome}" non leggibile`);
    return res.text();
  });
}

/**
 * ATTENZIONE (vale per tutti i tab opzionali): se il tab non esiste, Google NON
 * restituisce un errore — restituisce il PRIMO foglio del file. Bisogna quindi
 * sempre verificare che le intestazioni siano quelle attese prima di fidarsi.
 */
export function intestazioniValide(parsed, richieste) {
  const cols = (parsed.meta?.fields || []).map((f) => String(f).trim().toLowerCase());
  return richieste.every((c) => cols.includes(c.toLowerCase()));
}

export function useSheetData() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    rows: [],
    ricorrenti: [],
    ricorrentiOk: false,
  });

  useEffect(() => {
    let cancelled = false;

    const pTx = fetchCsv(SHEET_TRANSAZIONI).then((csv) => {
      const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
      return parsed.data
        .map((r) => {
          const dataObj = parseData(r["Data"]);
          // "importo ricalcolato" (col. H) è una formula: sulla riga appena scritta
          // dal comando rapido può essere vuota → si ripiega su "Importo" (col. B).
          const ric = (r["importo ricalcolato"] || "").trim();
          const tipo = (r["Tipo"] || "").trim();
          let importo = parseImporto(ric || r["Importo"]);
          if (!ric && tipo === "Spesa") importo = -Math.abs(importo);
          return {
            data: r["Data"],
            dataObj,
            tipo,
            descrizione: r["Descrizione"] || "",
            categoria: (r["Categoria"] || "Altro").trim() || "Altro",
            metodo: r["Metodo"],
            conto: r["Conto"],
            importo,
            mese: (r["Mese"] || "").trim() || meseDaData(dataObj),
          };
        })
        .filter((r) => r.tipo === "Spesa" || r.tipo === "Entrata");
    });

    // Il tab Ricorrenti è opzionale: se manca, la dashboard funziona lo stesso.
    const pRic = fetchCsv(SHEET_RICORRENTI)
      .then((csv) => {
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        if (!intestazioniValide(parsed, ["descrizione", "importo", "giorno"])) {
          return { ok: false, list: [] };
        }
        return {
          ok: true,
          list: parsed.data
            .map((r) => ({
              descrizione: (r["Descrizione"] || "").trim(),
              importo: Math.abs(parseImporto(r["Importo"])),
              giorno: Math.min(31, Math.max(1, parseInt(r["Giorno"], 10) || 1)),
              categoria: (r["Categoria"] || "Altro").trim() || "Altro",
              attivo: !/^(no|false|0|n)$/i.test(String(r["Attivo"] ?? "si").trim()),
              note: (r["Note"] || "").trim(),
              conto: (r["Conto"] || "").trim(),
            }))
            .filter((r) => r.descrizione && r.attivo && r.importo > 0),
        };
      })
      .catch(() => ({ ok: false, list: [] }));

    Promise.all([pTx, pRic])
      .then(([rows, ric]) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          rows,
          ricorrenti: ric.list,
          ricorrentiOk: ric.ok,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: err.message,
            rows: [],
            ricorrenti: [],
            ricorrentiOk: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
