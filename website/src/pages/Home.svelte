<script>
  import { onMount } from "svelte";
  import { createEffect } from "../../../dist/index.js";
  import symbol from "../../../assets/brand/tradimation-symbol.png";
  import ButtonLink from "../components/ButtonLink.svelte";

  const previews = [
    { id: "smear", name: "Smear" },
    { id: "wind-up-shift", name: "Wind-Up Shift" },
    { id: "squash-stretch", name: "Squash & Stretch" },
  ];
  let active = previews[0];
  let stage = null;
  let target = null;
  let status = "Ready to play.";
  let controller;

  async function play(preview) {
    active = preview;
    controller?.destroy();
    target.style.cssText = "";
    status = `Playing ${preview.name}…`;
    try {
      const options = { cleanup: "restore" };
      if (preview.id === "smear") options.overlayRoot = stage;
      controller = createEffect(target, preview.id, options);
      await controller.play();
      status = `${preview.name} complete.`;
    } catch {
      status = "Preview unavailable. Try another effect.";
    }
  }

  onMount(() => {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(() => play(active), 320);
    return () => controller?.destroy();
  });
</script>

<main class="home container">
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Animation tools for interface work</p>
      <img class="hero-symbol" src={symbol} alt="Cel Runner, the Tradimation symbol" />
      <h1>Draw motion.<br />Keep your interface.</h1>
      <p class="hero-lead">Authored animation effects that attach to the DOM you already own—without taking over state, markup, or your framework.</p>
      <div class="hero-actions"><ButtonLink href="./catalog.html">Explore the library</ButtonLink><ButtonLink href="#principles" tone="motion">How it works</ButtonLink></div>
    </div>
    <section class="preview-frame" aria-labelledby="preview-title">
      <div class="frame-label"><span id="preview-title">Live cel</span><span>01 / 03</span></div>
      <div class="preview-stage" bind:this={stage}><div class="preview-target" bind:this={target}>Existing element</div></div>
      <div class="preview-tabs" aria-label="Preview effect">
        {#each previews as preview}<button class:active={active.id === preview.id} aria-pressed={active.id === preview.id} on:click={() => play(preview)}>{preview.name}</button>{/each}
      </div>
      <p class="preview-status" aria-live="polite">{status}</p>
    </section>
  </section>

  <section class="principles section" id="principles">
    <header class="section-header"><p class="eyebrow">Working principles</p><h2>Motion with boundaries.</h2></header>
    <div class="principle-grid">
      <article><span>01</span><h3>Existing DOM</h3><p>Bring your own component. Tradimation adds only the visual behavior.</p></article>
      <article><span>02</span><h3>State stays yours</h3><p>Your application owns logic and lifecycle. Every effect returns a controller.</p></article>
      <article><span>03</span><h3>Authored, not generic</h3><p>Each movement comes from a traditional animation principle, not a preset easing menu.</p></article>
    </div>
  </section>

  <section class="quick-start section">
    <div><p class="eyebrow">Direct by design</p><h2>One element.<br />One motion layer.</h2><p>The library stays framework-neutral and reversible.</p></div>
    <pre><code>import {`{ playEffect }`} from "@tradimation/core";

const controller = playEffect(button, "wind-up-shift", {`{
  direction: "right",
  intensity: 0.9
}`});

button.addEventListener("pointerleave", () =&gt; controller.reverse());</code></pre>
  </section>
</main>
