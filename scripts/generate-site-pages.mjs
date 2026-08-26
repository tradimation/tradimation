import { mkdir, writeFile } from "node:fs/promises";
import { effectDocs } from "../site/effects.js";

const output = new URL("../website/effects/", import.meta.url);
await mkdir(output, { recursive: true });

const page = (effect) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${effect.summary}" />
    <title>${effect.name} — Tradimation</title>
  </head>
  <body data-page="detail" data-effect="${effect.id}"><div id="app"></div><script type="module" src="/src/main.js"></script></body>
</html>`;

await Promise.all(effectDocs.map((effect) => writeFile(new URL(`${effect.id}.html`, output), page(effect))));
