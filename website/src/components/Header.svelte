<script>
  import symbol from "../../../assets/brand/tradimation-symbol.png";
  export let current;
  const nested = document.body.dataset.page === "detail";
  const root = nested ? "../" : "./";
</script>

<header class="site-header">
  <nav aria-label="Primary navigation">
    <a class="brand" href={`${root}index.html`}><img src={symbol} alt="" width="38" height="38" />Tradimation</a>
    <div class="nav-links">
      <a href={`${root}index.html`} aria-current={current === "home" ? "page" : undefined}>Home</a>
      <a href={`${root}catalog.html`} aria-current={current === "library" ? "page" : undefined}>Library</a>
      <a href="https://github.com/tradimation/tradimation">GitHub ↗</a>
    </div>
  </nav>
</header>
