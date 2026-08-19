# Tradimation

Framework-neutral traditional-animation effects for existing web elements. Tradimation uses Web Animations API for DOM/SVG effects and a connected WebGL texture mesh for deformation effects. It has no React dependency and no runtime package dependency.

**Website:** [tradimation.github.io/tradimation](https://tradimation.github.io/tradimation/) · **Effect collection:** [Browse all 26 effects](https://tradimation.github.io/tradimation/catalog.html)

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
    overlayRoot: card.closest<HTMLElement>(".motion-stage"),
    bodyTravel: 0.5,
    columnLag: 0.3,
  });
}
```

The element is captured as one texture, rendered on one shared 32×14 WebGL mesh, and never split into independent DOM slices. Pass `overlayRoot` to keep coordinates, clipping, and travel relative to a component or preview stage; omit it for viewport-wide motion.

Existing transforms are preserved by default. Set `preserveTransform: false` only when an effect should replace the target's current transform completely.

## Replacement drawings

`line-boil` and `cartoon-check` use held replacement drawings rather than morphing one path. Mark two or more child drawings with `data-tradimation-drawing`; Tradimation exposes them in sequence while keeping the parent's layout stable.

```html
<svg class="check" viewBox="0 0 100 100">
  <path data-tradimation-drawing d="M22 55 L39 71 L70 30" />
  <path data-tradimation-drawing d="M12 52 L39 78 L88 20" />
  <path data-tradimation-drawing d="M16 52 L39 74 L84 24" />
</svg>
```

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

- `index.html`: project landing page and interactive preview
- `cel-motion-gallery-v2.html`: canonical motion-reference collection
- `catalog.html`: actual-library collection
