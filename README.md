# Portafoglio — Dashboard transazioni

Dashboard personale collegata a un Google Sheet ("Transazioni" + foglio opzionale "Budget").
Build automatica con Vite + deploy su GitHub Pages via GitHub Actions: **basta fare commit, il resto è automatico**.

## Struttura

```
index.html                  Entry point (meta PWA iPhone, font)
package.json                Dipendenze
vite.config.js              Config build
.github/workflows/deploy.yml  Build + deploy automatico su Pages
src/
  main.jsx                  Bootstrap React
  index.css                 Tailwind + regole mobile
  config.js                 ← Sheet ID, categorie fisse, colori (le cose che si toccano più spesso)
  utils.js                  Parsing importi/date/mesi, formattazione euro
  useSheetData.js           Caricamento dati dal Google Sheet (CSV gviz)
  App.jsx                   Dashboard: logica, totali, budget, segnali, layout
  components/
    Icona.jsx               Icone lucide con alias + mappa categorie→icona
    Controlli.jsx            SegmentToggle, StatChip, Verdetto, SegnaleCard
    DrawerTrasferimenti.jsx Dettaglio movimenti tra conti
    Carte.jsx               CategoryBar, AndamentoCategoria, FisseVariabili, ReceiptTape
```

## Dove modificare cosa

- **Cambiare Sheet ID / categorie fisse / colori** → `src/config.js`
- **Aggiungere un'icona a una categoria** → `src/components/Icona.jsx` (mappa `iconMap`)
- **Logica di parsing di importi o date** → `src/utils.js`
- **Come vengono letti i dati dal foglio** → `src/useSheetData.js`
- **Totali, budget, segnali, layout della pagina** → `src/App.jsx`

## Deploy

Ogni push su `main` fa partire la build (tab **Actions**). A build finita il sito è aggiornato.
Requisito una tantum: Settings → Pages → Source = **GitHub Actions**.
