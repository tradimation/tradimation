import { createEffect } from "../dist/index.js";
import { effectDocs, findEffectDoc } from "./effects.js";

const effect = findEffectDoc(document.body.dataset.effect);
if (!effect) throw new Error(`Unknown effect documentation: ${document.body.dataset.effect}`);

const stage = document.querySelector("#stage");
const demoRoot = document.querySelector("#demo-root");
const controlsRoot = document.querySelector("#parameter-controls");
const status = document.querySelector("#playground-status");
const replayButton = document.querySelector("#replay");
const resetButton = document.querySelector("#reset");
const code = document.querySelector("#effect-code");
const nav = document.querySelector("#effect-nav");
const next = document.querySelector("#next-effect");

document.querySelector("#playground-controls").addEventListener("submit", (event) => event.preventDefault());
document.title = `${effect.name} — Tradimation`;
document.querySelector("#effect-name").textContent = effect.name;
document.querySelector("#effect-summary").textContent = effect.summary;
document.querySelector("#effect-why").textContent = effect.why;

effectDocs.forEach((item) => {
  const link = document.createElement("a");
  link.className = `detail-link${item.id === effect.id ? " active" : ""}`;
  link.href = `./${item.id}.html`;
  link.textContent = item.name;
  if (item.id === effect.id) link.setAttribute("aria-current", "page");
  nav.append(link);
});

const nextEffect = effectDocs[(effectDocs.indexOf(effect) + 1) % effectDocs.length];
next.href = `./${nextEffect.id}.html`;
next.querySelector("strong").textContent = nextEffect.name;

const initialParameters = Object.fromEntries(effect.controls.map((control) => [control.key, control.value]));
const parameters = { ...initialParameters };
let controller = null;
let replayTimer = 0;
let runVersion = 0;
let toggleChecked = false;
let selectedTab = 0;
let swapState = "a";

const updateCode = () => {
  const entries = effect.controls.map(({ key }) => {
    const value = parameters[key];
    return `  ${key}: ${typeof value === "string" ? `"${value}"` : value}`;
  });
  if (effect.options?.destination) entries.push("  destination: destinationElement");
  if (effect.options?.source) entries.push("  source: sourceElement");
  if (effect.options?.overlay) entries.push("  overlayRoot: stage");
  if (effect.interactive === "swap") entries.push("  secondary: nextElement");
  code.textContent = `playEffect(target, "${effect.id}", {\n${entries.join(",\n")}\n});`;
};

const scheduleReplay = () => {
  window.clearTimeout(replayTimer);
  status.textContent = "Parameters changed. Updating preview…";
  replayTimer = window.setTimeout(() => play({ reset: true }), 160);
};

const renderControls = () => {
  controlsRoot.replaceChildren();
  effect.controls.forEach((control) => {
    const field = document.createElement("div");
    field.className = "parameter";
    const label = document.createElement("label");
    label.htmlFor = `parameter-${control.key}`;
    label.append(control.label);
    const output = document.createElement("output");
    output.htmlFor = `parameter-${control.key}`;
    output.textContent = `${parameters[control.key]}${control.suffix ?? ""}`;
    label.append(output);

    let input;
    if (control.type === "select") {
      input = document.createElement("select");
      control.options.forEach((option) => input.add(new Option(option[0].toUpperCase() + option.slice(1), option)));
      input.value = parameters[control.key];
    } else {
      input = document.createElement("input");
      input.type = "range";
      input.min = control.min;
      input.max = control.max;
      input.step = control.step;
      input.value = parameters[control.key];
    }
    input.id = `parameter-${control.key}`;
    input.name = control.key;
    input.addEventListener(control.type === "select" ? "change" : "input", () => {
      parameters[control.key] = control.type === "select" ? input.value : Number(input.value);
      output.textContent = `${input.value}${control.suffix ?? ""}`;
      updateCode();
      scheduleReplay();
    });
    field.append(label, input);
    controlsRoot.append(field);
  });
};

const settleTab = (tab) => {
  const tabs = demoRoot.querySelector(".tabs");
  const line = demoRoot.querySelector(".tab-line");
  if (!tabs || !line || !tab) return;
  const tabsRect = tabs.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  line.style.left = `${tabRect.left - tabsRect.left}px`;
  line.style.width = `${tabRect.width}px`;
  line.style.transform = "none";
};

const toggleTravel = () => {
  const toggle = demoRoot.querySelector(".toggle");
  const knob = demoRoot.querySelector(".knob");
  return toggle && knob ? toggle.getBoundingClientRect().width - knob.offsetWidth - 14 : 0;
};

const setTogglePosition = (checked) => {
  const toggle = demoRoot.querySelector(".toggle");
  const knob = demoRoot.querySelector(".knob");
  if (!toggle || !knob) return;
  toggle.setAttribute("aria-checked", String(checked));
  knob.style.transform = checked ? `translateX(${toggleTravel()}px)` : "translateX(0)";
};

const setSwapState = () => {
  const first = demoRoot.querySelector(".swap-a");
  const second = demoRoot.querySelector(".swap-b");
  if (!first || !second) return;
  first.style.visibility = swapState === "a" ? "visible" : "hidden";
  second.style.visibility = swapState === "b" ? "visible" : "hidden";
  demoRoot.querySelector(".swap")?.setAttribute("aria-label", `Change to ${swapState === "a" ? "night" : "day"}`);
};

const bindDemoInteractions = () => {
  demoRoot.querySelector(".toggle")?.addEventListener("click", () => play({ action: "toggle" }));
  demoRoot.querySelector(".swap")?.addEventListener("click", () => play({ action: "swap" }));
  demoRoot.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => play({ action: "tab", requestedTarget: tab })));
};

const resetDemo = () => {
  controller?.destroy();
  controller = null;
  demoRoot.innerHTML = effect.markup;
  toggleChecked = false;
  selectedTab = 0;
  swapState = "a";
  setTogglePosition(false);
  setSwapState();
  bindDemoInteractions();
  if (effect.interactive === "tabs") requestAnimationFrame(() => settleTab(demoRoot.querySelector(".tab.active")));
};

async function play({ reset = false, action = "preview", requestedTarget } = {}) {
  window.clearTimeout(replayTimer);
  const version = ++runVersion;
  if (reset) resetDemo();
  else controller?.destroy();
  controller = null;
  status.textContent = "Playing effect…";
  replayButton.disabled = true;

  try {
    let target = demoRoot.querySelector(effect.target);
    const options = { ...parameters };
    if (effect.options?.overlay) options.overlayRoot = stage;
    if (effect.options?.destination) options.destination = demoRoot.querySelector(effect.options.destination);
    if (effect.options?.source) options.source = demoRoot.querySelector(effect.options.source);

    if (effect.interactive === "toggle") {
      const nextChecked = action === "toggle" ? !toggleChecked : true;
      setTogglePosition(toggleChecked);
      target = demoRoot.querySelector(".knob");
      options.direction = nextChecked ? "right" : "left";
      options.preserveTransform = false;
      toggleChecked = nextChecked;
      demoRoot.querySelector(".toggle")?.setAttribute("aria-checked", String(toggleChecked));
    }

    if (effect.interactive === "tabs") {
      const tabs = [...demoRoot.querySelectorAll(".tab")];
      settleTab(tabs[selectedTab]);
      const destination = requestedTarget ?? tabs[(selectedTab + 1) % tabs.length];
      selectedTab = tabs.indexOf(destination);
      tabs.forEach((tab, tabIndex) => {
        const active = tabIndex === selectedTab;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      target = demoRoot.querySelector(".tab-line");
      options.destination = destination;
      options.preserveTransform = false;
    }

    if (effect.interactive === "swap") {
      setSwapState();
      const source = demoRoot.querySelector(swapState === "a" ? ".swap-a" : ".swap-b");
      const destination = demoRoot.querySelector(swapState === "a" ? ".swap-b" : ".swap-a");
      target = source;
      options.secondary = destination;
      swapState = swapState === "a" ? "b" : "a";
    }

    controller = createEffect(target, effect.id, options);
    await controller.play();
    if (version !== runVersion) return;
    if (effect.interactive === "tabs") settleTab(demoRoot.querySelectorAll(".tab")[selectedTab]);
    if (effect.interactive === "swap") setSwapState();
    if (effect.restoreAfterPlay) {
      await new Promise((resolve) => window.setTimeout(resolve, 240));
      if (version !== runVersion) return;
      resetDemo();
    }
    status.textContent = "Preview updated.";
  } catch (error) {
    if (version !== runVersion) return;
    status.textContent = "Preview failed. Reset the parameters and try again.";
    console.error(error);
  } finally {
    if (version === runVersion) replayButton.disabled = false;
  }
}

replayButton.addEventListener("click", () => play({ reset: true }));
resetButton.addEventListener("click", () => {
  Object.assign(parameters, initialParameters);
  renderControls();
  updateCode();
  play({ reset: true });
});
document.querySelector("#copy").addEventListener("click", async (event) => {
  try {
    await navigator.clipboard.writeText(code.textContent);
    event.currentTarget.textContent = "Copied";
    status.textContent = "Usage copied to the clipboard.";
  } catch {
    status.textContent = "Copy failed. Select the code manually.";
  }
  window.setTimeout(() => { event.currentTarget.textContent = "Copy code"; }, 1200);
});

renderControls();
updateCode();
resetDemo();
window.setTimeout(() => play(), 180);
