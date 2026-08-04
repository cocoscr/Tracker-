/**
 * Manutenzione foglio "Tracker"
 * ---------------------------------------------------------------
 * Da incollare come NUOVO file nel progetto Apps Script legato al
 * foglio (Estensioni > Apps Script > + > Script). NON sostituisce
 * il file che contiene doPost(): vive accanto a quello.
 *
 * Contiene:
 *   pulisciNomiConto()  -> normalizza la colonna Conto (1.1)
 *   riempiFormule()     -> ristende le formule H e I (1.2)
 *   manutenzioneCompleta() -> lancia entrambe
 *   installaTrigger()   -> riempiFormule() ogni ora, auto-riparante
 *
 * PRIMA DI LANCIARLO LA PRIMA VOLTA: File > Crea una copia del
 * foglio, così hai un backup. Le funzioni riscrivono celle.
 */

var TAB_TRANSAZIONI = 'Transazioni';
var TAB_RICORRENTI = 'Ricorrenti';
var COL_CONTO = 7;   // G
var COL_H = 8;       // importo ricalcolato
var COL_I = 9;       // Mese

/** Nome canonico per ogni variante trovata nel foglio (chiave = minuscolo, trimmato). */
var CONTI_CANONICI = {
  'trade repubblic': 'Trade Republic',
  'trade republic': 'Trade Republic',
  'traderepublic': 'Trade Republic',
  'tr': 'Trade Republic',
  'fineco': 'Fineco',
  'revolut': 'Revolut',
  'buddy bank': 'Buddy Bank',
  'buddybank': 'Buddy Bank'
};

/** Trim, spazi multipli collassati, correzione typo noti. */
function normalizzaConto(v) {
  if (v === null || v === undefined) return '';
  var s = String(v).replace(/\s+/g, ' ').trim();
  if (!s) return '';
  var k = s.toLowerCase();
  return CONTI_CANONICI[k] || s;
}

/**
 * 1.1 — Uniforma i nomi conto in Transazioni!G e Ricorrenti!G.
 * Non tocca le celle già corrette. Le celle vuote restano vuote.
 */
function pulisciNomiConto() {
  var ss = SpreadsheetApp.getActive();
  var righe = [];

  [TAB_TRANSAZIONI, TAB_RICORRENTI].forEach(function (nomeTab) {
    var sh = ss.getSheetByName(nomeTab);
    if (!sh) { righe.push(nomeTab + ': TAB NON TROVATO'); return; }

    var ultima = sh.getLastRow();
    if (ultima < 2) { righe.push(nomeTab + ': nessun dato'); return; }

    var rng = sh.getRange(2, COL_CONTO, ultima - 1, 1);
    var vals = rng.getValues();
    var formule = rng.getFormulas();

    var modificate = 0;
    var vuote = 0;
    var saltate = 0;
    var nuovi = vals.map(function (r, i) {
      // se la cella è una formula la lascio stare
      if (formule[i][0]) { saltate++; return [r[0]]; }
      var orig = r[0];
      var norm = normalizzaConto(orig);
      if (norm === '') vuote++;
      else if (String(orig) !== norm) modificate++;
      return [norm];
    });

    rng.setValues(nuovi);
    righe.push(
      nomeTab + ': ' + modificate + ' celle corrette, ' +
      vuote + ' vuote, ' + saltate + ' formule saltate (su ' + vals.length + ' righe)'
    );
  });

  var esito = righe.join('\n');
  Logger.log(esito);
  return esito;
}

/**
 * 1.2 — Ristende le formule H e I a tutte le righe che hanno una Data,
 * e pulisce le righe fantasma sotto i dati (quelle con "dic 1899").
 *
 * Prende come modello la PRIMA formula che trova nella colonna e la
 * replica in R1C1, così i riferimenti relativi restano corretti.
 */
function riempiFormule() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(TAB_TRANSAZIONI);
  if (!sh) throw new Error('Tab ' + TAB_TRANSAZIONI + ' non trovato');

  var ultima = sh.getLastRow();
  if (ultima < 2) return 'Nessun dato.';

  // ultima riga con Data valorizzata
  var colA = sh.getRange(2, 1, ultima - 1, 1).getValues();
  var ultimaDati = 1;
  for (var i = 0; i < colA.length; i++) {
    if (String(colA[i][0]).trim() !== '') ultimaDati = i + 2;
  }
  if (ultimaDati < 2) return 'Nessuna riga con Data.';

  var righe = [];
  [COL_H, COL_I].forEach(function (col) {
    var rng = sh.getRange(2, col, ultima - 1, 1);
    var formule = rng.getFormulasR1C1();

    var modello = '';
    for (var j = 0; j < formule.length; j++) {
      if (formule[j][0]) { modello = formule[j][0]; break; }
    }
    if (!modello) {
      righe.push('Colonna ' + col + ': nessuna formula trovata, salto per sicurezza');
      return;
    }

    var mancanti = 0;
    var out = [];
    for (var r = 2; r <= ultima; r++) {
      var idx = r - 2;
      if (r <= ultimaDati) {
        if (!formule[idx][0]) mancanti++;
        out.push([modello]);
      } else {
        out.push(['']); // riga fantasma sotto i dati: svuoto
      }
    }
    rng.setFormulasR1C1(out);
    righe.push(
      'Colonna ' + col + ': formula applicata alle righe 2-' + ultimaDati +
      ' (' + mancanti + ' erano vuote) — modello: ' + modello
    );
  });

  var esito = righe.join('\n');
  Logger.log(esito);
  return esito;
}

/** Lancia entrambe le manutenzioni. */
function manutenzioneCompleta() {
  var esito = pulisciNomiConto() + '\n' + riempiFormule();
  Logger.log(esito);
  return esito;
}

/**
 * Installa un trigger orario su riempiFormule(): le righe scritte dal
 * comando rapido NFC ricevono le formule H e I entro un'ora, senza
 * dover toccare doPost().
 * Lanciare UNA volta. Rimuove eventuali trigger duplicati.
 */
function installaTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'riempiFormule') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('riempiFormule').timeBased().everyHours(1).create();
  return 'Trigger orario installato su riempiFormule().';
}

/** Menu comodo nel foglio. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Manutenzione')
    .addItem('Pulisci nomi conto', 'pulisciNomiConto')
    .addItem('Riempi formule H/I', 'riempiFormule')
    .addSeparator()
    .addItem('Manutenzione completa', 'manutenzioneCompleta')
    .addToUi();
}
