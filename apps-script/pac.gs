/**
 * PAC automatici — righe in Transazioni + quote in Posizioni
 * ---------------------------------------------------------------
 * Da incollare come NUOVO file nel progetto Apps Script del foglio
 * (accanto a doPost, manutenzione e patrimonio).
 *
 * Ogni mattina controllaPac() guarda il mese corrente: se il giorno del
 * PAC è passato e in Transazioni manca la riga di quel piano, la scrive
 *     Data · 100 · Spesa · "PAC S&P 500 (auto)" · PAC · - · Trade Republic
 * (S&P 500 il 2 e il 16, NVIDIA il 2: vedi PAC_PIANI)
 * e aggiunge in Posizioni le quote comprate (importo ÷ prezzo in euro del
 * momento), ricalcolando il PMC. Le quote sono una stima al centesimo:
 * il numero esatto è nella fattura, se vuoi lo correggi a mano.
 *
 * Se un mese salta (trigger fermo, foglio chiuso…) non succede nulla di
 * grave: il controllo del giorno dopo la riga mancante la scrive comunque.
 *
 * PRIMO AVVIO: esegui installaPac() UNA volta dall'editor.
 * Da quel momento le quote in Posizioni si aggiornano solo per gli acquisti
 * successivi (quelle di oggi le hai già scritte tu prendendole dall'app).
 * Per i mesi passati senza riga usa recuperaPac('2026-09'): scrive solo
 * le righe in Transazioni, non tocca le quote.
 */

// ---- i tuoi piani: cambia qui importo/giorno se modifichi il PAC sull'app ----
// Un'esecuzione = una riga. Un PAC che parte più volte al mese ha una riga per giorno
// (stesso ticker e stesse chiavi): ogni esecuzione "copre" i giorni dal suo fino alla
// successiva dello stesso ticker, così le due righe del mese non si confondono.
var PAC_PIANI = [
  { nome: 'PAC S&P 500', ticker: 'CSTNL', importo: 100, giorno: 2, conto: 'Trade Republic',
    chiavi: ['s&p', 'sp500', 'sp 500', 'cstnl', 'core'] },
  { nome: 'PAC S&P 500', ticker: 'CSTNL', importo: 100, giorno: 16, conto: 'Trade Republic',
    chiavi: ['s&p', 'sp500', 'sp 500', 'cstnl', 'core'] },
  { nome: 'PAC NVIDIA', ticker: 'NVDA', importo: 100, giorno: 2, conto: 'Trade Republic',
    chiavi: ['nvidia', 'nvda'] },
];

var PAC_TAB_TX = 'Transazioni';
var PAC_TAB_POS = 'Posizioni';
var PAC_CATEGORIA = 'PAC';
var PAC_PROP_DAL = 'PAC_QUOTE_DAL'; // yyyy-MM-dd: quote aggiornate solo per acquisti DOPO questa data

/** Esegui UNA volta: memorizza da quando aggiornare le quote, attiva il controllo giornaliero, controlla subito. */
function installaPac() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(PAC_PROP_DAL)) {
    props.setProperty(PAC_PROP_DAL, pacIso_(new Date()));
  }
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'controllaPac') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('controllaPac').timeBased().everyDays(1).atHour(9).create();

  var esito = 'Trigger giornaliero su controllaPac() installato (ore 9 circa). ' +
    'Quote aggiornate per gli acquisti dopo il ' + props.getProperty(PAC_PROP_DAL) + '.\n' + controllaPac();
  Logger.log(esito);
  return esito;
}

/** Controllo giornaliero sul mese corrente. */
function controllaPac() {
  var oggi = new Date();
  var dal = PropertiesService.getScriptProperties().getProperty(PAC_PROP_DAL) || pacIso_(oggi);
  var log = [];

  PAC_PIANI.forEach(function (p) {
    var giorno = Math.min(p.giorno, pacGiorniNelMese_(oggi.getFullYear(), oggi.getMonth()));
    if (oggi.getDate() < giorno) { log.push(p.nome + ': non ancora (il ' + giorno + ')'); return; }

    var dataPac = new Date(oggi.getFullYear(), oggi.getMonth(), giorno);
    if (pacPresente_(p, oggi.getFullYear(), oggi.getMonth())) { log.push(p.nome + ': già registrato'); return; }

    pacScriviRiga_(p, dataPac);
    var quote = pacIso_(dataPac) > dal ? pacAggiornaPosizione_(p) : 'quote non toccate (acquisto già contato)';
    log.push(p.nome + ': riga scritta per il ' + pacIso_(dataPac) + ' · ' + quote);
  });

  var esito = log.join('\n');
  Logger.log(esito);
  return esito;
}

/** Recupera i mesi passati senza riga, da 'yyyy-mm' al mese corrente. Solo Transazioni, quote intatte. */
function recuperaPac(daMese) {
  var m = String(daMese || '').match(/^(\d{4})-(\d{1,2})$/);
  if (!m) throw new Error("Usa il formato recuperaPac('2026-09')");
  var anno = Number(m[1]), mese = Number(m[2]) - 1;
  var oggi = new Date();
  var log = [];

  while (anno < oggi.getFullYear() || (anno === oggi.getFullYear() && mese <= oggi.getMonth())) {
    PAC_PIANI.forEach(function (p) {
      var giorno = Math.min(p.giorno, pacGiorniNelMese_(anno, mese));
      var dataPac = new Date(anno, mese, giorno);
      if (dataPac > oggi) return;
      if (pacPresente_(p, anno, mese)) { log.push(pacIso_(dataPac) + ' ' + p.nome + ': c\'era già'); return; }
      pacScriviRiga_(p, dataPac);
      log.push(pacIso_(dataPac) + ' ' + p.nome + ': AGGIUNTA');
    });
    mese++;
    if (mese > 11) { mese = 0; anno++; }
  }

  var esito = log.join('\n');
  Logger.log(esito);
  return esito;
}

/* ---------------- interni ---------------- */

// Giorno in cui finisce la "finestra" di un'esecuzione: la prossima esecuzione dello stesso ticker.
function pacFineFinestra_(p) {
  var fine = 32;
  PAC_PIANI.forEach(function (q) {
    if (q.ticker === p.ticker && q.giorno > p.giorno && q.giorno < fine) fine = q.giorno;
  });
  return fine;
}

// C'è già la riga di QUESTA esecuzione nel mese? (categoria PAC + descrizione con una
// delle chiavi + data tra il giorno dell'esecuzione e la successiva dello stesso ticker;
// la prima esecuzione del mese copre anche i giorni prima, es. il 1°)
function pacPresente_(p, anno, mese) {
  var primo = PAC_PIANI.every(function (q) { return q.ticker !== p.ticker || q.giorno >= p.giorno; });
  var da = primo ? 1 : p.giorno;
  var a = pacFineFinestra_(p);
  var sh = SpreadsheetApp.getActive().getSheetByName(PAC_TAB_TX);
  var ultima = sh.getLastRow();
  if (ultima < 2) return false;
  var dati = sh.getRange(2, 1, ultima - 1, 5).getValues(); // A..E
  for (var i = dati.length - 1; i >= 0; i--) {
    var r = dati[i];
    if (String(r[4]).trim() !== PAC_CATEGORIA) continue;
    var d = pacData_(r[0]);
    if (!d || d.getFullYear() !== anno || d.getMonth() !== mese) continue;
    if (d.getDate() < da || d.getDate() >= a) continue;
    var desc = String(r[3]).toLowerCase();
    if (p.chiavi.some(function (k) { return desc.indexOf(k) >= 0; })) return true;
  }
  return false;
}

function pacScriviRiga_(p, data) {
  var sh = SpreadsheetApp.getActive().getSheetByName(PAC_TAB_TX);
  var dataStr = Utilities.formatDate(data, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  sh.appendRow([dataStr, p.importo, 'Spesa', p.nome + ' (auto)', PAC_CATEGORIA, '-', p.conto]);
}

// Quote nuove = importo ÷ prezzo in euro (colonna G di Posizioni); PMC ricalcolato.
function pacAggiornaPosizione_(p) {
  var sh = SpreadsheetApp.getActive().getSheetByName(PAC_TAB_POS);
  if (!sh) return 'Posizioni non trovato';
  var ultima = sh.getLastRow();
  var dati = sh.getRange(2, 1, Math.max(ultima - 1, 1), 7).getValues(); // A..G
  for (var i = 0; i < dati.length; i++) {
    if (String(dati[i][0]).trim().toUpperCase() !== p.ticker.toUpperCase()) continue;
    var riga = i + 2;
    var qta = Number(dati[i][3]) || 0;
    var pmc = Number(dati[i][4]) || 0;
    var prezzo = Number(dati[i][6]) || 0;
    if (prezzo <= 0) return 'prezzo non disponibile, quote NON aggiornate';
    var nuove = p.importo / prezzo;
    var qtaNuova = qta + nuove;
    var pmcNuovo = qtaNuova > 0 ? (qta * pmc + p.importo) / qtaNuova : 0;
    sh.getRange(riga, 4, 1, 2).setValues([[Math.round(qtaNuova * 1e6) / 1e6, Math.round(pmcNuovo * 100) / 100]]);
    return '+' + nuove.toFixed(6) + ' quote (tot ' + qtaNuova.toFixed(6) + ', PMC ' + pmcNuovo.toFixed(2) + ')';
  }
  return 'ticker ' + p.ticker + ' non trovato in Posizioni';
}

function pacData_(v) {
  if (v instanceof Date) return v;
  var m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

function pacIso_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function pacGiorniNelMese_(anno, mese) {
  return new Date(anno, mese + 1, 0).getDate();
}
