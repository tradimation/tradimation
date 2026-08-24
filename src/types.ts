export type EffectLevel = "effect" | "recipe";
export type EffectGroup = "core" | "interaction" | "entrance" | "navigation" | "state" | "spatial";
export type EffectLifecycle = "interaction" | "entrance" | "exit" | "state" | "ambient" | "transition";
export type ControllerState = "idle" | "running" | "paused" | "finished" | "cancelled";
export type CleanupMode = "restore" | "commit" | "hide";

export type EffectId =
  | "anticipation-take"
  | "squash-stretch"
  | "smear"
  | "concentration-lines"
  | "line-boil"
  | "iris"
  | "pop-out"
  | "cartoon-check"
  | "toggle-snap"
  | "launch-away"
  | "stretch-wipe"
  | "stamp-in"
  | "tab-underline-take"
  | "toast-take"
  | "compress-swap"
  | "suck-in"
  | "spit-out";

export interface EffectManifest {
  id: EffectId;
  name: string;
  level: EffectLevel;
  group: EffectGroup;
  lifecycle: EffectLifecycle;
  techniques: string[];
  renderers: Array<"dom" | "svg" | "mask" | "webgl">;
  description: string;
  requires?: {
    source?: boolean;
    destination?: boolean;
    overlay?: boolean;
  };
  motionRisk: "low" | "medium" | "high";
}

export interface EffectOptions {
  duration?: number;
  playbackRate?: number;
  direction?: "left" | "right" | "up" | "down";
  intensity?: number;
  cleanup?: CleanupMode;
  preserveTransform?: boolean;
  source?: Element | DOMPoint | null;
  destination?: Element | DOMPoint | null;
  overlayRoot?: HTMLElement | null;
  reducedMotion?: boolean | "system";
  signal?: AbortSignal;
  onMarker?: (marker: string, progress: number) => void;
  [key: string]: unknown;
}

export interface EffectContext<Options extends EffectOptions = EffectOptions> {
  target: HTMLElement;
  options: Options;
  document: Document;
  window: Window;
}

export interface EffectController {
  readonly state: ControllerState;
  readonly progress: number;
  readonly playbackRate: number;
  play(): Promise<void>;
  pause(): void;
  reverse(): void;
  seek(progress: number): void;
  finish(): void;
  cancel(): void;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

export interface EffectDefinition<Options extends EffectOptions = EffectOptions> {
  manifest: EffectManifest;
  create(context: EffectContext<Options>): EffectController;
}

export interface KeyframeEffectOptions extends EffectOptions {
  keyframes?: Keyframe[];
  easing?: string;
}

export interface MeshPoint {
  x: number;
  y: number;
}

export interface MeshBase {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MeshMapper<Params extends object = Record<string, number>> = (
  progress: number,
  u: number,
  v: number,
  base: MeshBase,
  stage: HTMLElement,
  params: Params,
) => MeshPoint;
