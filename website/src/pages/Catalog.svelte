<script>
  import { effectDocs } from "../../../site/effects.js";
  import EffectCard from "../components/EffectCard.svelte";
  let query = "";
  let filter = "all";
  $: visible = effectDocs.filter((effect) => (filter === "all" || effect.kind === filter) && `${effect.name} ${effect.group} ${effect.summary}`.toLowerCase().includes(query.toLowerCase()));
  $: motions = visible.filter((effect) => effect.kind !== "component");
  $: components = visible.filter((effect) => effect.kind === "component");
</script>

<main class="catalog container">
  <section class="catalog-intro">
    <div><p class="eyebrow">Curated motion library</p><h1>Effects,<br />in context.</h1></div>
    <p>Explore reusable motion on expressive subjects, or start with a complete animated component whose state and interaction are already designed.</p>
  </section>
  <div class="toolbar">
    <label class="search-field"><span class="sr-only">Search the library</span><input bind:value={query} type="search" placeholder="Search motion, use, or technique…" /></label>
    <div class="segments" aria-label="Filter library">
      {#each [["all", "All"], ["effect", "Effects"], ["recipe", "Recipes"], ["component", "Components"]] as item}<button class:active={filter === item[0]} aria-pressed={filter === item[0]} on:click={() => filter = item[0]}>{item[1]}</button>{/each}
    </div>
    <span class="result-count">{String(visible.length).padStart(2, "0")} / {effectDocs.length}</span>
  </div>
  {#if motions.length}<section class="catalog-group" aria-labelledby="motion-heading"><div class="catalog-group-heading"><p class="eyebrow">Motion primitives</p><h2 id="motion-heading">Effects & recipes</h2><span>{String(motions.length).padStart(2, "0")}</span></div><div class="effect-grid">{#each motions as effect}<EffectCard {effect} />{/each}</div></section>{/if}
  {#if components.length}<section class="catalog-group components-group" aria-labelledby="component-heading"><div class="catalog-group-heading"><p class="eyebrow">Effect included</p><h2 id="component-heading">Animated components</h2><span>{String(components.length).padStart(2, "0")}</span></div><p class="group-note">State, accessibility, geometry, and motion are presented as one complete interaction—not as a loose effect preset.</p><div class="effect-grid">{#each components as effect}<EffectCard {effect} />{/each}</div></section>{/if}
  {#if !visible.length}<p class="empty">No motion matches that search.</p>{/if}
</main>
