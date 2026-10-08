/*************************************************************
 *  TRACKER — doPost v2 (feedback post-transazione)
 *  Sostituisce integralmente il file che contiene doPost() nel
 *  progetto Apps Script legato al foglio. Vive accanto a
 *  manutenzione.gs (che NON va toccato).
 *
 *  Novità rispetto alla v1:
 *   1. doPost restituisce un campo "testo" già pronto per la
 *      notifica del Comando Rapido:
 *        Hai speso 300,00 € in Sport
 *        Sport a settembre: 500,00 €
 *        Totale settembre: 2.535,00 €
 *   2. Segnala quando la categoria non è stata riconosciuta e
 *      restituisce l'elenco categorie + il numero di riga, così
 *      il Comando Rapido può proporre un menu di correzione.
 *   3. Nuovo ramo  action: "ricategorizza"  che riscrive la
 *      categoria di quella riga e ricalcola i totali.
 *
 *  DOPO OGNI MODIFICA: Distribuisci → Gestisci deployment →
 *  matita → Versione: "Nuova versione" → Distribuisci.
 *  Senza questo passaggio l'URL continua a servire il codice vecchio.
 *************************************************************/

/* ======================= CONFIG ======================= */

const SHEET_TX   = "Transazioni";
const CAT_FALLBACK = "Spese Personali";   // categoria assegnata se nessuna regola combacia

// Categorie che NON sono spesa reale: escluse dal "totale mese".
// - Carta di Credito: le spese AMEX sono già registrate una per una,
//   l'addebito mensile le conterebbe due volte.
// - PAC: è risparmio, non spesa.
// - Trasferimento: giroconti tra conti propri.
// DEVE restare identico a ESCLUSE_DAL_TOTALE in src/config.js della dashboard.
const ESCLUSE_DAL_TOTALE = ["Carta di Credito", "PAC", "Trasferimento"];

// Menu proposto dal Comando Rapido quando la categoria non è riconosciuta.
// Ordine = ordine con cui compaiono nel menu: metti in alto quelle che usi di più.
const CATEGORIE = [
  "Cibo SM", "Mangiare fuori", "Benzina", "Sport", "Uscite & Svago",
  "Salute", "Cura Personale", "Pedaggi & Parcheggi", "Abbonamenti",
  "Macchina", "Bollette", "Utenze", "Assicurazioni", "Casa",
  "Vestiti", "Regali", "Lavoro", "Università", "Tasse", "Spese Personali"
];

const MESI_IT = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
                 "luglio","agosto","settembre","ottobre","novembre","dicembre"];

const REGOLE = {
  "conad": "Cibo SM", "esselunga": "Cibo SM", "carrefour": "Cibo SM",
  "lidl": "Cibo SM", "eurospin": "Cibo SM", "todis": "Cibo SM",
  "netflix": "Abbonamenti", "spotify": "Abbonamenti", "ea ": "Abbonamenti",
  "wellhub": "Abbonamenti", "chatgpt": "Abbonamenti",
  "farmacia": "Salute", "psicolog": "Salute",
  "benzina": "Benzina", "esso": "Benzina", "eni ": "Benzina", "q8": "Benzina", "tamoil": "Benzina",
  "carburant": "Benzina", "distributore": "Benzina", "ip ": "Benzina",
  "assicura": "Assicurazioni", "gas": "Bollette", "luce": "Bollette",
  "internet": "Utenze", "iliad": "Utenze",
  "casello": "Pedaggi & Parcheggi", "parcheggio": "Pedaggi & Parcheggi", "telepass": "Pedaggi & Parcheggi",
  "ristorante": "Mangiare fuori", "pizzeria": "Mangiare fuori", "kebab": "Mangiare fuori",
  "bar ": "Mangiare fuori", "caffe": "Mangiare fuori", "gelat": "Mangiare fuori",
  "breasy": "Mangiare fuori", "app br": "Mangiare fuori", "sushi": "Mangiare fuori", "poke": "Mangiare fuori",
  "diner": "Mangiare fuori", "trattoria": "Mangiare fuori", "osteria": "Mangiare fuori",
  "pizza": "Mangiare fuori", "burger": "Mangiare fuori", "mcdonald": "Mangiare fuori",
  "profumeria": "Cura Personale", "barbiere": "Cura Personale", "parrucchier": "Cura Personale",
  "decathlon": "Sport", "palestra": "Sport", "cisalfa": "Sport", "padel": "Sport"
};

const MAPPA_CARTE = {
  "revolut":        ["Revolut",   "Revolut"],
  "trade republic": ["TR Visa",   "Trade Republic"],
  "fineco":         ["Fineco Visa", "Fineco"],
  "buddy":          ["Buddy",     "Buddy Bank"]
};

/* ======================= ROUTER ======================= */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    Logger.log("Payload: " + e.postData.contents);
    if (data.action === "ricategorizza") return ricategorizza(data);
    if (data.action === "ricorrente") return pagaRicorrente(data);
    if (data.action === "annullaRicorrente") return annullaRicorrente(data);
    return nuovaTransazione(data);
  } catch (err) {
    Logger.log("ERRORE: " + err);
    return json({
      status: "error",
      message: String(err),
      testo: "Errore nel salvataggio: " + err
    });
  }
}

/* ================== NUOVA TRANSAZIONE ================== */

function nuovaTransazione(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TX);

  const merchant = String(data.merchant || "").trim();
  const importo  = parseImporto(data.amount);

  // --- categoria ---
  const desc = merchant.toLowerCase();
  let categoria = CAT_FALLBACK;
  let riconosciuta = false;
  for (const key in REGOLE) {
    if (desc.includes(key)) { categoria = REGOLE[key]; riconosciuta = true; break; }
  }

  // --- metodo / conto ---
  const nomeCarta = String(data.card || "").toLowerCase();
  let metodo = data.card, conto = data.card;
  for (const key in MAPPA_CARTE) {
    if (nomeCarta.includes(key)) { metodo = MAPPA_CARTE[key][0]; conto = MAPPA_CARTE[key][1]; break; }
  }

  // --- scrittura: SOLO colonne A–G (H e I restano formule del foglio) ---
  const oggi = new Date();
  const dataStr = Utilities.formatDate(oggi, Session.getScriptTimeZone(), "dd/MM/yyyy");
  sheet.appendRow([dataStr, importo, "Spesa", merchant, categoria, metodo, conto]);
  const riga = sheet.getLastRow();

  const r = riepilogo(categoria, oggi);

  return json({
    status: "ok",
    riga: riga,                      // serve al Comando Rapido per la correzione
    merchant: merchant,
    importo: importo,
    categoria: categoria,
    riconosciuta: riconosciuta,
    needsReview: riconosciuta ? 0 : 1,   // 0/1 perché Shortcuts gestisce male i booleani
    categorie: CATEGORIE,
    mese: r.mese,
    totaleCategoria: r.totaleCategoria,
    totaleMese: r.totaleMese,
    testo: componiTesto(importo, categoria, r, riconosciuta)
  });
}

/* ================ SPESA FISSA PAGATA (dalla webapp) ================ */
/*  La webapp (pannello "Da pagare") manda:
 *    { action: "ricorrente", descrizione, importo, categoria, conto }
 *  e qui si scrive la riga in Transazioni con la data di oggi.
 *  Se nello stesso mese c'è già una spesa con quella descrizione risponde
 *  "duplicato" senza scrivere (a meno che arrivi forza: 1).
 */
function pagaRicorrente(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TX);
  const descrizione = String(data.descrizione || "").trim();
  const importo = Math.abs(parseImporto(data.importo));
  const categoria = String(data.categoria || "").trim() || CAT_FALLBACK;
  const conto = String(data.conto || "").trim();

  if (!descrizione) return json({ status: "error", testo: "Descrizione mancante." });
  if (!(importo > 0)) return json({ status: "error", testo: "Importo non valido: " + data.importo });

  const oggi = new Date();
  if (!data.forza) {
    const key = descrizione.toLowerCase();
    const dati = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 4).getValues();
    for (let i = dati.length - 1; i >= 0; i--) {
      const d = parseData(dati[i][0]);
      if (!d || d.getFullYear() !== oggi.getFullYear() || d.getMonth() !== oggi.getMonth()) continue;
      if (String(dati[i][2]).trim() !== "Spesa") continue;
      const desc = String(dati[i][3]).trim().toLowerCase();
      if (desc && (desc.indexOf(key) >= 0 || key.indexOf(desc) >= 0)) {
        return json({ status: "duplicato", riga: i + 2, testo: descrizione + " risulta già registrata questo mese (riga " + (i + 2) + ")." });
      }
    }
  }

  const dataStr = Utilities.formatDate(oggi, Session.getScriptTimeZone(), "dd/MM/yyyy");
  sheet.appendRow([dataStr, importo, "Spesa", descrizione, categoria, "-", conto]);
  return json({
    status: "ok",
    riga: sheet.getLastRow(),
    data: dataStr,
    descrizione: descrizione,
    importo: importo,
    categoria: categoria,
    conto: conto,
    testo: descrizione + ": " + importo.toFixed(2).replace(".", ",") + " € segnata come pagata"
  });
}

/*  Annulla (tasto "Annulla" nella webapp subito dopo "Paga"):
 *    { action: "annullaRicorrente", riga, descrizione }
 *  Cancella la riga SOLO se è proprio quella appena scritta: stessa
 *  descrizione, Tipo "Spesa" e data di oggi. Altrimenti non tocca nulla.
 */
function annullaRicorrente(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TX);
  const riga = parseInt(data.riga, 10);
  const descrizione = String(data.descrizione || "").trim();
  if (!riga || riga < 2 || riga > sheet.getLastRow()) {
    return json({ status: "error", testo: "Riga non valida: " + data.riga });
  }
  const v = sheet.getRange(riga, 1, 1, 4).getValues()[0];
  const d = parseData(v[0]);
  const oggi = new Date();
  const stessoGiorno = d && d.getFullYear() === oggi.getFullYear() &&
    d.getMonth() === oggi.getMonth() && d.getDate() === oggi.getDate();
  if (String(v[3]).trim() !== descrizione || String(v[2]).trim() !== "Spesa" || !stessoGiorno) {
    return json({ status: "error", testo: "La riga " + riga + " non corrisponde: annulla a mano sul foglio." });
  }
  sheet.deleteRow(riga);
  return json({ status: "ok", testo: descrizione + ": annullata" });
}

/* ================== RICATEGORIZZAZIONE ================== */

function ricategorizza(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TX);

  const riga = parseInt(data.riga || data.row, 10);
  const nuovaCat = String(data.categoria || "").trim();

  if (!riga || riga < 2 || riga > sheet.getLastRow()) {
    return json({ status: "error", testo: "Riga non valida: " + riga });
  }
  if (!nuovaCat) {
    return json({ status: "error", testo: "Categoria mancante." });
  }

  // Sicurezza: se il Comando Rapido manda anche il merchant, verifico che
  // la riga sia davvero quella (evita di riscrivere la riga sbagliata se
  // nel frattempo è arrivata un'altra transazione).
  const rigaVals = sheet.getRange(riga, 1, 1, 7).getValues()[0];
  if (data.merchant && String(rigaVals[3]).trim() !== String(data.merchant).trim()) {
    return json({
      status: "error",
      testo: "Riga " + riga + " non corrisponde (" + rigaVals[3] + "). Correggi a mano sul foglio."
    });
  }

  sheet.getRange(riga, 5).setValue(nuovaCat);   // colonna E = Categoria
  SpreadsheetApp.flush();

  const importo = parseImportoCella(rigaVals[1]);
  const quando  = parseData(rigaVals[0]) || new Date();
  const r = riepilogo(nuovaCat, quando);

  return json({
    status: "ok",
    riga: riga,
    categoria: nuovaCat,
    importo: importo,
    mese: r.mese,
    totaleCategoria: r.totaleCategoria,
    totaleMese: r.totaleMese,
    testo: "Categoria corretta → " + nuovaCat + "\n" + componiTesto(importo, nuovaCat, r, true)
  });
}

/* ================== CALCOLO TOTALI ================== */
/*  Legge le colonne A–E e somma:
 *   - totaleCategoria: spese del mese corrente in quella categoria
 *   - totaleMese: tutte le spese del mese, escluse ESCLUSE_DAL_TOTALE
 *  Non usa le colonne H e I (formule): se il foglio non le ha ancora
 *  estese alla riga nuova, i totali sarebbero sbagliati.
 */
function riepilogo(categoria, quando) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TX);
  const dati = sheet.getDataRange().getValues();
  const H = dati[0];

  const idx = (nome, fallback) => { const i = H.indexOf(nome); return i >= 0 ? i : fallback; };
  const cData = idx("Data", 0);
  const cImp  = idx("Importo", 1);
  const cTipo = idx("Tipo", 2);
  const cCat  = idx("Categoria", 4);

  const anno = quando.getFullYear();
  const mese = quando.getMonth();

  let totaleMese = 0, totaleCategoria = 0;

  for (let i = 1; i < dati.length; i++) {
    if (String(dati[i][cTipo]).trim() !== "Spesa") continue;
    const d = parseData(dati[i][cData]);
    if (!d || d.getFullYear() !== anno || d.getMonth() !== mese) continue;

    const cat = String(dati[i][cCat] || "").trim();
    const val = Math.abs(parseImportoCella(dati[i][cImp]));

    if (cat === categoria) totaleCategoria += val;
    if (ESCLUSE_DAL_TOTALE.indexOf(cat) === -1) totaleMese += val;
  }

  return {
    mese: MESI_IT[mese],
    anno: anno,
    totaleCategoria: arrotonda(totaleCategoria),
    totaleMese: arrotonda(totaleMese)
  };
}

function componiTesto(importo, categoria, r, riconosciuta) {
  const righe = [];
  if (!riconosciuta) righe.push("⚠️ Categoria non riconosciuta → " + categoria);
  righe.push("Hai speso " + eur(importo) + " in " + categoria);
  righe.push(categoria + " a " + r.mese + ": " + eur(r.totaleCategoria));
  righe.push("Totale " + r.mese + ": " + eur(r.totaleMese));
  return righe.join("\n");
}

/* ======================= UTILITY ======================= */

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function arrotonda(n) { return Math.round(n * 100) / 100; }

// Formattazione italiana fatta a mano: toLocaleString("it-IT") non è
// affidabile su Apps Script (ICU ridotta), qui il risultato è sempre lo stesso.
function eur(n) {
  const neg = Number(n) < 0;
  const p = Math.abs(Number(n)).toFixed(2).split(".");
  const intero = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + intero + "," + p[1] + " €";
}

// Parsing robusto dell'importo che arriva dal Comando Rapido:
// gestisce "21,33 €", "€ 21.33", "1.234,56", "1,234.56".
function parseImporto(str) {
  const raw = String(str == null ? "" : str).replace(/[^0-9.,-]/g, "");
  const lastComma = raw.lastIndexOf(",");
  const lastDot   = raw.lastIndexOf(".");
  let normalized;
  if (lastComma > lastDot)      normalized = raw.replace(/\./g, "").replace(/,/g, ".");
  else if (lastDot > lastComma) normalized = raw.replace(/,/g, "");
  else                          normalized = raw;
  return Math.abs(parseFloat(normalized)) || 0;
}

// Le celle possono contenere numeri veri o testo: gestisco entrambi.
function parseImportoCella(v) {
  if (typeof v === "number") return v;
  return parseImporto(v);
}

// La colonna A può essere una Date del foglio o il testo "dd/MM/yyyy".
function parseData(v) {
  if (v instanceof Date) return v;
  const s = String(v || "").trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/* ======================= TEST ======================= */

function testNuovaTransazione() {
  const finto = { postData: { contents: JSON.stringify({
    merchant: "TEST Decathlon", amount: "300,00 €", card: "Revolut Visa"
  })}};
  Logger.log(doPost(finto).getContent());
}

function testMerchantSconosciuto() {
  const finto = { postData: { contents: JSON.stringify({
    merchant: "TEST Negozio Ignoto", amount: "42,50 €", card: "Fineco Visa"
  })}};
  Logger.log(doPost(finto).getContent());
}

function testRicategorizza() {
  // metti qui la riga restituita dal test precedente
  const finto = { postData: { contents: JSON.stringify({
    action: "ricategorizza", riga: 999, categoria: "Sport", merchant: "TEST Negozio Ignoto"
  })}};
  Logger.log(doPost(finto).getContent());
}

/* ============ funzioni di manutenzione (invariate) ============
 * migraCategorie() e categorizzaVuote() restano come nella v1:
 * non le ho toccate, incollale sotto se le hai già nel progetto.
 * NOTA BUG NOTO: categorizzaVuote() agisce solo su Categoria === "",
 * quindi non intercetta le righe già marcate "Altro" o "Spese Personali".
 */
