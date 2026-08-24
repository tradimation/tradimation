import { createEffect } from "../dist/index.js";
import { effectDocs, findEffectDoc } from "./effects.js";

const id = document.body.dataset.effect;
const effect = findEffectDoc(id);
if (!effect) throw new Error(`Unknown effect documentation: ${id}`);

const stage = document.querySelector("#stage");
const replay = document.querySelector("#replay");
const title = document.querySelector("#effect-name");
const summary = document.querySelector("#effect-summary");
const kind = document.querySelector("#effect-kind");
const group = document.querySelector("#effect-group");
const why = document.querySelector("#effect-why");
const code = document.querySelector("#effect-code");
const nav = document.querySelector("#effect-nav");
const next = document.querySelector("#next-effect");

document.title = `${effect.name} — Tradimation`;
title.textContent = effect.name;
summary.textContent = effect.summary;
kind.textContent = effect.kind;
group.textContent = effect.group;
why.textContent = effect.why;
code.textContent = effect.code;
stage.insertAdjacentHTML("beforeend", effect.markup);

effectDocs.forEach((item) => {
  const link = document.createElement("a");
  link.className = `detail-link${item.id === effect.id ? " active" : ""}`;
  link.href = `./${item.id}.html`;
  link.textContent = item.name;
  nav.append(link);
});

const index = effectDocs.indexOf(effect);
const nextEffect = effectDocs[(index + 1) % effectDocs.length];
next.href = `./${nextEffect.id}.html`;
next.querySelector("strong").textContent = nextEffect.name;

let controller = null;
let running = false;
let toggleChecked = false;
let selectedTab = 0;
let swapState = "a";

const settleTab = (tab) => {
  const tabs = stage.querySelector(".tabs");
  const line = stage.querySelector(".tab-line");
  const tabsRect = tabs.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  line.style.left = `${tabRect.left - tabsRect.left}px`;
  line.style.width = `${tabRect.width}px`;
  line.style.transform = "none";
};

const run = async (requestedTarget) => {
  if (running) return;
  running = true;
  replay.textContent = "Playing…";
  controller?.destroy();
  controller = null;

  try {
    let target = requestedTarget ?? stage.querySelector(effect.target);
    const options = {};
    if (effect.options?.overlay) options.overlayRoot = stage;
    if (effect.options?.destination) options.destination = stage.querySelector(effect.options.destination);
    if (effect.options?.source) options.source = stage.querySelector(effect.options.source);

    if (effect.interactive === "toggle") {
      const toggle = stage.querySelector(".toggle");
      const knob = stage.querySelector(".knob");
      toggleChecked = !toggleChecked;
      toggle.setAttribute("aria-checked", String(toggleChecked));
      target = knob;
      options.direction = toggleChecked ? "right" : "left";
      options.preserveTransform = false;
    }

    if (effect.interactive === "tabs") {
      const tabs = [...stage.querySelectorAll(".tab")];
      const nextTab = requestedTarget ?? tabs[(selectedTab + 1) % tabs.length];
      selectedTab = tabs.indexOf(nextTab);
      tabs.forEach((tab, tabIndex) => {
        tab.classList.toggle("active", tabIndex === selectedTab);
        tab.setAttribute("aria-selected", String(tabIndex === selectedTab));
      });
      target = stage.querySelector(".tab-line");
      options.destination = nextTab;
      options.preserveTransform = false;
    }

    if (effect.interactive === "swap") {
      const source = stage.querySelector(swapState === "a" ? ".swap-a" : ".swap-b");
      const destination = stage.querySelector(swapState === "a" ? ".swap-b" : ".swap-a");
      source.style.visibility = "visible";
      destination.style.visibility = "hidden";
      target = source;
      options.secondary = destination;
      swapState = swapState === "a" ? "b" : "a";
    }

    controller = createEffect(target, effect.id, options);
    await controller.play();
    if (effect.interactive === "tabs") settleTab(stage.querySelectorAll(".tab")[selectedTab]);
  } finally {
    replay.textContent = "Replay ↗";
    running = false;
  }
};

replay.addEventListener("click", () => run());
stage.querySelector(".toggle")?.addEventListener("click", () => run());
stage.querySelector(".swap")?.addEventListener("click", () => run());
stage.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => run(tab)));
document.querySelector("#copy").addEventListener("click", async (event) => {
  await navigator.clipboard.writeText(effect.code);
  event.currentTarget.textContent = "Copied";
  setTimeout(() => { event.currentTarget.textContent = "Copy"; }, 1000);
});

if (effect.interactive === "tabs") requestAnimationFrame(() => settleTab(stage.querySelector(".tab.active")));
setTimeout(() => run(), 180);
