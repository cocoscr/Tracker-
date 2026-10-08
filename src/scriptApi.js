/* ------------------------------------------------------------------ *
 *  SCRITTURA SUL FOGLIO — tramite lo stesso Apps Script del comando NFC
 *  L'indirizzo è SCRIPT_URL in config.js. Un indirizzo salvato sul
 *  telefono (localStorage) ha la precedenza: serve solo se un giorno
 *  si cambia deployment e si vuole provare senza ripubblicare l'app.
 * ------------------------------------------------------------------ */

import { SCRIPT_URL } from "./config.js";

const CHIAVE = "tracker.scriptUrl";

export function leggiUrlScript() {
  try {
    return localStorage.getItem(CHIAVE) || SCRIPT_URL || "";
  } catch {
    return SCRIPT_URL || "";
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
