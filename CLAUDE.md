# App tracker — Livello 2

Dashboard personale di spese e patrimonio. Leggi questo file prima di aprire il codice:
di solito basta per sapere QUALE file toccare. Non leggere tutto il repo.

## Architettura (4 pezzi)
1. **Comando rapido iPhone (NFC)** → a ogni pagamento fa POST a Apps Script (merchant, amount, card).
2. **Apps Script** (`apps-script/doPost.gs`) → scrive la riga nel Google Sheet e risponde col testo della notifica.
   `apps-script/manutenzione.gs` → pulizia nomi conto, formule H/I, trigger orario.
3. **Google Sheet "Tracker"** → tab Transazioni (A Data · B Importo · C Tipo · D Descrizione · E Categoria · F Metodo · G Conto · H importo firmato · I Mese), Ricorrenti, Conti (fonte dei saldi), Patrimonio/Posizioni/Storico (opzionali).
4. **Webapp** Vite + React + Tailwind + Recharts, legge il foglio via CSV gviz. Deploy automatico su GitHub Pages a ogni push su `main` (push con GitHub Desktop).

## Dove modificare cosa
| Voglio cambiare… | File |
|---|---|
| Sheet ID, categorie escluse, colori/tema | `src/config.js` |
| Lettura dati dal foglio | `src/useSheetData.js`, `src/usePatrimonio.js` |
| Parsing importi/date, formato euro | `src/utils.js` |
| Totali, layout home, quale pannello si apre | `src/App.jsx` (~430 righe) |
| Pannelli Categorie / Da pagare / Andamento | `src/panels/Panels.jsx` |
| Pannello Movimenti / Patrimonio | `src/panels/PanelMovimenti.jsx`, `src/panels/PanelPatrimonio.jsx` |
| Card "Ultima transazione" | `src/components/UltimaTransazione.jsx` |
| Icone per categoria | `src/components/Icona.jsx` |
| Categorizzazione merchant, mappa carte, testo notifica | `apps-script/doPost.gs` (REGOLE, MAPPA_CARTE, componiTesto) |
| Liquidità/investimenti, tab Patrimonio, storico giornaliero | `apps-script/patrimonio.gs` (saldi SOLO in tab Conti; Patrimonio è calcolato) |
| PAC automatici (righe Transazioni + quote Posizioni) | `apps-script/pac.gs` (PAC_PIANI: importo, giorno, ticker) |
| Spesa fissa "segna pagata" dall'app | `src/components/PagaRicorrente.jsx` + `src/scriptApi.js` → `doPost` action `ricorrente` (pagaRicorrente) |

## Regole da non rompere
- `ESCLUSE_DAL_TOTALE` deve essere IDENTICO in `src/config.js` e `apps-script/doPost.gs`.
- Dopo ogni modifica a un `.gs`: incollarlo in Apps Script (prima ⌘A + Backspace, altrimenti finisce dentro `myFunction`) e fare Distribuisci → Gestisci deployment → Nuova versione.
- Per verificare che compili usa `npm run build` (dopo `npm install`), invece di rileggere tutto il codice.

## Trappole note
- gviz mette in cache per URL esatto: per rileggere dati aggiornati cambia la query.
- gviz su un tab inesistente restituisce il primo foglio senza errori → validare le intestazioni (già fatto in `useSheetData.js`).
- `appendRow()` non estende le formule H/I → ci pensa il trigger orario `riempiFormule`.
- Foglio in italiano: `setFormula()` da Apps Script vuole `;` come separatore, con `,` dà #ERROR! → in `patrimonio.gs` c'è `patFx_()` che converte.
- `GOOGLEFINANCE("CSTNL")` restituisce il prezzo in USD: va convertito in EUR (fatto in `sistemaPosizioni`).

## Note di stato (max 10 righe, aggiornare a fine sessione)
- 2026-10-03: importo vuoto NFC risolto con "Attendi" nel comando rapido. Comando rapido parte B (correzione categoria) da fare.
- 2026-10-05: `doPost_v3_valute.gs` (KWD→EUR) pronto, rimandato al 3/11 (promemoria). In produzione resta `doPost.gs`; al deploy v3 → doPost.gs (ha già anche il ramo `ricorrente`).
- 2026-10-05: `patrimonio.gs` e `pac.gs` installati e funzionanti (liquidità 6.453 · investito 1.798; PAC S&P 2 e 16 + NVIDIA 2 = 300 €/mese). Cometa: valore da inserire in Conti più avanti.
- 2026-10-05: pushato e99935a "Categorie cliccabili…", ma il deploy Pages è FALLITO (15 min, ✗) → sito ancora vecchio. Da rilanciare / verificare con il prossimo push.
- 2026-10-08: pronti NON pushati: font Apple (SF, tabular-nums) + "segna pagata" spese fisse (URL Apps Script solo nel localStorage del telefono, mai nel codice). `doPost.gs` col ramo `ricorrente` da incollare + Nuova versione.
- Da fare poi: pannello Patrimonio nella webapp (liquidità/investito/posizioni), controllo auto-aggiornamento versione all'apertura, punto migliaia in `euro()`, segno meno su saldo negativo, grafico Andamento vuoto (animazione Recharts).
- Da verificare: righe Ricorrenti "Bollette" (senza importo/giorno).
- Storico completo: `~/Claude/Secondo Cervello/Archivio/` (leggere solo se serve).
