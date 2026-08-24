import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  root: "src",
  format: ["esm"],
  fixedExtension: false,
  unbundle: true,
  dts: { sourcemap: true },
  sourcemap: true,
  clean: true,
});
