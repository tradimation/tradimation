import { CompositeController, FrameController, createKeyframeController } from "../controller.js";
import { clamp, mix, outCubic, smoother } from "../math.js";
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
}

const keyframeEffect = (definition: KeyframeDefinitionOptions): EffectDefinition => ({
  manifest: {
    id: definition.id,
    name: definition.name,
    level: definition.group === "core" ? "technique" : "recipe",
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
      reducedMotion: shouldReduceMotion(context.options, context.window),
      ...(definition.easing ? { easing: definition.easing } : {}),
      ...(context.options.playbackRate !== undefined ? { playbackRate: context.options.playbackRate } : {}),
      ...(context.options.signal ? { signal: context.options.signal } : {}),
    });
  },
});

const directionAmount = (direction: EffectOptions["direction"], distance: number): [number, number] => {
  if (direction === "left") return [-distance, 0];
  if (direction === "up") return [0, -distance];
  if (direction === "down") return [0, distance];
  return [distance, 0];
};

const createConcentrationLines = (context: EffectContext): EffectController => {
  const root = context.options.overlayRoot ?? context.document.body;
  const overlay = context.document.createElement("div");
  const lines = Array.from({ length: 12 }, (_, index) => {
    const line = context.document.createElement("i");
    line.style.cssText = "position:absolute;left:50%;top:50%;width:76px;height:3px;background:currentColor;transform-origin:0 50%;";
    line.dataset.angle = String(index * 30);
    overlay.append(line);
    return line;
  });
  const originalPosition = overlay.style.cssText;

  return new FrameController(
    {
      prepare() {
        const rect = context.target.getBoundingClientRect();
        overlay.style.cssText = `${originalPosition}position:fixed;pointer-events:none;z-index:2147483646;color:${getComputedStyle(context.target).color};left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
        root.append(overlay);
      },
      render(progress) {
        const exposed = Math.round(progress * 8) / 8;
        const arrival = smoother(clamp(exposed / 0.42));
        const collapse = smoother(clamp((exposed - 0.68) / 0.32));
        const scale = mix(0.08, 1.18, arrival) * mix(1, 0.03, collapse);
        lines.forEach((line) => {
          const angle = Number(line.dataset.angle);
          line.style.opacity = String(clamp(arrival * (1 - collapse)));
          line.style.transform = `rotate(${angle}deg) translateX(${mix(46, 28, arrival)}px) scaleX(${scale})`;
        });
      },
      complete() {
        if ((context.options.cleanup ?? "restore") !== "commit") overlay.remove();
      },
      cancel() {
        overlay.remove();
      },
      destroy() {
        overlay.remove();
      },
    },
    {
      duration: Number(context.options.duration ?? 620),
      ...(context.options.playbackRate !== undefined ? { playbackRate: context.options.playbackRate } : {}),
      ...(context.options.signal ? { signal: context.options.signal } : {}),
    },
  );
};

const createSwap = (context: EffectContext, compress = false): EffectController => {
  const secondary = context.options.secondary;
  if (!(secondary instanceof HTMLElement)) {
    throw new Error(`${compress ? "CompressSwap" : "LabelFlipTake"} requires options.secondary`);
  }
  const source = context.target;
  const sourceStyle = source.style.cssText;
  const destinationStyle = secondary.style.cssText;
  const duration = Number(context.options.duration ?? (compress ? 620 : 540));
  return new FrameController(
    {
      prepare() {
        secondary.style.visibility = "hidden";
      },
      render(progress) {
        const switchAt = compress ? 0.43 : 0.48;
        if (progress < switchAt) {
          source.style.visibility = "visible";
          secondary.style.visibility = "hidden";
          const local = smoother(progress / switchAt);
          source.style.transform = compress
            ? `scale(${mix(1, 1.12, local)}, ${mix(1, 0.06, local)})`
            : `scale(${mix(1, 1.18, local)}, ${mix(1, 0.05, local)})`;
        } else {
          source.style.visibility = "hidden";
          secondary.style.visibility = "visible";
          const local = smoother((progress - switchAt) / (1 - switchAt));
          const scaleX = local < 0.72 ? mix(0.06, 1.09, outCubic(local / 0.72)) : mix(1.09, 1, smoother((local - 0.72) / 0.28));
          const scaleY = local < 0.72 ? mix(1.2, 0.95, outCubic(local / 0.72)) : mix(0.95, 1, smoother((local - 0.72) / 0.28));
          secondary.style.transform = `scale(${scaleX}, ${scaleY})`;
        }
      },
      complete() {
        secondary.style.transform = "scale(1)";
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
    id: "anticipation-take",
    name: "Anticipation → Take",
    group: "core",
    lifecycle: "interaction",
    description: "Opposing preparation flows directly into a directional take.",
    techniques: ["anticipation", "take", "overlap"],
    duration: 620,
    keyframes: (context) => {
      const [distanceX, distanceY] = directionAmount(context.options.direction, 28 * Number(context.options.intensity ?? 1));
      return [
        { transform: "translate(0, 0) scale(1)" },
        { offset: 0.16, transform: `translate(${-distanceX * 0.35}px, ${-distanceY * 0.35}px) scale(1.05, .95)` },
        { offset: 0.48, transform: `translate(${distanceX * 1.22}px, ${distanceY * 1.22}px) scale(.92, 1.07)` },
        { offset: 0.74, transform: `translate(${distanceX * 0.94}px, ${distanceY * 0.94}px) scale(1.03, .98)` },
        { transform: `translate(${distanceX}px, ${distanceY}px) scale(1)` },
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
    duration: 650,
    keyframes: [
      { transform: "scale(1)" },
      { offset: 0.2, transform: "scale(1.24, .76)" },
      { offset: 0.48, transform: "scale(.84, 1.18)" },
      { offset: 0.72, transform: "scale(1.04, .98)" },
      { transform: "scale(1)" },
    ],
  }),
  {
    manifest: {
      id: "concentration-lines",
      name: "Concentration Lines",
      level: "technique",
      group: "core",
      lifecycle: "interaction",
      techniques: ["drawing exposure", "impact"],
      renderers: ["dom"],
      description: "Authored seed, impact, correction, and collapse drawings surround a target.",
      requires: { overlay: true },
      motionRisk: "medium",
    },
    create: createConcentrationLines,
  },
  keyframeEffect({
    id: "line-boil",
    name: "Line Boil",
    group: "core",
    lifecycle: "ambient",
    description: "Restrained contour drawings cycle without drifting the target.",
    techniques: ["line boil", "held exposure"],
    duration: 760,
    easing: "steps(4, end)",
    keyframes: [
      { outlineOffset: "4px", borderRadius: "12px", transform: "translate(0, 0)" },
      { offset: 0.25, outlineOffset: "2px", borderRadius: "15px", transform: "translate(1px, -1px)" },
      { offset: 0.5, outlineOffset: "5px", borderRadius: "10px", transform: "translate(-1px, 0)" },
      { offset: 0.75, outlineOffset: "3px", borderRadius: "14px", transform: "translate(0, 1px)" },
      { outlineOffset: "4px", borderRadius: "12px", transform: "translate(0, 0)" },
    ],
  }),
  keyframeEffect({
    id: "iris",
    name: "Iris",
    group: "core",
    lifecycle: "transition",
    description: "A circular aperture overshoots and corrects once.",
    techniques: ["mask", "overshoot"],
    renderer: "mask",
    duration: 700,
    keyframes: [
      { clipPath: "circle(0% at 50% 50%)" },
      { offset: 0.58, clipPath: "circle(78% at 50% 50%)" },
      { offset: 0.76, clipPath: "circle(68% at 50% 50%)" },
      { clipPath: "circle(72% at 50% 50%)" },
    ],
  }),
  keyframeEffect({
    id: "underline-snap",
    name: "UnderlineSnap",
    group: "interaction",
    lifecycle: "state",
    description: "One endpoint passes through overlong and correction drawings.",
    techniques: ["take", "correction"],
    duration: 540,
    keyframes: [
      { transformOrigin: "left center", transform: "scaleX(.04)" },
      { offset: 0.52, transform: "scaleX(1.18)" },
      { offset: 0.75, transform: "scaleX(.93)" },
      { transform: "scaleX(1)" },
    ],
  }),
  keyframeEffect({
    id: "pop-out",
    name: "PopOut",
    group: "interaction",
    lifecycle: "entrance",
    description: "A point expands through unequal wide and tall drawings.",
    techniques: ["squash", "stretch", "entrance"],
    duration: 610,
    keyframes: [
      { transform: "scale(.05)" },
      { offset: 0.32, transform: "scale(1.22, .42)" },
      { offset: 0.58, transform: "scale(.88, 1.14)" },
      { offset: 0.78, transform: "scale(1.04, .98)" },
      { transform: "scale(1)" },
    ],
  }),
  keyframeEffect({
    id: "cartoon-check",
    name: "CartoonCheck",
    group: "interaction",
    lifecycle: "state",
    description: "A check resolves through discrete mark drawings.",
    techniques: ["replacement drawing", "SVG"],
    renderer: "svg",
    duration: 580,
    easing: "steps(6, end)",
    keyframes: [
      { strokeDashoffset: 120, transform: "scale(.8)" },
      { offset: 0.54, strokeDashoffset: 0, transform: "scale(1.12)" },
      { offset: 0.74, strokeDashoffset: 8, transform: "scale(.96)" },
      { strokeDashoffset: 0, transform: "scale(1)" },
    ],
  }),
  keyframeEffect({
    id: "badge-punch",
    name: "BadgePunch",
    group: "interaction",
    lifecycle: "state",
    description: "A value change lands through wide and tall impact drawings.",
    techniques: ["impact", "squash", "correction"],
    duration: 600,
    keyframes: [
      { transform: "scale(1)" },
      { offset: 0.28, transform: "scale(1.28, .72)" },
      { offset: 0.52, transform: "scale(.9, 1.22)" },
      { offset: 0.74, transform: "scale(1.06)" },
      { transform: "scale(1)" },
    ],
  }),
  keyframeEffect({
    id: "toggle-snap",
    name: "ToggleSnap",
    group: "interaction",
    lifecycle: "state",
    description: "The knob backsteps, stretches through travel, and compresses on landing.",
    techniques: ["anticipation", "take", "landing"],
    duration: 560,
    keyframes: (context) => {
      const distance = Number(context.options.distance ?? 68);
      return [
        { transform: "translateX(0) scale(1)" },
        { offset: 0.16, transform: "translateX(-5px) scale(.88, 1.08)" },
        { offset: 0.56, transform: `translateX(${distance}px) scale(1.2, .84)` },
        { offset: 0.78, transform: `translateX(${distance - 3}px) scale(.92, 1.08)` },
        { transform: `translateX(${distance}px) scale(1)` },
      ];
    },
  }),
  keyframeEffect({
    id: "radio-pop",
    name: "RadioPop",
    group: "interaction",
    lifecycle: "state",
    description: "The indicator passes through horizontal squash and vertical stretch.",
    techniques: ["squash", "stretch"],
    duration: 560,
    keyframes: [
      { transform: "scale(.08)" },
      { offset: 0.32, transform: "scale(1.25, .35)" },
      { offset: 0.58, transform: "scale(.72, 1.22)" },
      { offset: 0.78, transform: "scale(1.08)" },
      { transform: "scale(1)" },
    ],
  }),
  keyframeEffect({
    id: "slam-down",
    name: "SlamDown",
    group: "entrance",
    lifecycle: "entrance",
    description: "Contact precedes maximum squash so falling and compression overlap.",
    techniques: ["spacing", "contact", "squash"],
    duration: 760,
    keyframes: [
      { transformOrigin: "center bottom", transform: "translateY(-170px) scale(1)" },
      { offset: 0.18, transform: "translateY(-155px) scale(.98, 1.03)" },
      { offset: 0.54, transform: "translateY(0) scale(.92, 1.12)" },
      { offset: 0.6, transform: "translateY(6px) scale(1.04, .94)" },
      { offset: 0.72, transform: "translateY(6px) scale(1.34, .62)" },
      { transform: "translateY(6px) scale(1)" },
    ],
  }),
  keyframeEffect({
    id: "tab-underline-take",
    name: "TabUnderlineTake",
    group: "navigation",
    lifecycle: "state",
    description: "A shared underline backsteps and stretches across tab geometry.",
    techniques: ["shared layer", "anticipation", "take"],
    duration: 610,
    keyframes: (context) => {
      const distance = Number(context.options.distance ?? 92);
      return [
        { transformOrigin: "left center", transform: "translateX(0) scaleX(1)" },
        { offset: 0.14, transform: "translateX(-8px) scaleX(.78)" },
        { offset: 0.58, transform: `translateX(${distance * 0.83}px) scaleX(1.7)` },
        { offset: 0.8, transform: `translateX(${distance + 2}px) scaleX(.92)` },
        { transform: `translateX(${distance}px) scaleX(1)` },
      ];
    },
  }),
  keyframeEffect({
    id: "hover-take",
    name: "HoverTake",
    group: "navigation",
    lifecycle: "interaction",
    description: "Press, take, and elevated hold form one interruptible response.",
    techniques: ["anticipation", "take", "hold"],
    duration: 520,
    keyframes: [
      { transform: "translateY(0) scale(1)" },
      { offset: 0.18, transform: "translateY(3px) scale(1.04, .96)" },
      { offset: 0.48, transform: "translateY(-12px) scale(.96, 1.04)" },
      { offset: 0.7, transform: "translateY(-8px) scale(1.02, .99)" },
      { transform: "translateY(-9px) scale(1)" },
    ],
  }),
  {
    manifest: {
      id: "label-flip-take",
      name: "LabelFlipTake",
      level: "recipe",
      group: "navigation",
      lifecycle: "state",
      techniques: ["compression", "drawing switch"],
      renderers: ["dom"],
      description: "The destination drawing appears exactly at source compression.",
      motionRisk: "low",
    },
    create: (context) => createSwap(context),
  },
  keyframeEffect({
    id: "text-punch",
    name: "TextPunch",
    group: "navigation",
    lifecycle: "interaction",
    description: "A glyph block keeps its content through opposing wide and tall extremes.",
    techniques: ["typography", "impact"],
    duration: 570,
    keyframes: [
      { transform: "scale(1)" },
      { offset: 0.22, transform: "scale(1.24, .76)" },
      { offset: 0.48, transform: "scale(.88, 1.17)" },
      { offset: 0.72, transform: "scale(1.05, .98)" },
      { transform: "scale(1)" },
    ],
  }),
  keyframeEffect({
    id: "icon-kick",
    name: "IconKick",
    group: "navigation",
    lifecycle: "interaction",
    description: "A directional icon uses one opposing preparation and one correction.",
    techniques: ["anticipation", "direction", "secondary action"],
    duration: 560,
    keyframes: [
      { transform: "translateX(0) rotate(0)" },
      { offset: 0.18, transform: "translateX(-12px) rotate(-9deg) scaleX(.92)" },
      { offset: 0.5, transform: "translateX(32px) rotate(7deg) scaleX(1.15)" },
      { offset: 0.76, transform: "translateX(22px) rotate(-2deg) scaleX(.98)" },
      { transform: "translateX(24px) rotate(0) scale(1)" },
    ],
  }),
  {
    manifest: {
      id: "speech-bubble-pop",
      name: "SpeechBubblePop",
      level: "recipe",
      group: "state",
      lifecycle: "entrance",
      techniques: ["pop", "secondary action"],
      renderers: ["dom"],
      description: "The bubble body establishes before its tail follows.",
      motionRisk: "low",
    },
    create(context) {
      const body = createKeyframeController(
        context.target,
        [
          { transform: "scale(.05)" },
          { offset: 0.32, transform: "scale(1.18, .72)" },
          { offset: 0.58, transform: "scale(.94, 1.1)" },
          { transform: "scale(1)" },
        ],
        { duration: Number(context.options.duration ?? 610), reducedMotion: shouldReduceMotion(context.options, context.window) },
      );
      const tail = context.target.querySelector<HTMLElement>("[data-cel-tail]");
      if (!tail) return body;
      return new CompositeController([
        body,
        createKeyframeController(
          tail,
          [
            { transform: "scale(0)" },
            { offset: 0.46, transform: "scale(0)" },
            { offset: 0.72, transform: "scale(1.24)" },
            { transform: "scale(1)" },
          ],
          { duration: Number(context.options.duration ?? 610), reducedMotion: shouldReduceMotion(context.options, context.window) },
        ),
      ]);
    },
  },
  keyframeEffect({
    id: "toast-take",
    name: "ToastTake",
    group: "state",
    lifecycle: "entrance",
    description: "An offscreen speed drawing overlaps one firm landing compression.",
    techniques: ["smear", "entrance", "landing"],
    duration: 700,
    motionRisk: "medium",
    keyframes: [
      { transform: "translateX(-330px) scale(1.65, .68)" },
      { offset: 0.4, transform: "translateX(24px) scale(1.1, .9)" },
      { offset: 0.58, transform: "translateX(0) scale(1.18, .78)" },
      { offset: 0.78, transform: "translateX(0) scale(.98, 1.03)" },
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
    create: (context) => createSwap(context, true),
  },
];
