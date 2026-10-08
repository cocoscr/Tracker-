/* ------------------------------------------------------------------ *
 *  SCRITTURA SUL FOGLIO — tramite lo stesso Apps Script del comando NFC
 *
 *  L'indirizzo dello script NON sta nel codice (il repo è pubblico):
 *  si incolla una volta nell'app e resta salvato solo su quel telefono
 *  (localStorage). Chi legge il codice su GitHub non sa dove scrivere.
 *  Nota: l'icona sulla schermata Home e Safari hanno memorie separate,
 *  quindi va incollato in tutti e due se li usi entrambi.
 * ------------------------------------------------------------------ */

const CHIAVE = "tracker.scriptUrl";

export function leggiUrlScript() {
  try {
    return localStorage.getItem(CHIAVE) || "";
  } catch {
    return "";
  }
}

export function salvaUrlScript(url) {
  try {
    localStorage.setItem(CHIAVE, String(url).trim());
    return true;
  } catch {
    return false;
  }
}

export const urlScriptValido = (url) =>
  /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\/?$/.test(String(url).trim());

// POST "semplice" (text/plain) così il browser non fa la richiesta preliminare CORS
// che Apps Script non gestisce. La risposta è il JSON restituito da doPost().
export async function inviaAlFoglio(payload) {
  const url = leggiUrlScript();
  if (!url) throw new Error("Indirizzo dello script non impostato.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });
  const testo = await res.text();
  try {
    return JSON.parse(testo);
  } catch {
    throw new Error("Lo script ha risposto in modo inatteso. Controlla l'indirizzo.");
  }
}
