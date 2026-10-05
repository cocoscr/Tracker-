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
- 2026-09-12: ultimo commit "Feedback post-transazione: card Ultima transazione + doPost v2". App.jsx già spezzato in moduli.
- 2026-10-03: RISOLTO importo vuoto dal comando NFC: Trade Republic passa l'importo a Wallet in ritardo, fix = passaggio "Attendi" nel comando rapido prima del POST.
- 2026-10-03: doPost v2 incollato in Apps Script e ridistribuito (test ok). Comando rapido parte A (notifica) montata: manca il test con un pagamento reale. Parte B (correzione categoria) da fare.
- 2026-10-05: script v3 (conversione valute KWD→EUR, tab Cambi/Log) PRONTO ma rimandato al 3 novembre (promemoria programmato): file `apps-script/doPost_v3_valute.gs` (in produzione resta `doPost.gs` v2; al deploy rinominare v3 → doPost.gs). Le righe in KWD di ottobre andranno corrette con `correggiRigheValuta()` usando l'estratto Revolut/TR.
- 2026-10-05: `patrimonio.gs` installato e verificato (liquidità 6.453 · investito 1.798). Scritto `pac.gs` (S&P 500 100 € il 2 e il 16, NVIDIA 100 € il 2 = 300 €/mese): DA INCOLLARE + `installaPac()`. Poi: pannello Patrimonio nella webapp (non ancora toccato).
- 2026-10-05: Categorie cliccabili (tocchi una categoria → elenco spese del mese sotto, a fisarmonica): `Panels.jsx` PanelCategorie + `CategoryBar` (Ui.jsx) con onClick + `MovimentoRow senzaCategoria`. Build ok, NON ancora pushato.
- Da verificare: righe Ricorrenti "Bollette" (senza importo/giorno) e "Spotify" (senza giorno).
- Idea non iniziata: analisi investimenti/risparmi.
- Storico completo: `~/Claude/Secondo Cervello/Archivio/` (leggere solo se serve).
