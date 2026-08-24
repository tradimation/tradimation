# Tradimation architecture

## Design boundary

Tradimation owns visual motion behavior, not application state or framework lifecycle. A caller supplies an existing `HTMLElement`, optional source/destination geometry, and effect options. The runtime returns an imperative controller.

```text
Catalog / framework adapters / application code
                    ↓
            EffectRegistry + manifest
                    ↓
        Controller + timeline primitives
              ↙              ↘
      WAAPI DOM/SVG      connected WebGL mesh
```

## Framework integration

Framework packages should remain thin lifecycle adapters:

```ts
const controller = createEffect(element, effectId, options);
void controller.play();

return () => controller.destroy();
```

React, Vue, Svelte, and Web Components can all use that same contract. They must not reimplement effect timing or renderer behavior.

## Canonical definitions

- `src/effects/dom.ts`: DOM, SVG, mask, and layered-state timelines.
- `src/effects/mesh.ts`: connected-texture effect manifests and controller setup.
- `src/effects/mesh-maps.ts`: the six reviewed programmable deformation maps.
- `src/registry.ts`: curated registry, effect/recipe collections, and public creation API.
- `src/controller.ts`: pause, reverse, seek, finish, cancel, and cleanup semantics.
- `src/renderers/connected-texture.ts`: whole-element capture and shared WebGL mesh.

## Cleanup policy

- `restore`: restore the target's previous inline style after playback.
- `commit`: preserve the final visual state.
- `hide`: remove the target visually after an exit.

Every adapter must call `destroy()` during unmount or disposal so overlays, WebGL resources, animation handles, and inline styles are released.
