import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: "./" rende i percorsi relativi, così funziona su GitHub Pages
// sia come sito di progetto (utente.github.io/repo) che con dominio custom.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
