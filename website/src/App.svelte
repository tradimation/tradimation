<script>
  import Header from "./components/Header.svelte";
  import Footer from "./components/Footer.svelte";
  import Home from "./pages/Home.svelte";
  import Catalog from "./pages/Catalog.svelte";
  import Detail from "./pages/Detail.svelte";

  const page = document.body.dataset.page;
</script>

<Header current={page === "home" ? "home" : "library"} />
{#if page === "home"}<Home />{:else if page === "catalog"}<Catalog />{:else}<Detail id={document.body.dataset.effect} />{/if}
{#if page !== "detail"}<Footer />{/if}
