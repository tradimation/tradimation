import { mkdir, rm, writeFile } from "node:fs/promises";
import { componentDocs, motionDocs } from "../site/effects.js";

const effectsOutput = new URL("../website/effects/", import.meta.url);
const componentsOutput = new URL("../website/components/", import.meta.url);
await Promise.all([
  rm(effectsOutput, { recursive: true, force: true }),
  rm(componentsOutput, { recursive: true, force: true }),
]);
await Promise.all([
  mkdir(effectsOutput, { recursive: true }),
  mkdir(componentsOutput, { recursive: true }),
]);

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

await Promise.all([
  ...motionDocs.map((effect) =>
    writeFile(new URL(`${effect.id}.html`, effectsOutput), page(effect)),
  ),
  ...componentDocs.map((effect) =>
    writeFile(new URL(`${effect.id}.html`, componentsOutput), page(effect)),
  ),
]);
