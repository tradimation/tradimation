import { FrameController } from "../controller.js";
import { resolvePoint, shouldReduceMotion } from "../context.js";
import { ConnectedTextureSurface } from "../renderers/connected-texture.js";
import { meshDefaults, meshMaps } from "./mesh-maps.js";
import type { MeshEffectName, MeshParameterMap } from "./mesh-maps.js";
import type { EffectContext, EffectController, EffectDefinition, EffectId, EffectManifest } from "../types.js";

interface MeshDefinition {
  id: EffectId;
  name: string;
  mesh: MeshEffectName;
  group: EffectManifest["group"];
  lifecycle: EffectManifest["lifecycle"];
  description: string;
  techniques: string[];
  cleanup: "restore" | "commit" | "hide";
  motionRisk: EffectManifest["motionRisk"];
}

const mergeParams = <Name extends MeshEffectName>(
  name: Name,
  context: EffectContext,
): MeshParameterMap[Name] => {
  const params = { ...meshDefaults[name] } as MeshParameterMap[Name];
  const record = params as unknown as Record<string, number>;
  Object.keys(record).forEach((key) => {
    const value = context.options[key];
    if (typeof value === "number" && Number.isFinite(value)) record[key] = value;
  });
  if (typeof context.options.duration === "number") record.duration = context.options.duration;
  return params;
};

const createMeshController = <Name extends MeshEffectName>(
  context: EffectContext,
  name: Name,
  defaultCleanup: MeshDefinition["cleanup"],
): EffectController => {
  const surface = new ConnectedTextureSurface(context.target, context.options.overlayRoot ?? context.document.body);
  const params = mergeParams(name, context);
  const target = context.target;
  const originalStyle = target.style.cssText;
  const rect = target.getBoundingClientRect();
  const space = surface.coordinateSpace;
  const spaceRect = space.getBoundingClientRect();
  const viewportSpace = space === context.document.documentElement;
  if (name === "suck") {
    const fallbackX = viewportSpace ? context.window.innerWidth - 24 : spaceRect.right - 24;
    const point = surface.toLocalPoint(resolvePoint(context.options.destination, new DOMPoint(fallbackX, rect.top + rect.height / 2)));
    const suckParams = params as MeshParameterMap["suck"];
    suckParams.targetX = point.x;
    suckParams.targetY = point.y;
  }
  if (name === "spit") {
    const fallbackX = viewportSpace ? 24 : spaceRect.left + 24;
    const point = surface.toLocalPoint(resolvePoint(context.options.source, new DOMPoint(fallbackX, rect.top + rect.height / 2)));
    const spitParams = params as MeshParameterMap["spit"];
    spitParams.sourceX = point.x;
    spitParams.sourceY = point.y;
  }

  const cleanup = context.options.cleanup ?? defaultCleanup;
  const duration = shouldReduceMotion(context.options, context.window) ? 220 : params.duration;
  return new FrameController(
    {
      async prepare() {
        target.style.visibility = "visible";
        await surface.capture();
        target.style.visibility = "hidden";
      },
      render(progress) {
        const mapper = meshMaps[name] as (
          progress: number,
          u: number,
          v: number,
          base: Parameters<typeof surface.draw>[0] extends (u: number, v: number, base: infer Base) => unknown ? Base : never,
          stage: HTMLElement,
          params: MeshParameterMap[Name],
        ) => { x: number; y: number };
        surface.draw((u, v, base) => mapper(progress, u, v, base, surface.coordinateSpace, params));
      },
      complete() {
        surface.clear();
        if (cleanup === "restore") {
          target.style.cssText = originalStyle;
          return;
        }
        if (cleanup === "hide") {
          target.style.visibility = "hidden";
          return;
        }
        target.style.visibility = "visible";
        if (name === "smear") target.style.transform = `translateX(${(params as MeshParameterMap["smear"]).distance}px)`;
      },
      cancel() {
        surface.clear();
        target.style.cssText = originalStyle;
      },
      destroy() {
        target.style.cssText = originalStyle;
        surface.destroy();
      },
    },
    {
      duration,
      ...(context.options.playbackRate !== undefined ? { playbackRate: context.options.playbackRate } : {}),
      ...(context.options.signal ? { signal: context.options.signal } : {}),
    },
  );
};

const definitions: MeshDefinition[] = [
  {
    id: "smear",
    name: "Smear",
    mesh: "smear",
    group: "core",
    lifecycle: "transition",
    description: "The original texture becomes a velocity drawing and brakes rear-first.",
    techniques: ["smear", "connected texture", "brake"],
    cleanup: "commit",
    motionRisk: "high",
  },
  {
    id: "launch-away",
    name: "LaunchAway",
    mesh: "launch",
    group: "entrance",
    lifecycle: "exit",
    description: "Viewport-normalized travel and stretch form one continuous exit.",
    techniques: ["smear", "exit", "spacing"],
    cleanup: "hide",
    motionRisk: "high",
  },
  {
    id: "stretch-wipe",
    name: "StretchWipe",
    mesh: "wipe",
    group: "entrance",
    lifecycle: "entrance",
    description: "An offscreen speed drawing restores while its boundaries decelerate.",
    techniques: ["stretch", "wipe", "overlapping action"],
    cleanup: "commit",
    motionRisk: "medium",
  },
  {
    id: "stamp-in",
    name: "StampIn",
    mesh: "stamp",
    group: "entrance",
    lifecycle: "entrance",
    description: "A visible hang drops into a planted squash and monotonic recovery.",
    techniques: ["spacing", "contact", "squash"],
    cleanup: "commit",
    motionRisk: "medium",
  },
  {
    id: "suck-in",
    name: "SuckIn",
    mesh: "suck",
    group: "spatial",
    lifecycle: "exit",
    description: "A clamped wedge ingests front-to-back into a destination point.",
    techniques: ["funnel", "column delay", "spatial transition"],
    cleanup: "hide",
    motionRisk: "high",
  },
  {
    id: "spit-out",
    name: "SpitOut",
    mesh: "spit",
    group: "spatial",
    lifecycle: "entrance",
    description: "A pressure point becomes a spear, wedge, and readable body.",
    techniques: ["pressure", "column delay", "spatial transition"],
    cleanup: "commit",
    motionRisk: "high",
  },
];

export const meshEffects: EffectDefinition[] = definitions.map((definition) => ({
  manifest: {
    id: definition.id,
    name: definition.name,
    level: definition.group === "core" ? "effect" : "recipe",
    group: definition.group,
    lifecycle: definition.lifecycle,
    techniques: definition.techniques,
    renderers: ["webgl"],
    description: definition.description,
    requires: definition.mesh === "suck" ? { destination: true, overlay: true } : definition.mesh === "spit" ? { source: true, overlay: true } : { overlay: true },
    motionRisk: definition.motionRisk,
  },
  create: (context) => createMeshController(context, definition.mesh, definition.cleanup),
}));
