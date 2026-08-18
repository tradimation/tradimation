import type { EffectContext, EffectOptions } from "./types.js";

export const shouldReduceMotion = (options: EffectOptions, windowObject: Window): boolean => {
  if (typeof options.reducedMotion === "boolean") return options.reducedMotion;
  return windowObject.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export const createEffectContext = <Options extends EffectOptions>(
  target: HTMLElement,
  options: Options,
): EffectContext<Options> => {
  const documentObject = target.ownerDocument;
  const windowObject = documentObject.defaultView;
  if (!windowObject) throw new Error("Tradimation requires an element attached to a document with a Window");
  return { target, options, document: documentObject, window: windowObject };
};

export const resolvePoint = (value: Element | DOMPoint | null | undefined, fallback: DOMPoint): DOMPoint => {
  if (!value) return fallback;
  if (value instanceof Element) {
    const rect = value.getBoundingClientRect();
    return new DOMPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
  return value;
};
