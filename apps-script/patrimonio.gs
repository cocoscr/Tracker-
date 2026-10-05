/**
 * Patrimonio — liquidità separata dagli investimenti
 * ---------------------------------------------------------------
 * Da incollare come NUOVO file nel progetto Apps Script del foglio
 * (accanto a doPost e manutenzione, senza sostituirli).
 *
 * Idea: c'è UN SOLO posto dove scrivi i saldi, il tab "Conti".
 * Tutto il resto si calcola da lì:
 *
 *   Conti        (lo scrivi tu)   Conto · Saldo · Aggiornato il · Tipo
 *                                 Tipo = "Liquidità" per i conti correnti,
 *                                        "Investimento" per Cometa (valore dalla busta)
 *   Posizioni    (ETF)            Valore = quantità × prezzo GOOGLEFINANCE
 *   Patrimonio   (CALCOLATO)      per ogni conto:
 *                                 Liquidità    = saldo + movimenti registrati DOPO la data del saldo
 *                                 Investimenti = posizioni su quel conto (+ saldo se Tipo = Investimento)
 *   Storico Patrimonio            una riga al giorno, la scrive salvaStorico()
 *
 * "Movimenti dopo" fa sì che la liquidità si aggiorni da sola tra un
 * saldo manuale e l'altro: quando riscrivi il saldo con la data di
 * oggi, il conteggio riparte da zero. Le spese con Metodo = AMEX non
 * contano (escono dal conto solo con l'addebito mensile "Carta di Credito").
 *
 * PRIMO AVVIO: esegui impostaPatrimonio() UNA volta dall'editor.
 * Fa un backup del vecchio tab Patrimonio prima di riscriverlo.
 * Se aggiungi un conto nuovo in Conti, riesegui ricostruisciPatrimonio().
 */

var PAT_TAB_CONTI = 'Conti';
var PAT_TAB_PATRIMONIO = 'Patrimonio';
var PAT_TAB_POSIZIONI = 'Posizioni';
var PAT_TAB_STORICO = 'Storico Patrimonio';
var PAT_TAB_TX = 'Transazioni';

// Posizioni che devono esistere in Posizioni (la riga viene creata se manca).
// Quantità e PMC li scrivi tu nel foglio (colonne D ed E).
var PAT_POSIZIONI_ATTESE = [
  { ticker: 'CSTNL', nome: 'Core S&P 500 USD (Acc)', conto: 'Trade Republic' },
  { ticker: 'NVDA', nome: 'NVIDIA', conto: 'Trade Republic' },
];

var TIPO_LIQ = 'Liquidità';
var TIPO_INV = 'Investimento';
var FORMATO_EURO = '"€ "#,##0.00';

/** Esegui UNA volta: prepara Conti, ricostruisce Patrimonio, sistema Posizioni, attiva lo storico. */
function impostaPatrimonio() {
  var ss = SpreadsheetApp.getActive();
  var log = [];

  // 1. backup del vecchio Patrimonio (solo la prima volta)
  var vecchio = ss.getSheetByName(PAT_TAB_PATRIMONIO);
  if (vecchio && !ss.getSheetByName('Patrimonio (vecchio)')) {
    vecchio.copyTo(ss).setName('Patrimonio (vecchio)');
    log.push('Backup creato: tab "Patrimonio (vecchio)" (cancellalo quando sei sicuro).');
  }

  log.push(preparaConti());
  log.push(ricostruisciPatrimonio());
  log.push(sistemaPosizioni());
  log.push(installaTriggerStorico());
  SpreadsheetApp.flush();
  log.push(salvaStorico());

  var esito = log.join('\n');
  Logger.log(esito);
  return esito;
}

/** Aggiunge la colonna Tipo a Conti, la riga Cometa, e converte in numero i saldi scritti come testo. */
function preparaConti() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(PAT_TAB_CONTI);
  if (!sh) throw new Error('Tab "' + PAT_TAB_CONTI + '" non trovato');

  sh.getRange(1, 1, 1, 4).setValues([['Conto', 'Saldo', 'Aggiornato il', 'Tipo']]);

  var ultima = Math.max(sh.getLastRow(), 1);
  var dati = ultima > 1 ? sh.getRange(2, 1, ultima - 1, 4).getValues() : [];
  var haCometa = false;
  var convertiti = 0;

  dati.forEach(function (r, i) {
    var riga = i + 2;
    var conto = String(r[0]).trim();
    if (!conto) return;
    if (/cometa/i.test(conto)) haCometa = true;

    // saldo scritto come testo ("24,45") → numero
    if (typeof r[1] === 'string' && r[1].trim() !== '') {
      var n = parseEuro(r[1]);
      if (n !== null) { sh.getRange(riga, 2).setValue(n); convertiti++; }
    }
    if (!String(r[3]).trim()) {
      sh.getRange(riga, 4).setValue(/cometa/i.test(conto) ? TIPO_INV : TIPO_LIQ);
    }
  });

  if (!haCometa) {
    sh.appendRow(['Cometa', '', '', TIPO_INV]);
  }

  var n = sh.getLastRow() - 1;
  sh.getRange(2, 2, n, 1).setNumberFormat(FORMATO_EURO);
  sh.getRange(2, 3, n, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, 4, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList([TIPO_LIQ, TIPO_INV], true).build()
  );
  sh.getRange('A1').setNote(
    'Unico posto dove scrivere i saldi.\n' +
    'Saldo = solo i contanti sul conto (NON il valore degli ETF, che arriva da Posizioni).\n' +
    'Aggiornato il = giorno del saldo: i movimenti registrati dopo quel giorno vengono sommati in automatico.\n' +
    'Cometa: Tipo Investimento, valore dalla busta paga ogni tanto.'
  );

  return 'Conti: colonna Tipo pronta' + (haCometa ? '' : ', riga Cometa aggiunta (scrivi il valore dalla busta)') +
    (convertiti ? ', ' + convertiti + ' saldi convertiti da testo a numero' : '') + '.';
}

/** Riscrive il tab Patrimonio con formule, una riga per ogni conto di Conti + TOTALE. */
function ricostruisciPatrimonio() {
  var ss = SpreadsheetApp.getActive();
  var conti = ss.getSheetByName(PAT_TAB_CONTI);
  if (!conti) throw new Error('Tab "' + PAT_TAB_CONTI + '" non trovato');

  var sh = ss.getSheetByName(PAT_TAB_PATRIMONIO) || ss.insertSheet(PAT_TAB_PATRIMONIO);
  sh.clear();
  sh.clearNotes();

  var intest = ['Conto', 'Tipo', 'Saldo', 'Aggiornato il', 'Movimenti dopo', 'Liquidità', 'Investimenti', 'Totale'];
  sh.getRange(1, 1, 1, intest.length).setValues([intest]).setFontWeight('bold');

  var nomi = conti.getRange(2, 1, Math.max(conti.getLastRow() - 1, 1), 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (s) { return s; });

  var righe = nomi.map(function (nome, i) {
    var r = i + 2;
    var cerca = function (col) {
      return 'IFERROR(INDEX(' + PAT_TAB_CONTI + '!$' + col + ':$' + col + ',MATCH($A' + r + ',' + PAT_TAB_CONTI + '!$A:$A,0)),"")';
    };
    return [
      nome,
      '=' + cerca('D'),
      '=IFERROR(VALUE(' + cerca('B') + '),0)',
      '=' + cerca('C'),
      // movimenti registrati dopo la data del saldo; gli acquisti AMEX non contano,
      // l'addebito mensile (categoria "Carta di Credito") sì
      '=IF(OR($B' + r + '<>"' + TIPO_LIQ + '",$D' + r + '=""),0,SUMPRODUCT(' +
        '(' + PAT_TAB_TX + '!$G$2:$G=$A' + r + ')*' +
        '(((' + PAT_TAB_TX + '!$F$2:$F<>"AMEX")+(' + PAT_TAB_TX + '!$E$2:$E="Carta di Credito"))>0)*' +
        '(IFERROR(DATEVALUE(' + PAT_TAB_TX + '!$A$2:$A),' + PAT_TAB_TX + '!$A$2:$A)>$D' + r + ')*' +
        'IFERROR(' + PAT_TAB_TX + '!$H$2:$H*1,0)))',
      '=IF($B' + r + '="' + TIPO_LIQ + '",$C' + r + '+$E' + r + ',0)',
      '=SUMPRODUCT((' + PAT_TAB_POSIZIONI + '!$C$2:$C=$A' + r + ')*IFERROR(' + PAT_TAB_POSIZIONI + '!$H$2:$H*1,0))' +
        '+IF($B' + r + '="' + TIPO_INV + '",$C' + r + ',0)',
      '=$F' + r + '+$G' + r,
    ];
  });

  righe = righe.map(patFxRiga_);
  if (righe.length) sh.getRange(2, 1, righe.length, intest.length).setValues(righe);

  var rt = righe.length + 2;
  var fine = rt - 1;
  sh.getRange(rt, 1, 1, intest.length).setValues([patFxRiga_([
    'TOTALE', '', '', '',
    '=SUM(E2:E' + fine + ')',
    '=SUM(F2:F' + fine + ')',
    '=SUM(G2:G' + fine + ')',
    '=SUM(H2:H' + fine + ')',
  ])]).setFontWeight('bold');

  sh.getRange(2, 3, rt - 1, 1).setNumberFormat(FORMATO_EURO);
  sh.getRange(2, 4, rt - 1, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(2, 5, rt - 1, 4).setNumberFormat(FORMATO_EURO);
  sh.setFrozenRows(1);
  sh.getRange('A1').setNote(
    'Tab CALCOLATO: non scrivere qui, si aggiorna da Conti, Posizioni e Transazioni.\n' +
    'Se aggiungi un conto in Conti, esegui ricostruisciPatrimonio().'
  );

  return 'Patrimonio ricostruito: ' + righe.length + ' conti + riga TOTALE.';
}

/**
 * Posizioni: crea le righe mancanti (PAT_POSIZIONI_ATTESE) e riscrive le formule.
 *   G Prezzo   = prezzo GOOGLEFINANCE convertito in EURO (prima era in dollari:
 *                il valore risultava gonfiato del cambio, ~13%); se manca, Prezzo Manuale (F)
 *   H Valore   = Quantità × Prezzo
 *   I Investito = Quantità × PMC      J P/L = Valore − Investito      K P/L %
 */
function sistemaPosizioni() {
  var sh = SpreadsheetApp.getActive().getSheetByName(PAT_TAB_POSIZIONI);
  if (!sh) return 'Posizioni: tab non trovato, salto.';

  // righe mancanti
  var ultima = Math.max(sh.getLastRow(), 1);
  var esistenti = ultima > 1
    ? sh.getRange(2, 1, ultima - 1, 1).getValues().map(function (r) { return String(r[0]).trim().toUpperCase(); })
    : [];
  var aggiunte = [];
  PAT_POSIZIONI_ATTESE.forEach(function (p) {
    if (esistenti.indexOf(p.ticker.toUpperCase()) >= 0) return;
    var libera = esistenti.indexOf('') >= 0 ? esistenti.indexOf('') + 2 : sh.getLastRow() + 1;
    sh.getRange(libera, 1, 1, 3).setValues([[p.ticker, p.nome, p.conto]]);
    esistenti[libera - 2] = p.ticker.toUpperCase();
    aggiunte.push(p.nome);
  });

  ultima = sh.getLastRow();
  var tick = sh.getRange(2, 1, ultima - 1, 1).getValues();
  var fatte = 0;
  for (var i = 0; i < tick.length; i++) {
    var r = i + 2;
    if (String(tick[i][0]).trim()) {
      sh.getRange(r, 7, 1, 5).setFormulas([patFxRiga_([
        '=IF($A' + r + '="","",IFERROR(GOOGLEFINANCE($A' + r + ',"price")*IF(GOOGLEFINANCE($A' + r + ',"currency")="EUR",1,' +
          'GOOGLEFINANCE("CURRENCY:"&GOOGLEFINANCE($A' + r + ',"currency")&"EUR")),$F' + r + '))',
        '=IF(OR($A' + r + '="",$D' + r + '=""),"",$D' + r + '*$G' + r + ')',
        '=IF($E' + r + '="","",$D' + r + '*$E' + r + ')',
        '=IF($I' + r + '="","",$H' + r + '-$I' + r + ')',
        '=IF(OR($I' + r + '="",$I' + r + '=0),"",$J' + r + '/$I' + r + ')',
      ])]);
      sh.getRange(r, 7, 1, 4).setNumberFormat(FORMATO_EURO);
      sh.getRange(r, 11).setNumberFormat('0.0%');
      fatte++;
    } else {
      sh.getRange(r, 7, 1, 5).clearContent(); // righe vuote con #REF!
    }
  }
  return 'Posizioni: formule (prezzo in euro) su ' + fatte + ' righe' +
    (aggiunte.length ? ', aggiunte: ' + aggiunte.join(', ') : '') +
    '. Servono Quantità (D) e PMC (E).';
}

/** Aggiunge (o aggiorna, se già presente oggi) una riga in Storico Patrimonio. */
function salvaStorico() {
  var ss = SpreadsheetApp.getActive();
  var pat = ss.getSheetByName(PAT_TAB_PATRIMONIO);
  if (!pat) return 'Storico: manca il tab Patrimonio.';

  var dati = pat.getDataRange().getValues();
  var h = dati[0].map(function (x) { return String(x).trim().toLowerCase(); });
  var cL = h.indexOf('liquidità'), cI = h.indexOf('investimenti'), cT = h.indexOf('totale');
  var tot = dati.filter(function (r) { return String(r[0]).trim().toUpperCase() === 'TOTALE'; })[0];
  if (!tot || cL < 0 || cI < 0 || cT < 0) return 'Storico: riga TOTALE o colonne non trovate.';

  var sh = ss.getSheetByName(PAT_TAB_STORICO);
  if (!sh) {
    sh = ss.insertSheet(PAT_TAB_STORICO);
    sh.appendRow(['Data', 'Liquidità', 'Investimenti', 'Totale']);
  }

  var oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  var riga = [oggi, round2(tot[cL]), round2(tot[cI]), round2(tot[cT])];

  var ultima = sh.getLastRow();
  var ultimaData = ultima > 1 ? sh.getRange(ultima, 1).getValue() : null;
  if (ultimaData instanceof Date && ultimaData.toDateString() === oggi.toDateString()) {
    sh.getRange(ultima, 1, 1, 4).setValues([riga]);
  } else {
    sh.appendRow(riga);
    ultima = sh.getLastRow();
  }
  sh.getRange(ultima, 1).setNumberFormat('dd/MM/yyyy');
  sh.getRange(ultima, 2, 1, 3).setNumberFormat('0.00');

  return 'Storico: ' + Utilities.formatDate(oggi, ss.getSpreadsheetTimeZone(), 'dd/MM/yyyy') +
    ' → liquidità ' + riga[1] + ' · investimenti ' + riga[2] + ' · totale ' + riga[3];
}

/** Trigger giornaliero (verso le 23) su salvaStorico(). Rimuove i duplicati. */
function installaTriggerStorico() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'salvaStorico') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('salvaStorico').timeBased().everyDays(1).atHour(23).create();
  return 'Trigger giornaliero su salvaStorico() installato (ore 23 circa).';
}

/* ---------------- utilità ---------------- */

/**
 * setFormula() segue la lingua del foglio: con il foglio in italiano il
 * separatore degli argomenti è ";" e le formule scritte con "," danno #ERROR!.
 * Le formule qui sono scritte con "," e vengono convertite se serve.
 * (Nelle formule di questo file non ci sono virgole dentro le stringhe.)
 */
var PAT_SEP_CACHE = null;
function patSep_() {
  if (PAT_SEP_CACHE) return PAT_SEP_CACHE;
  var ss = SpreadsheetApp.getActive();
  var tmp = ss.insertSheet('_test_separatore');
  try {
    tmp.getRange('A1').setFormula('=SUM(1,2)');
    SpreadsheetApp.flush();
    PAT_SEP_CACHE = tmp.getRange('A1').getValue() === 3 ? ',' : ';';
  } finally {
    ss.deleteSheet(tmp);
  }
  return PAT_SEP_CACHE;
}

function patFx_(f) {
  return patSep_() === ',' ? f : f.replace(/,/g, ';');
}

function patFxRiga_(riga) {
  return riga.map(function (v) {
    return typeof v === 'string' && v.charAt(0) === '=' ? patFx_(v) : v;
  });
}

function parseEuro(s) {
  var t = String(s).replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
  var n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function round2(v) {
  var n = Number(v) || 0;
  return Math.round(n * 100) / 100;
}
