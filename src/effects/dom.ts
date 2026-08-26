import { FrameController, createKeyframeController } from "../controller.js";
import { boxEdgeDistance, drawingTrack } from "../math.js";
import { shouldReduceMotion } from "../context.js";
import type { EffectContext, EffectController, EffectDefinition, EffectId, EffectManifest, EffectOptions } from "../types.js";

interface KeyframeDefinitionOptions {
  id: EffectId;
  name: string;
  group: EffectManifest["group"];
  lifecycle: EffectManifest["lifecycle"];
  description: string;
  techniques: string[];
  keyframes: Keyframe[] | ((context: EffectContext) => Keyframe[]);
  duration: number;
  easing?: string;
  cleanup?: "restore" | "commit" | "hide";
  renderer?: "dom" | "svg" | "mask";
  motionRisk?: EffectManifest["motionRisk"];
  preserveTransform?: boolean;
}

const keyframeEffect = (definition: KeyframeDefinitionOptions): EffectDefinition => ({
  manifest: {
    id: definition.id,
    name: definition.name,
    level: definition.group === "core" ? "effect" : "recipe",
    group: definition.group,
    lifecycle: definition.lifecycle,
    techniques: definition.techniques,
    renderers: [definition.renderer ?? "dom"],
    description: definition.description,
    motionRisk: definition.motionRisk ?? "low",
  },
  create(context) {
    const keyframes = typeof definition.keyframes === "function" ? definition.keyframes(context) : definition.keyframes;
    return createKeyframeController(context.target, keyframes, {
      duration: Number(context.options.duration ?? definition.duration),
      cleanup: context.options.cleanup ?? definition.cleanup ?? "commit",
      preserveTransform: context.options.preserveTransform ?? definition.preserveTransform ?? true,
      reducedMotion: shouldReduceMotion(context.options, context.window),
      ...(definition.easing ? { easing: definition.easing } : {}),
      ...(context.options.playbackRate !== undefined ? { playbackRate: context.options.playbackRate } : {}),
      ...(context.options.signal ? { signal: context.options.signal } : {}),
    });
  },
});

const directionalPoint = (direction: EffectOptions["direction"], x: number, y: number, intensity: number): [number, number] => {
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
    line.style.cssText = "position:absolute;left:50%;top:50%;width:76px;height:3px;background:currentColor;transform-origin:0 50%;";
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
        if (!viewportMode && context.window.getComputedStyle(root).position === "static") root.style.position = "relative";
        overlay.style.cssText = `position:${viewportMode ? "fixed" : "absolute"};pointer-events:none;z-index:2147483646;color:${context.window.getComputedStyle(context.target).color};`;
        positionOverlay();
        root.append(overlay);
      },
      render(progress) {
        positionOverlay();
        const opacity = drawingTrack(progress, [[0, 0], [0.08, 1], [0.82, 1], [0.83, 0], [1, 0]]);
        const scale = drawingTrack(progress, [[0, 0.04], [0.08, 0.22], [0.18, 1.18], [0.27, 0.94], [0.34, 1], [0.67, 1], [0.73, 0.68], [0.82, 0.2], [0.83, 0.04], [1, 0.04]]);
        const targetScaleX = drawingTrack(progress, [[0, 1], [0.16, 1.13], [0.27, 0.96], [0.38, 1], [0.72, 1], [0.82, 1.025], [1, 1]]);
        const targetScaleY = drawingTrack(progress, [[0, 1], [0.16, 0.89], [0.27, 1.055], [0.38, 1], [0.72, 1], [0.82, 0.985], [1, 1]]);
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
      ...(context.options.playbackRate !== undefined ? { playbackRate: context.options.playbackRate } : {}),
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
          const sourceX = drawingTrack(progress, [[0, 1], [0.24, 1], [0.42, 1.14]]);
          const sourceY = drawingTrack(progress, [[0, 1], [0.24, 1], [0.42, 0.06]]);
          source.style.transform = `${sourcePrefix}scale(${sourceX}, ${sourceY})`;
          return;
        }
        source.style.visibility = "hidden";
        secondary.style.visibility = "visible";
        const scaleX = drawingTrack(progress, [[0.43, 0.08], [0.64, 1.12], [0.82, 0.96], [1, 1]]);
        const scaleY = drawingTrack(progress, [[0.43, 1.3], [0.64, 0.92], [0.82, 1.05], [1, 1]]);
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
      ...(context.options.playbackRate !== undefined ? { playbackRate: context.options.playbackRate } : {}),
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
    duration: 900,
    easing: "linear",
    keyframes: (context) => {
      const intensity = Number(context.options.intensity ?? 1);
      const position = (x: number, y: number) => directionalPoint(context.options.direction, x, y, intensity);
      const pose = (x: number, y: number, shape: string) => {
        const [positionX, positionY] = position(x, y);
        return `translate(${positionX}px, ${positionY}px) ${shape}`;
      };
      return [
        { transform: "translate(0, 0) scale(1) rotate(0deg)" },
        { offset: 0.07, transform: pose(-2, 1, "scale(1.012, .988) rotate(-.2deg)") },
        { offset: 0.14, transform: pose(-6, 2.5, "scale(1.035, .965) rotate(-.7deg)") },
        { offset: 0.2, transform: pose(-9, 3.5, "scale(1.055, .947) rotate(-1deg)") },
        { offset: 0.24, transform: pose(-8, 3, "scale(1.045, .955) rotate(-.8deg)") },
        { offset: 0.3, transform: "translate(0, 0) scale(1.01, .99) rotate(0deg)" },
        { offset: 0.38, transform: pose(19, -7, "scale(.95, 1.06) rotate(-1.5deg)") },
        { offset: 0.48, transform: pose(45, -16, "scale(.91, 1.1) rotate(-2.3deg)") },
        { offset: 0.58, transform: pose(61, -21, "scale(.95, 1.055) rotate(-1.3deg)") },
        { offset: 0.66, transform: pose(64, -22, "scale(.985, 1.018) rotate(-.5deg)") },
        { offset: 0.76, transform: pose(56, -18, "scale(1.018, .985) rotate(.3deg)") },
        { offset: 0.88, transform: pose(51, -16, "scale(.995, 1.005) rotate(0deg)") },
        { transform: pose(52, -16, "scale(1) rotate(0deg)") },
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
      const pose = (x: number, y: number) => `scale(${scaled(x, intensity)}, ${scaled(y, intensity)})`;
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
      description: "Authored seed, impact, correction, and collapse drawings follow the measured target bounds.",
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
  keyframeEffect({
    id: "toggle-snap",
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
        ? left ? parentRect.right - targetRect.right : targetRect.left - parentRect.left
        : 0;
      const measuredDistance = parentRect ? parentRect.width - targetRect.width - edgeInset * 2 : 68;
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
          { offset: 0.15, left: `${currentLeft + (movingRight ? -6 : 6)}px`, width: `${currentWidth * 0.92}px`, transform: "scaleX(1)" },
          { offset: 0.5, left: `${bridgeLeft}px`, width: `${Math.max(4, bridgeRight - bridgeLeft)}px`, transform: "scaleX(1)" },
          { offset: 0.76, left: `${destinationLeft + (movingRight ? 3 : -3)}px`, width: `${destinationWidth * 1.03}px`, transform: "scaleX(1)" },
          { left: `${destinationLeft}px`, width: `${destinationWidth}px`, transform: "scaleX(1)" },
        ];
      }
      const distance = Number(context.options.distance ?? 101);
      const left = context.options.direction === "left";
      return [
        { transformOrigin: "left center", transform: `translateX(${left ? distance : 0}px) scaleX(1)` },
        { offset: 0.15, transform: `translateX(${left ? distance + 6 : -6}px) scaleX(.92)` },
        { offset: 0.5, transform: `translateX(${left ? 10 : distance * (36 / 101)}px) scaleX(1.576)` },
        { offset: 0.76, transform: `translateX(${left ? 0 : distance}px) scaleX(1.033)` },
        { transform: `translateX(${left ? 0 : distance}px) scaleX(1)` },
      ];
    },
  }),
  keyframeEffect({
    id: "toast-snap-in",
    name: "ToastTake",
    group: "state",
    lifecycle: "entrance",
    description: "An offscreen speed drawing overlaps one firm landing compression.",
    techniques: ["smear", "entrance", "landing"],
    duration: 950,
    easing: "cubic-bezier(.18,.82,.2,1)",
    motionRisk: "medium",
    keyframes: [
      { opacity: 0, transform: "translateX(190px) scale(1.6, .7)" },
      { offset: 0.22, opacity: 1, transform: "translateX(88px) scale(1.7, .62)" },
      { offset: 0.52, opacity: 1, transform: "translateX(-9px) scale(.94, 1.08)" },
      { offset: 0.68, opacity: 1, transform: "translateX(5px) scale(1.09, .93)" },
      { offset: 0.84, opacity: 1, transform: "translateX(-2px) scale(.98, 1.02)" },
      { transform: "translateX(0) scale(1)" },
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
      description: "The source disappears at maximum compression and the destination enters stretched.",
      motionRisk: "low",
    },
    create: createCompressSwap,
  },
];
