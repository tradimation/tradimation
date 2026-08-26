import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { effectDocs } from "../site/effects.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const input = {
  home: resolve(root, "index.html"),
  catalog: resolve(root, "catalog.html"),
  ...Object.fromEntries(effectDocs.map((effect) => [effect.id, resolve(root, `effects/${effect.id}.html`)])),
};

export default defineConfig({
  root,
  base: "./",
  plugins: [svelte()],
  build: { outDir: resolve(root, "../site-dist"), emptyOutDir: true, rollupOptions: { input } },
});
