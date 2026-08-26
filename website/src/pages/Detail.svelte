<script>
  import { onMount } from "svelte";
  import { createEffect } from "../../../dist/index.js";
  import { effectDocs, findEffectDoc } from "../../../site/effects.js";
  export let id = "";
  const effect = findEffectDoc(id);
  const next = effectDocs[(effectDocs.indexOf(effect) + 1) % effectDocs.length];
  let stage = null;
  let demoRoot = null;
  let controller;
  let status = "Ready.";
  let parameters = Object.fromEntries(effect.controls.map((control) => [control.key, control.value]));

  $: code = `playEffect(target, "${effect.id}", {\n${effect.controls.map(({ key }) => `  ${key}: ${typeof parameters[key] === "string" ? `"${parameters[key]}"` : parameters[key]}`).concat(effect.options?.overlay ? ["  overlayRoot: stage"] : []).join(",\n")}\n});`;

  function resetMarkup() { demoRoot.innerHTML = effect.markup; }
  function optionFor(selector) { return selector ? demoRoot.querySelector(selector) : undefined; }
  async function play() {
    controller?.destroy();
    resetMarkup();
    status = "Playing effect…";
    const target = demoRoot.querySelector(effect.target);
    const options = { ...parameters };
    if (effect.options?.overlay) options.overlayRoot = stage;
    if (effect.options?.destination) options.destination = optionFor(effect.options.destination);
    if (effect.options?.source) options.source = optionFor(effect.options.source);
    if (effect.interactive === "swap") options.secondary = optionFor(".swap-b");
    if (effect.interactive === "tabs") options.destination = optionFor(".tab:nth-child(2)");
    if (effect.interactive === "toggle") options.direction = "right";
    try {
      controller = createEffect(target, effect.id, options);
      await controller.play();
      status = "Preview updated.";
    } catch {
      status = "Preview unavailable. Reset and try again.";
    }
  }
  function update(control, event) { parameters = { ...parameters, [control.key]: control.type === "select" ? event.currentTarget.value : Number(event.currentTarget.value) }; play(); }
  function reset() { parameters = Object.fromEntries(effect.controls.map((control) => [control.key, control.value])); play(); }
  async function copy(event) { await navigator.clipboard.writeText(code); event.currentTarget.textContent = "Copied"; setTimeout(() => event.currentTarget.textContent = "Copy code", 1200); }
  onMount(() => { resetMarkup(); setTimeout(play, 160); return () => controller?.destroy(); });
</script>

<div class="detail-layout">
  <aside class="effect-nav"><a class="back-link" href="../catalog.html">← Motion library</a>{#each effectDocs as item}<a class:active={item.id === effect.id} aria-current={item.id === effect.id ? "page" : undefined} href={`./${item.id}.html`}>{item.name}</a>{/each}</aside>
  <main class="detail-main">
    <p class="eyebrow">{effect.kind} / {effect.group}</p><h1>{effect.name}</h1><p class="detail-summary">{effect.summary}</p>
    <section><div class="playground-heading"><h2>Playground</h2><p aria-live="polite">{status}</p></div>
      <div class="playground"><div class="demo-stage" bind:this={stage}><span class="stage-label">Live cel</span><div class="demo-root" bind:this={demoRoot}></div></div>
        <form class="controls" on:submit|preventDefault>
          <p class="control-intro">Tune the drawing. Changes replay automatically.</p>
          {#each effect.controls as control}<label class="parameter"><span>{control.label}<output>{parameters[control.key]}{control.suffix ?? ""}</output></span>
            {#if control.type === "select"}<select value={parameters[control.key]} on:change={(event) => update(control, event)}>{#each control.options as option}<option value={option}>{option}</option>{/each}</select>{:else}<input type="range" min={control.min} max={control.max} step={control.step} value={parameters[control.key]} on:input={(event) => update(control, event)} />{/if}
          </label>{/each}
          <div class="control-actions"><button class="button motion" type="button" on:click={play}>Replay effect</button><button class="button secondary" type="button" on:click={reset}>Reset parameters</button></div>
        </form>
      </div>
    </section>
    <section class="usage"><div><p class="eyebrow">Use when</p><h2>{effect.why}</h2></div><div><div class="code-heading"><span>Usage</span><button on:click={copy}>Copy code</button></div><pre><code>{code}</code></pre></div></section>
    <a class="next-effect" href={`./${next.id}.html`}><span>Next motion</span><strong>{next.name}</strong><b>→</b></a>
  </main>
</div>
