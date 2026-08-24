import { createEffect } from "../dist/index.js";

const stage = document.querySelector("#home-preview-stage");
const target = document.querySelector("#home-preview-target");
const status = document.querySelector("#home-preview-status");
const buttons = [...document.querySelectorAll("[data-home-effect]")];
let controller = null;
let runVersion = 0;

const play = async (button) => {
  const version = ++runVersion;
  controller?.destroy();
  controller = null;
  target.style.cssText = "";
  buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  status.textContent = `Playing ${button.textContent}…`;
  try {
    const options = { cleanup: "restore" };
    if (button.dataset.homeEffect === "smear") options.overlayRoot = stage;
    controller = createEffect(target, button.dataset.homeEffect, options);
    await controller.play();
    if (version === runVersion) status.textContent = `${button.textContent} preview complete.`;
  } catch (error) {
    if (version === runVersion) status.textContent = "Preview failed. Choose another effect or try again.";
    console.error(error);
  }
};

buttons.forEach((button) => button.addEventListener("click", () => play(button)));
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) window.setTimeout(() => play(buttons[0]), 400);
