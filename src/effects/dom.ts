import { FrameController } from "../controller.js";
import { boxEdgeDistance, drawingTrack } from "../math.js";
import type { EffectContext, EffectController, EffectDefinition, EffectOptions } from "../types.js";
import { keyframeEffect } from "./keyframes.js";

const directionalPoint = (
  direction: EffectOptions["direction"],
  x: number,
  y: number,
  intensity: number,
): [number, number] => {
  if (direction === "left") return [-x * intensity, y * intensity];
  if (direction === "up") return [y * intensity, -x * intensity];
  if (direction === "down") return [-y * intensity, x * intensity];
  return [x * intensity, y * intensity];
};

const scaled = (value: number, intensity: number): number => 1 + (value - 1) * intensity;

const createConcentrationLines = (context: EffectContext): EffectController => {
  const root = context.options.overlayRoot ?? context.document.body;
  const viewportMode = root === context.document.body || root === context.document.documentElement;
  const originalRootPosition = root.style.position;
  const originalTargetStyle = context.target.style.cssText;
  const intensity = Number(context.options.intensity ?? 1);
  const distance = Number(context.options.distance ?? 18);
  const overlay = context.document.createElement("div");
  const lines = Array.from({ length: 12 }, (_, index) => {
    const line = context.document.createElement("i");
    line.style.cssText =
      "position:absolute;left:50%;top:50%;width:76px;height:3px;background:currentColor;transform-origin:0 50%;";
    line.dataset.angle = String(index * 30);
    overlay.append(line);
    return line;
  });
  const positionOverlay = () => {
    const rect = context.target.getBoundingClientRect();
    const rootRect = viewportMode ? new DOMRect(0, 0) : root.getBoundingClientRect();
    overlay.style.left = `${rect.left - rootRect.left}px`;
    overlay.style.top = `${rect.top - rootRect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  };
  const restoreRoot = () => {
    if (!viewportMode) root.style.position = originalRootPosition;
  };

  return new FrameController(
    {
      prepare() {
        if (!viewportMode && context.window.getComputedStyle(root).position === "static")
          root.style.position = "relative";
        overlay.style.cssText = `position:${viewportMode ? "fixed" : "absolute"};pointer-events:none;z-index:2147483646;color:${context.window.getComputedStyle(context.target).color};`;
        positionOverlay();
        root.append(overlay);
      },
      render(progress) {
        positionOverlay();
        const opacity = drawingTrack(progress, [
          [0, 0],
          [0.08, 1],
          [0.82, 1],
          [0.83, 0],
          [1, 0],
        ]);
        const scale = drawingTrack(progress, [
          [0, 0.04],
          [0.08, 0.22],
          [0.18, 1.18],
          [0.27, 0.94],
          [0.34, 1],
          [0.67, 1],
          [0.73, 0.68],
          [0.82, 0.2],
          [0.83, 0.04],
          [1, 0.04],
        ]);
        const targetScaleX = drawingTrack(progress, [
          [0, 1],
          [0.16, 1.13],
          [0.27, 0.96],
          [0.38, 1],
          [0.72, 1],
          [0.82, 1.025],
          [1, 1],
        ]);
        const targetScaleY = drawingTrack(progress, [
          [0, 1],
          [0.16, 0.89],
          [0.27, 1.055],
          [0.38, 1],
          [0.72, 1],
          [0.82, 0.985],
          [1, 1],
        ]);
        context.target.style.transform = `scale(${scaled(targetScaleX, intensity)}, ${scaled(targetScaleY, intensity)})`;
        const targetRect = context.target.getBoundingClientRect();
        lines.forEach((line) => {
          const angle = Number(line.dataset.angle);
          const edgeDistance = boxEdgeDistance(targetRect.width, targetRect.height, angle);
          line.style.opacity = String(opacity);
          line.style.transform = `rotate(${angle}deg) translateX(${edgeDistance + distance * intensity}px) scaleX(${scale * intensity})`;
        });
      },
      complete() {
        overlay.remove();
        if ((context.options.cleanup ?? "restore") !== "commit") {
          context.target.style.cssText = originalTargetStyle;
        }
        restoreRoot();
      },
      cancel() {
        overlay.remove();
        context.target.style.cssText = originalTargetStyle;
        restoreRoot();
      },
      destroy() {
        overlay.remove();
        context.target.style.cssText = originalTargetStyle;
        restoreRoot();
      },
    },
    {
      duration: Number(context.options.duration ?? 1050),
      ...(context.options.playbackRate !== undefined
        ? { playbackRate: context.options.playbackRate }
        : {}),
      ...(context.options.signal ? { signal: context.options.signal } : {}),
    },
  );
};

const createCompressSwap = (context: EffectContext): EffectController => {
  const secondary = context.options.secondary;
  if (!(secondary instanceof HTMLElement)) {
    throw new Error("CompressSwap requires options.secondary");
  }
  const source = context.target;
  const sourceStyle = source.style.cssText;
  const destinationStyle = secondary.style.cssText;
  const duration = Number(context.options.duration ?? 780);
  const sourceBase = getComputedStyle(source).transform;
  const destinationBase = getComputedStyle(secondary).transform;
  const sourcePrefix = sourceBase === "none" ? "" : `${sourceBase} `;
  const destinationPrefix = destinationBase === "none" ? "" : `${destinationBase} `;
  return new FrameController(
    {
      prepare() {
        secondary.style.visibility = "hidden";
      },
      render(progress) {
        const switchAt = 0.43;
        if (progress < switchAt) {
          source.style.visibility = progress <= 0.4 ? "visible" : "hidden";
          secondary.style.visibility = progress <= 0.4 ? "hidden" : "visible";
          const sourceX = drawingTrack(progress, [
            [0, 1],
            [0.24, 1],
            [0.42, 1.14],
          ]);
          const sourceY = drawingTrack(progress, [
            [0, 1],
            [0.24, 1],
            [0.42, 0.06],
          ]);
          source.style.transform = `${sourcePrefix}scale(${sourceX}, ${sourceY})`;
          return;
        }
        source.style.visibility = "hidden";
        secondary.style.visibility = "visible";
        const scaleX = drawingTrack(progress, [
          [0.43, 0.08],
          [0.64, 1.12],
          [0.82, 0.96],
          [1, 1],
        ]);
        const scaleY = drawingTrack(progress, [
          [0.43, 1.3],
          [0.64, 0.92],
          [0.82, 1.05],
          [1, 1],
        ]);
        secondary.style.transform = `${destinationPrefix}scale(${scaleX}, ${scaleY})`;
      },
      complete() {
        source.style.visibility = "hidden";
        source.style.transform = `${sourcePrefix}scale(1)`;
        secondary.style.visibility = "visible";
        secondary.style.transform = `${destinationPrefix}scale(1)`;
      },
      cancel() {
        source.style.cssText = sourceStyle;
        secondary.style.cssText = destinationStyle;
      },
      destroy() {
        source.style.cssText = sourceStyle;
        secondary.style.cssText = destinationStyle;
      },
    },
    {
      duration,
      ...(context.options.playbackRate !== undefined
        ? { playbackRate: context.options.playbackRate }
        : {}),
      ...(context.options.signal ? { signal: context.options.signal } : {}),
    },
  );
};

export const domEffects: EffectDefinition[] = [
  keyframeEffect({
    id: "wind-up-shift",
    name: "Wind-Up Shift",
    group: "core",
    lifecycle: "interaction",
    description: "Opposing preparation flows directly into a directional take.",
    techniques: ["anticipation", "take", "overlap"],
    duration: 980,
    easing: "linear",
    keyframes: (context) => {
      const intensity = Number(context.options.intensity ?? 1);
      const position = (x: number, y: number) =>
        directionalPoint(context.options.direction, x, y, intensity);
      const pose = (x: number, y: number, shape: string) => {
        const [positionX, positionY] = position(x, y);
        return `translate(${positionX}px, ${positionY}px) ${shape}`;
      };
      return [
        { transform: "translate(0, 0) scale(1) rotate(0deg)" },
        { offset: 0.1, transform: pose(-3, 1, "scale(1.015, .985) rotate(-.3deg)") },
        { offset: 0.18, transform: pose(-10, 3, "scale(1.045, .96) rotate(-.8deg)") },
        { offset: 0.26, transform: pose(-14, 5, "scale(1.07, .94) rotate(-1.3deg)") },
        { offset: 0.32, transform: pose(-12, 4, "scale(1.05, .95) rotate(-1deg)") },
        { offset: 0.37, transform: "translate(0, 0) scale(1.01, .99) rotate(0deg)" },
        { offset: 0.48, transform: pose(38, -11, "scale(.92, 1.08) rotate(-2deg)") },
        { offset: 0.6, transform: pose(86, -26, "scale(.88, 1.12) rotate(-2.8deg)") },
        { offset: 0.68, transform: pose(120, -37, "scale(.95, 1.05) rotate(-1.2deg)") },
        { offset: 0.76, transform: pose(108, -32, "scale(1.025, .98) rotate(.4deg)") },
        { offset: 0.88, transform: pose(114, -35, "scale(.995, 1.005) rotate(0deg)") },
        { transform: pose(112, -34, "scale(1) rotate(0deg)") },
      ];
    },
  }),
  keyframeEffect({
    id: "squash-stretch",
    name: "Squash & Stretch",
    group: "core",
    lifecycle: "interaction",
    description: "Wide contact and tall release preserve one readable mass.",
    techniques: ["squash", "stretch", "volume"],
    duration: 760,
    easing: "cubic-bezier(.18,.8,.2,1)",
    keyframes: (context) => {
      const intensity = Number(context.options.intensity ?? 1);
      const pose = (x: number, y: number) =>
        `scale(${scaled(x, intensity)}, ${scaled(y, intensity)})`;
      return [
        { transform: "scale(1)" },
        { offset: 0.22, transform: pose(1.34, 0.66) },
        { offset: 0.48, transform: pose(0.76, 1.35) },
        { offset: 0.69, transform: pose(1.1, 0.92) },
        { offset: 0.84, transform: pose(0.97, 1.04) },
        { transform: "scale(1)" },
      ];
    },
  }),
  {
    manifest: {
      id: "concentration-lines",
      name: "Concentration Lines",
      level: "effect",
      group: "core",
      lifecycle: "interaction",
      techniques: ["drawing exposure", "impact"],
      renderers: ["dom"],
      description:
        "Authored seed, impact, correction, and collapse drawings follow the measured target bounds.",
      requires: { overlay: true },
      motionRisk: "medium",
    },
    create: createConcentrationLines,
  },
  keyframeEffect({
    id: "iris",
    name: "Iris",
    group: "core",
    lifecycle: "transition",
    description: "A circular aperture overshoots and corrects once.",
    techniques: ["mask", "overshoot"],
    renderer: "mask",
    duration: 1300,
    easing: "ease-in-out",
    keyframes: [
      { clipPath: "circle(0% at 50% 50%)" },
      { offset: 0.42, clipPath: "circle(80% at 50% 50%)" },
      { offset: 0.58, clipPath: "circle(80% at 50% 50%)" },
      { clipPath: "circle(0% at 50% 50%)" },
    ],
  }),
  {
    manifest: {
      id: "compress-swap",
      name: "CompressSwap",
      level: "recipe",
      group: "state",
      lifecycle: "state",
      techniques: ["compression", "drawing switch"],
      renderers: ["dom"],
      description:
        "The source disappears at maximum compression and the destination enters stretched.",
      motionRisk: "low",
    },
    create: createCompressSwap,
  },
];
