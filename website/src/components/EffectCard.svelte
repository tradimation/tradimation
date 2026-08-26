<script>
  export let effect;
  const nested = document.body.dataset.page === "detail";
  const directoryFor = (item) => item.kind === "component" ? "components" : "effects";
</script>
<a class="effect-card" href={`${nested ? `../${directoryFor(effect)}/` : `./${directoryFor(effect)}/`}${effect.id}.html`}>
  <div class="card-meta"><span>{effect.kind}</span><span>{effect.group}</span></div>
  <div><h2>{effect.name}</h2><p>{effect.summary}</p></div>
  <span class="card-link">Open playground <span>↗</span></span>
</a>
