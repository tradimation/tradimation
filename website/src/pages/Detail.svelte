<script>
  import { onMount } from "svelte";
  import { createEffect } from "../../../dist/index.js";
  import { effectDocs, findEffectDoc } from "../../../site/effects.js";
  export let id = "";
  const effect = findEffectDoc(id);
  const next = effectDocs[(effectDocs.indexOf(effect) + 1) % effectDocs.length];
  const hrefFor = (item) => `../${item.kind === "component" ? "components" : "effects"}/${item.id}.html`;
  let stage = null;
  let demoRoot = null;
  let controller;
  let status = "Ready.";
  let parameters = Object.fromEntries(effect.controls.map((control) => [control.key, control.value]));

  $: code = `playEffect(target, "${effect.id}", {\n${effect.controls.map(({ key }) => `  ${key}: ${typeof parameters[key] === "string" ? `"${parameters[key]}"` : parameters[key]}`).concat(effect.options?.overlay ? ["  overlayRoot: stage"] : []).join(",\n")}\n});`;

  function resetMarkup() { demoRoot.innerHTML = effect.markup; }
  function optionFor(selector) { return selector ? demoRoot.querySelector(selector) : undefined; }
  async function play(overrides = {}, resetDemo = true) {
    controller?.destroy();
    if (resetDemo) resetMarkup();
    status = effect.kind === "component" ? "Updating component…" : "Playing effect…";
    const target = demoRoot.querySelector(effect.target);
    const options = { ...parameters, ...overrides };
    if (effect.options?.overlay) options.overlayRoot = stage;
    if (effect.options?.destination) options.destination = optionFor(effect.options.destination);
    if (effect.options?.source) options.source = optionFor(effect.options.source);
    if (effect.interactive === "swap") options.secondary = optionFor(".swap-b");
    if (effect.interactive === "tabs" && !options.destination) options.destination = optionFor(".tab:nth-child(2)");
    if (effect.interactive === "toggle" && !options.direction) options.direction = "right";
    if (effect.interactive === "toggle") { const checked = options.direction === "right"; target.closest("[role=switch]")?.setAttribute("aria-checked", String(checked)); demoRoot.querySelector(".switch-state").textContent = checked ? "On" : "Off"; }
    if (effect.interactive === "tabs" && resetDemo && options.destination) { demoRoot.querySelectorAll(".tab").forEach((tab) => { const active = tab === options.destination; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active)); }); demoRoot.querySelector(".tabs-hint").textContent = options.destination.dataset.panelCopy; }
    try {
      controller = createEffect(target, effect.id, options);
      await controller.play();
      status = "Preview updated.";
    } catch {
      status = "Preview unavailable. Reset and try again.";
    }
  }
  async function interact(event) {
    const action = event.target.closest("[data-demo-action]");
    if (!action || !demoRoot.contains(action)) return;
    if (action.dataset.demoAction === "toggle") {
      const checked = action.getAttribute("aria-checked") === "true";
      action.setAttribute("aria-checked", String(!checked));
      demoRoot.querySelector(".switch-state").textContent = checked ? "Off" : "On";
      await play({ direction: checked ? "left" : "right" }, false);
      return;
    }
    if (action.dataset.demoAction === "tab") {
      if (action.classList.contains("active")) return;
      demoRoot.querySelectorAll(".tab").forEach((tab) => { const active = tab === action; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active)); });
      demoRoot.querySelector(".tabs-hint").textContent = action.dataset.panelCopy;
      await play({ destination: action }, false);
      return;
    }
    if (action.dataset.demoAction === "toast-dismiss") { controller?.destroy(); action.closest(".toast")?.remove(); status = "Notification dismissed."; return; }
    if (action.dataset.demoAction === "toast") await play({}, true);
  }
  function interactKeydown(event) {
    const tab = event.target.closest('[data-demo-action="tab"]');
    if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...demoRoot.querySelectorAll('[data-demo-action="tab"]')];
    const step = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
    nextTab.focus();
    nextTab.click();
  }
  function update(control, event) { parameters = { ...parameters, [control.key]: control.type === "select" ? event.currentTarget.value : Number(event.currentTarget.value) }; play(); }
  function reset() { parameters = Object.fromEntries(effect.controls.map((control) => [control.key, control.value])); play(); }
  async function copy(event) { await navigator.clipboard.writeText(code); event.currentTarget.textContent = "Copied"; setTimeout(() => event.currentTarget.textContent = "Copy code", 1200); }
  onMount(() => { resetMarkup(); demoRoot.addEventListener("click", interact); demoRoot.addEventListener("keydown", interactKeydown); setTimeout(play, 160); return () => { demoRoot.removeEventListener("click", interact); demoRoot.removeEventListener("keydown", interactKeydown); controller?.destroy(); }; });
</script>

<div class="detail-layout">
  <aside class="effect-nav"><a class="back-link" href="../catalog.html">← Motion library</a>{#each effectDocs as item}<a class:active={item.id === effect.id} aria-current={item.id === effect.id ? "page" : undefined} href={hrefFor(item)}>{item.name}</a>{/each}</aside>
  <main class="detail-main">
    <p class="eyebrow">{effect.kind} / {effect.group}</p><h1>{effect.name}</h1><p class="detail-summary">{effect.summary}</p>
    <section><div class="playground-heading"><h2>Playground</h2><p aria-live="polite">{status}</p></div>
      <div class="playground"><div class="demo-stage" class:component-stage={effect.kind === "component"} bind:this={stage}><span class="stage-label">{effect.kind === "component" ? "Interactive component" : "Live cel"}</span><div class="demo-root" bind:this={demoRoot}></div></div>
        <form class="controls" on:submit|preventDefault>
          <p class="control-intro">{effect.kind === "component" ? "Interact with the demo or tune its internal motion." : "Tune the drawing. Changes replay automatically."}</p>
          {#each effect.controls as control}<label class="parameter"><span>{control.label}<output>{parameters[control.key]}{control.suffix ?? ""}</output></span>
            {#if control.type === "select"}<select value={parameters[control.key]} on:change={(event) => update(control, event)}>{#each control.options as option}<option value={option}>{option}</option>{/each}</select>{:else}<input type="range" min={control.min} max={control.max} step={control.step} value={parameters[control.key]} on:input={(event) => update(control, event)} />{/if}
          </label>{/each}
          <div class="control-actions"><button class="button motion" type="button" on:click={() => play()}>{effect.kind === "component" ? "Replay component" : "Replay effect"}</button><button class="button secondary" type="button" on:click={reset}>Reset parameters</button></div>
        </form>
      </div>
    </section>
    <section class="usage"><div><p class="eyebrow">Use when</p><h2>{effect.why}</h2></div><div><div class="code-heading"><span>Usage</span><button on:click={copy}>Copy code</button></div><pre><code>{code}</code></pre></div></section>
    <a class="next-effect" href={hrefFor(next)}><span>Next motion</span><strong>{next.name}</strong><b>→</b></a>
  </main>
</div>
