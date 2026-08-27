import type { EffectDefinition } from "../types.js";
import { keyframeEffect } from "../effects/keyframes.js";

export const componentEffects: EffectDefinition[] = [
  keyframeEffect({
    id: "toggle-snap",
    level: "component",
    name: "ToggleSnap",
    group: "interaction",
    lifecycle: "state",
    description: "The knob backsteps, stretches through travel, and compresses on landing.",
    techniques: ["anticipation", "take", "landing"],
    duration: 620,
    easing: "cubic-bezier(.2,.8,.2,1)",
    preserveTransform: false,
    keyframes: (context) => {
      const left = context.options.direction === "left";
      const parentRect = context.target.parentElement?.getBoundingClientRect();
      const targetRect = context.target.getBoundingClientRect();
      const edgeInset = parentRect
        ? left
          ? parentRect.right - targetRect.right
          : targetRect.left - parentRect.left
        : 0;
      const measuredDistance = parentRect
        ? parentRect.width - targetRect.width - edgeInset * 2
        : 68;
      const distance = Number(context.options.distance ?? Math.max(0, measuredDistance));
      return [
        { transform: `translateX(${left ? distance : 0}px) scale(1)` },
        { offset: 0.14, transform: `translateX(${left ? distance + 4 : -4}px) scale(1.08, 1)` },
        { offset: 0.5, transform: `translateX(${left ? 2 : distance - 2}px) scale(1.34, .8)` },
        { offset: 0.7, transform: `translateX(${left ? -3 : distance + 3}px) scale(.88, 1.16)` },
        { transform: `translateX(${left ? 0 : distance}px) scale(1)` },
      ];
    },
  }),
  keyframeEffect({
    id: "tab-indicator-sweep",
    level: "component",
    name: "TabUnderlineTake",
    group: "navigation",
    lifecycle: "state",
    description: "A shared underline backsteps and stretches across tab geometry.",
    techniques: ["shared layer", "anticipation", "take"],
    duration: 650,
    easing: "cubic-bezier(.18,.8,.2,1)",
    preserveTransform: false,
    keyframes: (context) => {
      const destination = context.options.destination;
      if (destination && "getBoundingClientRect" in destination && context.target.parentElement) {
        const parentRect = context.target.parentElement.getBoundingClientRect();
        const currentRect = context.target.getBoundingClientRect();
        const destinationRect = destination.getBoundingClientRect();
        const currentLeft = currentRect.left - parentRect.left;
        const destinationLeft = destinationRect.left - parentRect.left;
        const currentWidth = currentRect.width;
        const destinationWidth = destinationRect.width;
        const movingRight = destinationLeft > currentLeft;
        const bridgeLeft = movingRight
          ? currentLeft + currentWidth * 0.22
          : destinationLeft + destinationWidth * 0.18;
        const bridgeRight = movingRight
          ? destinationLeft + destinationWidth * 0.82
          : currentLeft + currentWidth * 0.78;
        return [
          { left: `${currentLeft}px`, width: `${currentWidth}px`, transform: "scaleX(1)" },
          {
            offset: 0.15,
            left: `${currentLeft + (movingRight ? -6 : 6)}px`,
            width: `${currentWidth * 0.92}px`,
            transform: "scaleX(1)",
          },
          {
            offset: 0.5,
            left: `${bridgeLeft}px`,
            width: `${Math.max(4, bridgeRight - bridgeLeft)}px`,
            transform: "scaleX(1)",
          },
          {
            offset: 0.76,
            left: `${destinationLeft + (movingRight ? 3 : -3)}px`,
            width: `${destinationWidth * 1.03}px`,
            transform: "scaleX(1)",
          },
          { left: `${destinationLeft}px`, width: `${destinationWidth}px`, transform: "scaleX(1)" },
        ];
      }
      const distance = Number(context.options.distance ?? 101);
      const left = context.options.direction === "left";
      return [
        {
          transformOrigin: "left center",
          transform: `translateX(${left ? distance : 0}px) scaleX(1)`,
        },
        { offset: 0.15, transform: `translateX(${left ? distance + 6 : -6}px) scaleX(.92)` },
        {
          offset: 0.5,
          transform: `translateX(${left ? 10 : distance * (36 / 101)}px) scaleX(1.576)`,
        },
        { offset: 0.76, transform: `translateX(${left ? 0 : distance}px) scaleX(1.033)` },
        { transform: `translateX(${left ? 0 : distance}px) scaleX(1)` },
      ];
    },
  }),
  keyframeEffect({
    id: "toast-snap-in",
    level: "component",
    name: "ToastTake",
    group: "state",
    lifecycle: "entrance",
    description: "A short speed drawing eases into one restrained landing compression.",
    techniques: ["smear", "entrance", "landing"],
    duration: 1080,
    easing: "cubic-bezier(.2,.75,.2,1)",
    motionRisk: "medium",
    keyframes: [
      { opacity: 0, transform: "translateX(96px) scale(1.22, .84)" },
      { offset: 0.2, opacity: 1, transform: "translateX(52px) scale(1.18, .88)" },
      { offset: 0.48, opacity: 1, transform: "translateX(-7px) scale(.97, 1.04)" },
      { offset: 0.66, opacity: 1, transform: "translateX(3px) scale(1.03, .98)" },
      { offset: 0.82, opacity: 1, transform: "translateX(-1px) scale(.995, 1.005)" },
      { transform: "translateX(0) scale(1)" },
    ],
  }),
];
