import { createEffectContext } from "./context.js";
import { domEffects } from "./effects/dom.js";
import { meshEffects } from "./effects/mesh.js";
import type { EffectController, EffectDefinition, EffectId, EffectManifest, EffectOptions } from "./types.js";

export class EffectRegistry {
  private readonly definitions = new Map<EffectId, EffectDefinition>();

  constructor(definitions: EffectDefinition[] = []) {
    definitions.forEach((definition) => this.register(definition));
  }

  register(definition: EffectDefinition): this {
    if (this.definitions.has(definition.manifest.id)) {
      throw new Error(`Effect "${definition.manifest.id}" is already registered`);
    }
    this.definitions.set(definition.manifest.id, definition);
    return this;
  }

  replace(definition: EffectDefinition): this {
    this.definitions.set(definition.manifest.id, definition);
    return this;
  }

  get(id: EffectId): EffectDefinition {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown Tradimation effect: ${id}`);
    return definition;
  }

  has(id: EffectId): boolean {
    return this.definitions.has(id);
  }

  list(): EffectManifest[] {
    return [...this.definitions.values()].map((definition) => definition.manifest);
  }

  create(target: HTMLElement, id: EffectId, options: EffectOptions = {}): EffectController {
    return this.get(id).create(createEffectContext(target, options));
  }

  play(target: HTMLElement, id: EffectId, options: EffectOptions = {}): EffectController {
    const controller = this.create(target, id, options);
    void controller.play();
    return controller;
  }
}

export const definitions: EffectDefinition[] = [...domEffects, ...meshEffects];
export const effects = definitions.filter((definition) => definition.manifest.level === "effect");
export const recipes = definitions.filter((definition) => definition.manifest.level === "recipe");
export const components = definitions.filter((definition) => definition.manifest.level === "component");
export const registry = new EffectRegistry(definitions);

export const createEffect = (target: HTMLElement, id: EffectId, options: EffectOptions = {}): EffectController =>
  registry.create(target, id, options);

export const playEffect = (target: HTMLElement, id: EffectId, options: EffectOptions = {}): EffectController =>
  registry.play(target, id, options);

export const listEffects = (): EffectManifest[] => registry.list();
