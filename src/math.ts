export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

export const mix = (from: number, to: number, amount: number): number => from + (to - from) * amount;

export const smoother = (value: number): number => {
  const normalized = clamp(value);
  return normalized * normalized * normalized * (normalized * (normalized * 6 - 15) + 10);
};

export const outCubic = (value: number): number => 1 - Math.pow(1 - clamp(value), 3);

export const segment = (value: number, from: number, to: number): number => clamp((value - from) / (to - from));

export type MotionKey = readonly [time: number, value: number, slope?: number];

export const motionCurve = (time: number, keys: readonly MotionKey[]): number => {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) throw new Error("motionCurve requires at least one key");
  if (time <= first[0]) return first[1];
  if (time >= last[0]) return last[1];

  let index = 0;
  while (time > (keys[index + 1]?.[0] ?? 1)) index += 1;
  const keyA = keys[index];
  const keyB = keys[index + 1];
  if (!keyA || !keyB) return last[1];

  const [timeA, valueA, slopeA = 0] = keyA;
  const [timeB, valueB, slopeB = 0] = keyB;
  const span = timeB - timeA;
  const amount = (time - timeA) / span;
  const amount2 = amount * amount;
  const amount3 = amount2 * amount;
  return (
    (2 * amount3 - 3 * amount2 + 1) * valueA +
    (amount3 - 2 * amount2 + amount) * span * slopeA +
    (-2 * amount3 + 3 * amount2) * valueB +
    (amount3 - amount2) * span * slopeB
  );
};

export type TrackKey = readonly [time: number, value: number];

export const flowTrack = (time: number, keys: readonly TrackKey[]): number => {
  const slopes = keys.map((key, index) => {
    const previous = keys[index - 1];
    const next = keys[index + 1];
    if (!previous && next) return (next[1] - key[1]) / (next[0] - key[0]);
    if (!next && previous) return (key[1] - previous[1]) / (key[0] - previous[0]);
    if (!previous || !next) return 0;
    const before = (key[1] - previous[1]) / (key[0] - previous[0]);
    const after = (next[1] - key[1]) / (next[0] - key[0]);
    if (before * after <= 0) return 0;
    return 2 / (1 / before + 1 / after);
  });
  return motionCurve(time, keys.map((key, index) => [key[0], key[1], slopes[index] ?? 0] as const));
};

export const drawingTrack = (time: number, keys: readonly TrackKey[]): number => {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) throw new Error("drawingTrack requires at least one key");
  if (time <= first[0]) return first[1];
  if (time >= last[0]) return last[1];
  let index = 0;
  while (time > (keys[index + 1]?.[0] ?? 1)) index += 1;
  const from = keys[index];
  const to = keys[index + 1];
  if (!from || !to) return last[1];
  return mix(from[1], to[1], segment(time, from[0], to[0]));
};

export const celExposure = (time: number, duration: number, fps = 18, transition = 0.38): number => {
  if (time >= 1) return 1;
  const drawingCount = (duration / 1000) * fps;
  const frame = time * drawingCount;
  const drawing = Math.floor(frame);
  const phase = frame - drawing;
  const inbetween = smoother(segment(phase, 1 - transition, 1));
  return clamp((drawing + inbetween) / drawingCount);
};

export const celShapeTime = (time: number, duration: number, fps = 18): number =>
  mix(time, celExposure(time, duration, fps, 0.62), 0.68);

export const peak = (value: number, center: number, radius: number): number =>
  Math.max(0, 1 - Math.abs(value - center) / radius);

export const softPulse = (time: number, start: number, center: number, end: number): number =>
  time < center ? smoother(segment(time, start, center)) : 1 - smoother(segment(time, center, end));
