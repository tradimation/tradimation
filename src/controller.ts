import { clamp } from "./math.js";
import type { CleanupMode, ControllerState, EffectController } from "./types.js";

export interface FrameDriver {
  prepare?(): void | Promise<void>;
  render(progress: number): void;
  complete?(): void;
  cancel?(): void;
  destroy?(): void;
}

export interface FrameControllerOptions {
  duration: number;
  playbackRate?: number;
  signal?: AbortSignal;
}

export class FrameController implements EffectController {
  state: ControllerState = "idle";
  progress = 0;
  playbackRate: number;

  private animationFrame = 0;
  private lastTime = 0;
  private direction = 1;
  private prepared = false;
  private playPromise: Promise<void> | null = null;
  private resolvePlay: (() => void) | null = null;

  constructor(
    private readonly driver: FrameDriver,
    private readonly options: FrameControllerOptions,
  ) {
    this.playbackRate = options.playbackRate ?? 1;
    options.signal?.addEventListener("abort", () => this.cancel(), { once: true });
  }

  async play(): Promise<void> {
    if (this.state === "running" && this.playPromise) return this.playPromise;
    if (!this.prepared) {
      await this.driver.prepare?.();
      this.prepared = true;
      this.driver.render(this.progress);
    }
    if (this.state === "finished") this.progress = this.direction > 0 ? 0 : 1;
    if (this.state === "cancelled") this.progress = this.direction > 0 ? 0 : 1;

    this.state = "running";
    this.lastTime = performance.now();
    this.playPromise = new Promise<void>((resolve) => {
      this.resolvePlay = resolve;
    });
    this.animationFrame = requestAnimationFrame(this.tick);
    return this.playPromise;
  }

  pause(): void {
    if (this.state !== "running") return;
    cancelAnimationFrame(this.animationFrame);
    this.state = "paused";
  }

  reverse(): void {
    this.direction *= -1;
    if (this.state === "idle" || this.state === "finished" || this.state === "cancelled") void this.play();
  }

  seek(progress: number): void {
    this.progress = clamp(progress);
    this.driver.render(this.progress);
  }

  finish(): void {
    cancelAnimationFrame(this.animationFrame);
    this.progress = this.direction > 0 ? 1 : 0;
    this.driver.render(this.progress);
    this.driver.complete?.();
    this.state = "finished";
    this.settlePromise();
  }

  cancel(): void {
    cancelAnimationFrame(this.animationFrame);
    this.driver.cancel?.();
    this.state = "cancelled";
    this.settlePromise();
  }

  setPlaybackRate(rate: number): void {
    if (!Number.isFinite(rate) || rate === 0) throw new Error("playbackRate must be a finite non-zero number");
    this.playbackRate = Math.abs(rate);
    if (rate < 0) this.direction = -1;
  }

  destroy(): void {
    this.cancel();
    this.driver.destroy?.();
  }

  private readonly tick = (now: number): void => {
    if (this.state !== "running") return;
    const delta = ((now - this.lastTime) / this.options.duration) * this.playbackRate * this.direction;
    this.lastTime = now;
    this.progress = clamp(this.progress + delta);
    this.driver.render(this.progress);
    const ended = this.direction > 0 ? this.progress >= 1 : this.progress <= 0;
    if (ended) {
      this.driver.complete?.();
      this.state = "finished";
      this.settlePromise();
      return;
    }
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private settlePromise(): void {
    this.resolvePlay?.();
    this.resolvePlay = null;
    this.playPromise = null;
  }
}

export interface KeyframeControllerOptions {
  duration: number;
  easing?: string;
  fill?: FillMode;
  cleanup?: CleanupMode;
  preserveTransform?: boolean;
  playbackRate?: number;
  reducedMotion?: boolean;
  signal?: AbortSignal;
}

export class KeyframeController implements EffectController {
  state: ControllerState = "idle";
  playbackRate: number;

  private animation: Animation | null = null;
  private readonly originalStyle: string;
  private readonly animatedKeyframes: Keyframe[];

  constructor(
    private readonly target: HTMLElement,
    keyframes: Keyframe[],
    private readonly options: KeyframeControllerOptions,
  ) {
    this.playbackRate = options.playbackRate ?? 1;
    this.originalStyle = target.style.cssText;
    const underlyingTransform = getComputedStyle(target).transform;
    const transformPrefix = options.preserveTransform !== false && underlyingTransform !== "none" ? `${underlyingTransform} ` : "";
    this.animatedKeyframes = keyframes.map((keyframe) => {
      if (!transformPrefix || typeof keyframe.transform !== "string") return keyframe;
      return { ...keyframe, transform: `${transformPrefix}${keyframe.transform}` };
    });
    options.signal?.addEventListener("abort", () => this.cancel(), { once: true });
  }

  get progress(): number {
    const duration = this.duration;
    return clamp(Number(this.animation?.currentTime ?? 0) / duration);
  }

  async play(): Promise<void> {
    if (!this.animation) this.createAnimation();
    if (!this.animation) return;
    this.animation.playbackRate = this.playbackRate;
    this.animation.play();
    this.state = "running";
    try {
      await this.animation.finished;
      this.state = "finished";
      this.applyCleanup();
    } catch {
      if (this.state === "running") this.state = "paused";
    }
  }

  pause(): void {
    this.animation?.pause();
    if (this.state === "running") this.state = "paused";
  }

  reverse(): void {
    if (!this.animation) this.createAnimation();
    this.animation?.reverse();
    this.state = "running";
  }

  seek(progress: number): void {
    if (!this.animation) this.createAnimation();
    if (this.animation) this.animation.currentTime = clamp(progress) * this.duration;
  }

  finish(): void {
    if (!this.animation) this.createAnimation();
    this.animation?.finish();
    this.state = "finished";
    this.applyCleanup();
  }

  cancel(): void {
    this.animation?.cancel();
    this.target.style.cssText = this.originalStyle;
    this.state = "cancelled";
  }

  setPlaybackRate(rate: number): void {
    if (!Number.isFinite(rate) || rate === 0) throw new Error("playbackRate must be a finite non-zero number");
    this.playbackRate = rate;
    if (this.animation) this.animation.playbackRate = rate;
  }

  destroy(): void {
    this.cancel();
    this.animation = null;
  }

  private get duration(): number {
    return this.options.reducedMotion ? Math.min(180, this.options.duration) : this.options.duration;
  }

  private createAnimation(): void {
    if (getComputedStyle(this.target).display === "inline") this.target.style.display = "inline-block";
    this.animation = this.target.animate(this.animatedKeyframes, {
      duration: this.duration,
      easing: this.options.easing ?? "linear",
      fill: this.options.fill ?? "both",
    });
    this.animation.pause();
  }

  private applyCleanup(): void {
    const cleanup = this.options.cleanup ?? "commit";
    if (cleanup === "restore") {
      this.animation?.cancel();
      this.target.style.cssText = this.originalStyle;
      return;
    }
    if (cleanup === "hide") {
      this.animation?.cancel();
      this.target.style.visibility = "hidden";
      return;
    }
    this.animation?.commitStyles?.();
    this.animation?.cancel();
  }
}

export const createKeyframeController = (
  target: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeControllerOptions,
): EffectController => new KeyframeController(target, keyframes, options);

export class CompositeController implements EffectController {
  constructor(private readonly controllers: EffectController[]) {}

  get state(): ControllerState {
    if (this.controllers.some((controller) => controller.state === "running")) return "running";
    if (this.controllers.some((controller) => controller.state === "paused")) return "paused";
    if (this.controllers.every((controller) => controller.state === "finished")) return "finished";
    if (this.controllers.every((controller) => controller.state === "cancelled")) return "cancelled";
    return "idle";
  }

  get progress(): number {
    return this.controllers[0]?.progress ?? 0;
  }

  get playbackRate(): number {
    return this.controllers[0]?.playbackRate ?? 1;
  }

  async play(): Promise<void> {
    await Promise.all(this.controllers.map((controller) => controller.play()));
  }

  pause(): void {
    this.controllers.forEach((controller) => controller.pause());
  }

  reverse(): void {
    this.controllers.forEach((controller) => controller.reverse());
  }

  seek(progress: number): void {
    this.controllers.forEach((controller) => controller.seek(progress));
  }

  finish(): void {
    this.controllers.forEach((controller) => controller.finish());
  }

  cancel(): void {
    this.controllers.forEach((controller) => controller.cancel());
  }

  setPlaybackRate(rate: number): void {
    this.controllers.forEach((controller) => controller.setPlaybackRate(rate));
  }

  destroy(): void {
    this.controllers.forEach((controller) => controller.destroy());
  }
}
