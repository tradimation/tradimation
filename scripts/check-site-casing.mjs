import { readFile, readdir } from "node:fs/promises";

const generatedPages = (await readdir("effects"))
  .filter((file) => file.endsWith(".html"))
  .map((file) => `effects/${file}`);

const siteFiles = [
  "index.html",
  "catalog.html",
  "cel-motion-gallery-v2.html",
  "site/site.css",
  "site/effects.js",
  "site/catalog.js",
  "site/detail.js",
  "site/home.js",
  ...generatedPages,
];

const uppercaseTransform = /text-transform\s*:\s*uppercase/i;
const htmlText = />([^<>{}]*)</g;
const quotedText = /(["'])([^"'\n]+)\1/g;
const uppercaseCopy = /^[\p{Lu}\s&!+./→-]+$/u;

const isUppercaseCopy = (value) => {
  const copy = value.trim();
  const letters = copy.match(/\p{L}/gu) ?? [];
  return letters.length >= 2 && uppercaseCopy.test(copy);
};

const failures = [];

for (const file of siteFiles) {
  const source = await readFile(file, "utf8");

  if (uppercaseTransform.test(source)) {
    failures.push(`${file}: uppercase text transform`);
  }

  const candidates = [
    ...Array.from(source.matchAll(htmlText), (match) => match[1]),
    ...Array.from(source.matchAll(quotedText), (match) => match[2]),
  ];

  for (const candidate of candidates) {
    if (isUppercaseCopy(candidate)) {
      failures.push(`${file}: ${JSON.stringify(candidate.trim())}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Use natural casing for site copy. Full uppercase presentation is not allowed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
}
