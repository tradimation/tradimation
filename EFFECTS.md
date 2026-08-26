# Effect curation

Tradimation keeps an effect only when its silhouette, timing, or integration contract remains recognizable outside a single catalog demo.

## Current scopes

- **Core**: controller lifecycle, timing math, registry, cleanup, and renderers.
- **Effects**: five reusable visual behaviors with no UI-specific state contract.
- **Recipes**: nine contextual applications for controls, entrances, exits, state swaps, and spatial handoffs.

## Removed during curation

- `underline-snap`: superseded by the geometry-aware `tab-indicator-sweep` recipe.
- `badge-punch`, `radio-pop`, `text-punch`, and `pop-out`: visual restatements of `squash-stretch`.
- `slam-down`: superseded by the connected-texture `stamp-in` recipe.
- `hover-take` and `icon-kick`: small contextual variations of `wind-up-shift`.
- `label-flip-take`: a weaker state-swap variation of `compress-swap`.
- `speech-bubble-pop`: a component-specific squash-and-stretch entrance.
- `line-boil`: requires authored replacement drawings but does not communicate a meaningful UI state change.
- `cartoon-check`: a checkmark-specific replacement-drawing recipe with little reuse outside its demo.

The removed names are intentionally absent from `EffectId` and the registry rather than retained as aliases. This keeps discovery honest and avoids presenting quantity as product value.
