import { celExposure, celShapeTime, clamp, drawingTrack, flowTrack, mix, motionCurve, outCubic, peak, segment, smoother, softPulse } from "../math.js";
import type { MeshBase, MeshPoint } from "../types.js";

export interface SmearParams {
  duration: number;
  distance: number;
  stretch: number;
  height: number;
  takeEnd: number;
  brakeStart: number;
  restoreEnd: number;
  brakeForce: number;
}

export interface SuckParams {
  duration: number;
  pullForce: number;
  bodyTravel: number;
  tongue: number;
  columnLag: number;
  pinch: number;
  minHeight: number;
  cadence: number;
  targetX: number;
  targetY: number;
}

export interface SpitParams {
  duration: number;
  releaseForce: number;
  releaseEnd: number;
  columnLag: number;
  pointSize: number;
  spear: number;
  tilt: number;
  cadence: number;
  sourceX: number;
  sourceY: number;
}

export interface LaunchParams {
  duration: number;
  distanceBonus: number;
  accelCurve: number;
  takeDistance: number;
  stretchDistance: number;
  rearFollow: number;
  stretch: number;
  height: number;
  tilt: number;
}

export interface WipeParams {
  duration: number;
  entryForce: number;
  stretch: number;
  height: number;
  brakeStart: number;
  restoreEnd: number;
  momentum: number;
  rearCatch: number;
  ridge: number;
}

export interface StampParams {
  duration: number;
  dropHeight: number;
  hang: number;
  contact: number;
  squashWidth: number;
  squashHeight: number;
  restoreEnd: number;
  impact: number;
}

export interface MeshParameterMap {
  smear: SmearParams;
  suck: SuckParams;
  spit: SpitParams;
  launch: LaunchParams;
  wipe: WipeParams;
  stamp: StampParams;
}

export type MeshEffectName = keyof MeshParameterMap;
export type TypedMeshMapper<Name extends MeshEffectName> = (
  progress: number,
  u: number,
  v: number,
  base: MeshBase,
  stage: HTMLElement,
  params: MeshParameterMap[Name],
) => MeshPoint;

const smear: TypedMeshMapper<"smear"> = (t, u, v, b, _stage, p) => {
  const take = clamp(p.takeEnd, 0.06, 0.38);
  const brake = clamp(p.brakeStart, take + 0.03, 0.62);
  const restore = clamp(p.restoreEnd, brake + 0.1, 0.95);
  const q = (amount: number) => mix(brake, restore, amount);
  const pose = celExposure(t, p.duration, 24, 0.5);
  const shapeT = celShapeTime(t, p.duration, 18);
  const frontOffset = motionCurve(t, [
    [0, 0, p.distance * 0.32],
    [take * 0.19, p.distance * 0.018, p.distance * 1.2],
    [take, p.distance * 0.84, p.distance * 6.25],
    [mix(take, brake, 0.67), p.distance * 0.995, p.distance * 1.15],
    [brake, p.distance * 1.025, p.distance * 0.2],
    [q(0.34), p.distance * 1.01, -p.distance * 0.24],
    [q(0.62), p.distance, 0],
    [1, p.distance, 0],
  ]);
  const width = flowTrack(shapeT, [
    [0, 1], [take * 0.2, 1.04], [take * 0.56, 1.22], [take, p.stretch], [brake, p.stretch],
    [q(0.2), mix(p.stretch, 1, 0.4)], [q(0.46), mix(p.stretch, 1, 0.76)], [q(0.72), 1.015], [restore, 1], [1, 1],
  ]) * b.w;
  const height = flowTrack(shapeT, [
    [0, 1], [take * 0.5, 0.95], [take, p.height], [brake, p.height], [q(0.2), mix(p.height, 1, 0.4)],
    [q(0.46), mix(p.height, 1, 0.76)], [q(0.72), 0.995], [restore, 1], [1, 1],
  ]);
  const speed = flowTrack(shapeT, [[0, 0], [take * 0.25, 0.1], [take, 1], [brake, 1], [q(0.25), 0.22], [q(0.47), 0], [1, 0]]);
  const rearPack = flowTrack(shapeT, [[0, 0], [mix(take, brake, 0.75), 0], [q(0.12), p.brakeForce * 0.07], [q(0.47), p.brakeForce * 0.18], [q(0.75), p.brakeForce * 0.04], [restore, 0], [1, 0]]);
  const ridgeCenter = flowTrack(shapeT, [[0, 0.16], [brake, 0.16], [q(0.19), 0.27], [q(0.47), 0.55], [q(0.75), 0.78], [1, 0.78]]);
  const ridgeAmount = flowTrack(shapeT, [[0, 0], [brake, 0], [q(0.16), p.brakeForce * 0.14], [q(0.47), p.brakeForce * 0.48], [q(0.75), p.brakeForce * 0.09], [restore, 0], [1, 0]]);
  const front = b.x + b.w + frontOffset;
  const mappedU = clamp(u + rearPack * (1 - u) * (0.78 + 0.22 * u));
  const x = front - width * (1 - mappedU);
  const ridge = peak(u, ridgeCenter, 0.13) * ridgeAmount;
  const endTaper = 1 - speed * (Math.pow(1 - u, 3) * 0.25 + Math.pow(u, 5) * 0.05);
  const line = drawingTrack(pose, [[0, 0], [0.14, 3], [0.3, 3], [0.48, 0], [1, 0]]) * (u - 0.5);
  return { x, y: b.y + b.h / 2 + line + (v - 0.5) * b.h * height * endTaper * (1 + ridge * 0.1) };
};

const suck: TypedMeshMapper<"suck"> = (t, u, v, b, _stage, p) => {
  const pose = celExposure(t, p.duration, p.cadence, 0.56);
  const shapeT = celShapeTime(t, p.duration, p.cadence);
  const pull = motionCurve(t, [[0, 0, 1.1 * p.pullForce], [0.06, 0.1, 1.8 * p.pullForce], [0.18, 0.31, 1.9 * p.pullForce], [0.38, 0.64, 1.7 * p.pullForce], [0.64, 0.91, 0.85 * p.pullForce], [0.82, 1, 0.15], [1, 1, 0]]);
  const lead = flowTrack(shapeT, [[0, 0], [0.1, 0.12], [0.28, 0.62], [0.42, 1], [1, 1]]);
  const close = flowTrack(shapeT, [[0, 0], [0.42, 0], [0.62, 0.1], [0.8, 0.34], [1, 0.72]]);
  const ingest = flowTrack(shapeT, [[0, 0], [0.54, 0], [0.7, 0.24], [0.86, 0.72], [1, 1]]);
  const travelDistance = p.targetX - (b.x + b.w);
  const bodyShift = travelDistance * p.bodyTravel * pull;
  const tongue = Math.min(travelDistance * p.tongue, b.w * 1.15) * lead;
  const rearStart = b.x + bodyShift;
  const frontStart = b.x + b.w + bodyShift + tongue;
  const frontX = mix(frontStart, p.targetX, outCubic(close));
  const rearX = mix(rearStart, p.targetX, Math.pow(close, 1.2 + p.columnLag));
  const wedgeX = mix(rearX, frontX, u);
  const localIngest = clamp((ingest - (1 - u) * p.columnLag) / (1 - p.columnLag));
  const x = mix(wedgeX, p.targetX, smoother(localIngest));
  const wedgeProfile = mix(1, p.minHeight, smoother(u));
  const openHeight = mix(1, wedgeProfile, lead);
  const collapseHeight = mix(mix(openHeight, p.minHeight, clamp(close * p.pinch * 0.55)), p.minHeight, smoother(localIngest));
  const tailSnap = drawingTrack(pose, [[0, 0], [0.58, 0], [0.74, -3], [0.88, 0], [1, 0]]) * (1 - u);
  const funnelBend = Math.sin(Math.PI * u) * b.h * 0.055 * lead * (1 - ingest);
  return { x, y: mix(b.y + b.h / 2, p.targetY, close) + (v - 0.5) * b.h * collapseHeight + tailSnap * (v - 0.5) - funnelBend };
};

const spit: TypedMeshMapper<"spit"> = (t, u, v, b, _stage, p) => {
  const pose = celExposure(t, p.duration, p.cadence, 0.56);
  const shapeT = celShapeTime(t, p.duration, p.cadence);
  const releaseAt = (time: number) => motionCurve(time, [[0, 0, 0.08 * p.releaseForce], [p.releaseEnd * 0.1, 0.01, 0.3 * p.releaseForce], [p.releaseEnd * 0.28, 0.18, 2 * p.releaseForce], [p.releaseEnd * 0.55, 0.56, 2.2 * p.releaseForce], [p.releaseEnd * 0.82, 0.86, 1.1 * p.releaseForce], [p.releaseEnd, 1, 0], [1, 1, 0]]);
  const release = releaseAt(t);
  const shapeRelease = releaseAt(shapeT);
  if (pose < 0.07) return { x: p.sourceX + (u - 0.5) * p.pointSize, y: p.sourceY + (v - 0.5) * p.pointSize };
  const localRelease = clamp((shapeRelease - (1 - u) * p.columnLag) / (1 - p.columnLag));
  const open = flowTrack(localRelease, [[0, 0], [0.1, 0.025], [0.26, 0.16], [0.52, 0.56], [0.78, 0.9], [1, 1]]);
  const releasePosition = (value: number) => flowTrack(value, [[0, 0], [0.18, 0.08], [0.48, 0.48], [0.78, 0.84], [1, 1]]);
  const continuousCenter = mix(p.sourceX, b.x + b.w / 2, releasePosition(release));
  const normalX = b.x + u * b.w;
  const boundaryX = mix(p.sourceX, normalX, open);
  const centerCorrection = (continuousCenter - mix(p.sourceX, b.x + b.w / 2, releasePosition(shapeRelease))) * (1 - open);
  const x = boundaryX + centerCorrection;
  const frontBulb = Math.pow(u, 2) * softPulse(shapeRelease, 0.12, 0.34, 0.7);
  const heightOpen = flowTrack(open, [[0, 0.08], [0.2, 0.1], [0.48, 0.28], [0.72, 0.68], [1, 1]]);
  const spearHeight = heightOpen * (1 - p.spear * (1 - u) * (1 - open)) * (1 + frontBulb * 0.22 * (1 - open));
  const line = drawingTrack(pose, [[0, 0], [0.14, -p.tilt], [0.34, -p.tilt], [0.56, 0], [1, 0]]) * (u - 0.5);
  return { x, y: mix(p.sourceY, b.y + b.h / 2, open) + line + (v - 0.5) * b.h * spearHeight };
};

const launch: TypedMeshMapper<"launch"> = (t, u, v, b, stage, p) => {
  const shapeT = celShapeTime(t, p.duration, 18);
  const distance = stage.clientWidth - b.x + p.distanceBonus;
  const impulse = clamp(p.takeDistance / distance, 0.06, 0.32);
  const progressAt = (time: number) => motionCurve(time, [[0, 0, 0.08], [0.06, 0.012, 0.35], [0.24, impulse, 1.2], [0.52, 0.5, 1.25], [0.8, 0.86, 0.92], [1, 1, 0.45]]);
  const travel = distance * progressAt(Math.pow(t, p.accelCurve));
  const shapeTravel = distance * progressAt(Math.pow(shapeT, p.accelCurve));
  const take = clamp((travel * (1 - p.rearFollow)) / p.stretchDistance);
  const shapeTake = clamp((shapeTravel * (1 - p.rearFollow)) / p.stretchDistance);
  const width = flowTrack(shapeTake, [[0, 1], [0.03, 1.02], [0.24, mix(1, p.stretch, 0.26)], [0.58, mix(1, p.stretch, 0.63)], [1, p.stretch]]) * b.w;
  const height = flowTrack(shapeTake, [[0, 1], [0.18, 0.96], [0.55, mix(1, p.height, 0.53)], [1, p.height]]);
  const speed = flowTrack(shapeTake, [[0, 0], [0.12, 0.08], [0.48, 0.54], [1, 1]]);
  const rearFollow = mix(p.rearFollow, 1, smoother(segment(take, 0.55, 1)));
  const rear = b.x + travel * rearFollow;
  const endTaper = 1 - speed * (Math.pow(1 - u, 3) * 0.18 + Math.pow(u, 5) * 0.07);
  return { x: rear + width * u, y: b.y + b.h / 2 + p.tilt * (u - 0.5) * speed + (v - 0.5) * b.h * height * endTaper };
};

const wipe: TypedMeshMapper<"wipe"> = (t, u, v, b, _stage, p) => {
  const brake = clamp(p.brakeStart, 0.04, 0.64);
  const restore = clamp(p.restoreEnd, brake + 0.14, 0.97);
  const q = (amount: number) => mix(brake, restore, amount);
  const shapeT = celShapeTime(t, p.duration, 18);
  const stretchedWidth = p.stretch * b.w;
  const finalCenter = b.x + b.w / 2;
  const brakeCenter = b.x + b.w * 0.9 - stretchedWidth / 2;
  const travelFront = motionCurve(t, [[0, -12, 260 * p.entryForce], [brake * 0.28, 60, 420 * p.entryForce], [brake * 0.7, b.x + b.w * 0.72, 700 * p.entryForce], [brake, b.x + b.w * 0.9, 420 * p.entryForce]]);
  const center = t <= brake ? travelFront - stretchedWidth / 2 : motionCurve(t, [[brake, brakeCenter, 420 * p.momentum], [q(0.29), b.x + b.w * 0.25, 360 * p.momentum], [q(0.57), b.x + b.w * 0.425, 190 * p.momentum], [q(0.86), finalCenter, 0], [1, finalCenter, 0]]);
  const width = flowTrack(shapeT, [[0, p.stretch], [brake, p.stretch], [q(0.24), mix(p.stretch, 1, 0.32)], [q(0.56), mix(p.stretch, 1, 0.72)], [restore, 1], [1, 1]]) * b.w;
  const height = flowTrack(shapeT, [[0, p.height], [brake, p.height], [q(0.24), mix(p.height, 1, 0.32)], [q(0.56), mix(p.height, 1, 0.72)], [restore, 1], [1, 1]]);
  const speed = flowTrack(shapeT, [[0, 1], [brake, 1], [q(0.24), 0.68], [q(0.56), 0.28], [restore, 0], [1, 0]]);
  const rearPack = flowTrack(shapeT, [[0, 0], [q(0.06), 0], [q(0.32), p.rearCatch * 0.24], [q(0.58), p.rearCatch * 0.55], [q(0.81), p.rearCatch * 0.12], [restore, 0], [1, 0]]);
  const ridgeCenter = flowTrack(shapeT, [[0, 0.16], [q(0.06), 0.16], [q(0.32), 0.34], [q(0.58), 0.58], [q(0.81), 0.76], [1, 0.76]]);
  const ridgeAmount = flowTrack(shapeT, [[0, 0], [q(0.06), 0], [q(0.32), p.ridge * 0.2], [q(0.58), p.ridge * 0.45], [q(0.81), p.ridge * 0.06], [restore, 0], [1, 0]]);
  const mappedU = clamp(u + rearPack * (1 - u) * (0.78 + 0.22 * u));
  const ridge = peak(u, ridgeCenter, 0.13) * ridgeAmount;
  const endTaper = 1 - speed * (Math.pow(1 - u, 3) * 0.18 + Math.pow(u, 5) * 0.07);
  const boundaryPulse = softPulse(shapeT, brake, q(0.38), q(0.8));
  const front = center + width / 2 + b.w * 0.1 * boundaryPulse;
  const rear = center - width / 2 - b.w * p.rearCatch * 0.34 * boundaryPulse;
  return { x: mix(rear, front, mappedU), y: b.y + b.h / 2 + 3 * (u - 0.5) * speed + (v - 0.5) * b.h * height * endTaper * (1 + ridge * 0.1) };
};

const stamp: TypedMeshMapper<"stamp"> = (t, u, v, b, _stage, p) => {
  const contact = clamp(p.contact, p.hang + 0.1, 0.72);
  const restore = clamp(p.restoreEnd, contact + 0.16, 0.98);
  const pre = contact - 0.07;
  const squashPeak = mix(contact, restore, 0.16);
  const squashHold = mix(contact, restore, 0.32);
  const shapeT = celShapeTime(t, p.duration, 18);
  const hangingBottom = b.y + b.h - p.dropHeight;
  const bottom = motionCurve(t, [[0, hangingBottom, 0], [p.hang, hangingBottom, 70], [pre, b.y + b.h - 8, 720], [contact, b.y + b.h, 0], [1, b.y + b.h, 0]]);
  const width = flowTrack(shapeT, [[0, 1], [Math.max(p.hang, contact - 0.19), 0.98], [pre, 0.95], [contact - 0.01, 1.03], [squashPeak, p.squashWidth], [squashHold, p.squashWidth], [restore, 1], [1, 1]]);
  const height = flowTrack(shapeT, [[0, 1], [Math.max(p.hang, contact - 0.19), 1.03], [pre, 1.1], [contact - 0.01, 0.94], [squashPeak, p.squashHeight], [squashHold, p.squashHeight], [restore, 1], [1, 1]]);
  const register = flowTrack(shapeT, [[0, 0], [pre, 0], [contact, -2], [squashHold, -3], [mix(contact, restore, 0.82), 0], [1, 0]]);
  const impact = flowTrack(shapeT, [[0, 0], [pre, 0], [contact, 0.65], [squashPeak, 1], [squashHold, 1], [mix(contact, restore, 0.68), 0], [1, 0]]);
  const lean = flowTrack(shapeT, [[0, 0], [Math.max(p.hang, contact - 0.19), -1], [pre, -3], [contact + 0.01, -1], [squashPeak + 0.02, 0], [1, 0]]) * (1 - v);
  const belly = 1 + (1 - Math.abs(v - 0.5) * 2) * impact * p.impact;
  return { x: b.x + b.w / 2 + register + (u - 0.5) * b.w * width * belly + lean, y: bottom - (1 - v) * b.h * height };
};

export const meshMaps = { smear, suck, spit, launch, wipe, stamp };

export const meshDefaults: MeshParameterMap = {
  smear: { duration: 670, distance: 230, stretch: 1.64, height: 0.72, takeEnd: 0.18, brakeStart: 0.27, restoreEnd: 0.58, brakeForce: 0.65 },
  suck: { duration: 830, pullForce: 1.24, bodyTravel: 0.52, tongue: 0.44, columnLag: 0.31, pinch: 0.9, minHeight: 0.05, cadence: 16, targetX: 0, targetY: 0 },
  spit: { duration: 840, releaseForce: 1.4, releaseEnd: 0.58, columnLag: 0.3, pointSize: 7, spear: 0.24, tilt: 4, cadence: 18, sourceX: 0, sourceY: 0 },
  launch: { duration: 690, distanceBonus: 120, accelCurve: 1.15, takeDistance: 112, stretchDistance: 165, rearFollow: 0.32, stretch: 1.9, height: 0.62, tilt: 2 },
  wipe: { duration: 820, entryForce: 0.9, stretch: 1.6, height: 0.56, brakeStart: 0.37, restoreEnd: 0.75, momentum: 0.92, rearCatch: 0.15, ridge: 0.58 },
  stamp: { duration: 770, dropHeight: 76, hang: 0.17, contact: 0.42, squashWidth: 1.36, squashHeight: 0.62, restoreEnd: 0.78, impact: 0.08 },
};
