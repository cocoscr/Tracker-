import { useState, useEffect } from "react";
import Papa from "papaparse";
import { CSV_URL, BUDGET_CSV_URL } from "./config.js";
import { parseImporto, parseDataOggetto, meseAbbrLabel, meseDaEtichetta, chiaveOrdinamentoMese } from "./utils.js";

export function useSheetData() {
  const [state, setState] = useState({ loading: true, error: null, rows: [], scartate: 0, budgetManuale: {} });
  const [tick, setTick] = useState(0);
  const ricarica = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setTick((t) => t + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const caricaTransazioni = fetch(CSV_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Impossibile leggere il foglio (è condiviso come 'chiunque con il link'?)");
        return res.text();
      })
      .then((csvText) => {
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        return parsed.data
          .map((r) => {
            const tipo = (r["Tipo"] || "").trim();
            const categoria = (r["Categoria"] || "Altro").trim();
            const dataObj = parseDataOggetto(r["Data"]);
            return {
              data: r["Data"],
              dataObj,
              tipo,
              descrizione: r["Descrizione"] || "",
              categoria,
              metodo: r["Metodo"],
              conto: r["Conto"],
              // Importo e Mese vengono ricavati dalle colonne sorgente (Importo, Data):
              // le colonne calcolate del foglio ("importo ricalcolato", "Mese") non sono più usate.
              importo: parseImporto(r["Importo"], tipo),
              // mese dalla Data; se la data non si legge, dalla colonna "Mese" del foglio
              mese: meseAbbrLabel(dataObj) || meseDaEtichetta(r["Mese"]),
              // Movimenti tra conti propri: esclusi dai totali, contati a parte.
              trasferimento: categoria === "Trasferimento" || /^trasf/i.test(tipo),
            };
          })
          .filter((r) => r.tipo === "Spesa" || r.tipo === "Entrata" || /^trasf/i.test(r.tipo));
      })
      .then((tutte) => {
        const rows = tutte.filter((r) => r.mese);
        rows.sort((a, b) => {
          const ka = a.dataObj ? a.dataObj.getTime() : chiaveOrdinamentoMese(a.mese, 0) * 1e10;
          const kb = b.dataObj ? b.dataObj.getTime() : chiaveOrdinamentoMese(b.mese, 0) * 1e10;
          return ka - kb;
        });
        return { rows, scartate: tutte.length - rows.length };
      });

    // il foglio "Budget" è opzionale: se non esiste, si prosegue con i budget automatici
    const caricaBudget = fetch(BUDGET_CSV_URL)
      .then((res) => (res.ok ? res.text() : ""))
      .then((csv) => {
        const map = {};
        if (!csv || csv.trim().startsWith("<")) return map; // risposta HTML = foglio inesistente
        const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
        (parsed.data || []).forEach((r) => {
          const cat = (r["Categoria"] || "").trim();
          const val = parseImporto(r["Budget"]);
          if (cat && val > 0) map[cat] = val;
        });
        return map;
      })
      .catch(() => ({}));

    Promise.all([caricaTransazioni, caricaBudget])
      .then(([{ rows, scartate }, budgetManuale]) => {
        if (!cancelled) setState({ loading: false, error: null, rows, scartate, budgetManuale });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message, rows: [], scartate: 0, budgetManuale: {} });
      });

    return () => { cancelled = true; };
  }, [tick]);

  return { ...state, ricarica };
}
