<script>
  import { effectDocs } from "../../../site/effects.js";
  import EffectCard from "../components/EffectCard.svelte";
  let query = "";
  let filter = "all";
  $: visible = effectDocs.filter((effect) => (filter === "all" || effect.kind === filter) && `${effect.name} ${effect.group} ${effect.summary}`.toLowerCase().includes(query.toLowerCase()));
</script>

<main class="catalog container">
  <section class="catalog-intro">
    <div><p class="eyebrow">Curated motion library</p><h1>Effects &<br />UI recipes.</h1></div>
    <p>Choose a movement by intent, tune it against a live cel, then copy the exact usage into your interface.</p>
  </section>
  <div class="toolbar">
    <label class="search-field"><span class="sr-only">Search the library</span><input bind:value={query} type="search" placeholder="Search motion, use, or technique…" /></label>
    <div class="segments" aria-label="Filter library">
      {#each [["all", "All"], ["effect", "Effects"], ["recipe", "UI Recipes"]] as item}<button class:active={filter === item[0]} aria-pressed={filter === item[0]} on:click={() => filter = item[0]}>{item[1]}</button>{/each}
    </div>
    <span class="result-count">{String(visible.length).padStart(2, "0")} / {effectDocs.length}</span>
  </div>
  <section class="effect-grid" aria-label="Motion library">
    {#each visible as effect}<EffectCard {effect} />{:else}<p class="empty">No motion matches that search.</p>{/each}
  </section>
</main>
