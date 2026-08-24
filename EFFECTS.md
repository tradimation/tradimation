# Effect curation

Tradimation keeps an effect only when its silhouette, timing, or integration contract remains recognizable outside a single catalog demo.

## Current scopes

- **Core**: controller lifecycle, timing math, registry, cleanup, and renderers.
- **Effects**: six reusable visual behaviors with no UI-specific state contract.
- **Recipes**: eleven contextual applications for controls, entrances, exits, state swaps, and spatial handoffs.

## Removed in the 17-effect pass

- `underline-snap`: superseded by the geometry-aware `tab-underline-take` recipe.
- `badge-punch`, `radio-pop`, and `text-punch`: visual restatements of `squash-stretch`.
- `slam-down`: superseded by the connected-texture `stamp-in` recipe.
- `hover-take` and `icon-kick`: small contextual variations of `anticipation-take`.
- `label-flip-take`: a weaker state-swap variation of `compress-swap`.
- `speech-bubble-pop`: a component-specific variation of `pop-out`.

The removed names are intentionally absent from `EffectId` and the registry rather than retained as aliases. This keeps discovery honest and avoids presenting quantity as product value.
