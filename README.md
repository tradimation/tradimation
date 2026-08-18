# Tradimation

Framework-neutral traditional-animation effects for existing web elements. Tradimation uses Web Animations API for DOM/SVG effects and a connected WebGL texture mesh for deformation effects. It has no React dependency and no runtime package dependency.

## Install and build

```bash
npm install
npm run build
```

## Basic use

```ts
import { playEffect } from "@tradimation/core";

const button = document.querySelector<HTMLButtonElement>("#save");

if (button) {
  const controller = playEffect(button, "hover-take", {
    direction: "up",
    intensity: 0.9,
  });

  button.addEventListener("pointerleave", () => controller.reverse());
}
```

## Connected-texture effects

```ts
import { playEffect } from "@tradimation/core";

const card = document.querySelector<HTMLElement>(".product-card");
const cart = document.querySelector<HTMLElement>(".cart-icon");

if (card && cart) {
  playEffect(card, "suck-in", {
    destination: cart,
    bodyTravel: 0.5,
    columnLag: 0.3,
  });
}
```

The element is captured as one texture, rendered on one shared 32×14 WebGL mesh, and never split into independent DOM slices.

## Explicit control

```ts
import { createEffect } from "@tradimation/core";

const controller = createEffect(element, "stamp-in", { duration: 770 });

await controller.play();
controller.seek(0.42);
controller.pause();
controller.reverse();
controller.cancel();
controller.destroy();
```

## Registry

```ts
import { EffectRegistry, effects, listEffects } from "@tradimation/core";

const manifests = listEffects(); // 26 canonical effects
const customRegistry = new EffectRegistry(effects);
customRegistry.register(myCustomEffect);
```

The manifest layer is framework-neutral, so a React, Vue, Svelte, Web Component, or imperative adapter can wrap the same definitions without owning animation behavior.

## Catalogs

- `catalog.html`: complete 26-effect live catalog
- `index.html`: detailed six-effect connected-texture tuning lab
