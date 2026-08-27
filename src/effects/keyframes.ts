import { createKeyframeController } from "../controller.js";
import { shouldReduceMotion } from "../context.js";
import type { EffectContext, EffectDefinition, EffectId, EffectManifest } from "../types.js";

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
  level?: EffectManifest["level"];
}

export const keyframeEffect = (definition: KeyframeDefinitionOptions): EffectDefinition => ({
  manifest: {
    id: definition.id,
    name: definition.name,
    level: definition.level ?? (definition.group === "core" ? "effect" : "recipe"),
    group: definition.group,
    lifecycle: definition.lifecycle,
    techniques: definition.techniques,
    renderers: [definition.renderer ?? "dom"],
    description: definition.description,
    motionRisk: definition.motionRisk ?? "low",
  },
  create(context) {
    const keyframes =
      typeof definition.keyframes === "function"
        ? definition.keyframes(context)
        : definition.keyframes;
    return createKeyframeController(context.target, keyframes, {
      duration: Number(context.options.duration ?? definition.duration),
      cleanup: context.options.cleanup ?? definition.cleanup ?? "commit",
      preserveTransform: context.options.preserveTransform ?? definition.preserveTransform ?? true,
      reducedMotion: shouldReduceMotion(context.options, context.window),
      ...(definition.easing ? { easing: definition.easing } : {}),
      ...(context.options.playbackRate !== undefined
        ? { playbackRate: context.options.playbackRate }
        : {}),
      ...(context.options.signal ? { signal: context.options.signal } : {}),
    });
  },
});
