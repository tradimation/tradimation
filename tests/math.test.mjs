import assert from "node:assert/strict";
import test from "node:test";
import { celShapeTime, flowTrack, motionCurve } from "../dist/math.js";
import { listEffects } from "../dist/registry.js";

test("motionCurve reaches exact endpoints", () => {
  const keys = [[0, 0, 0], [0.5, 10, 20], [1, 20, 0]];
  assert.equal(motionCurve(0, keys), 0);
  assert.equal(motionCurve(1, keys), 20);
});

test("flowTrack remains inside a monotonic track", () => {
  const keys = [[0, 0], [0.4, 0.6], [1, 1]];
  for (let index = 0; index <= 100; index += 1) {
    const value = flowTrack(index / 100, keys);
    assert.ok(value >= 0 && value <= 1);
  }
});

test("shape exposure preserves exact endpoints", () => {
  assert.equal(celShapeTime(0, 700), 0);
  assert.equal(celShapeTime(1, 700), 1);
});

test("canonical registry contains 26 unique effects", () => {
  const ids = listEffects().map((effect) => effect.id);
  assert.equal(ids.length, 26);
  assert.equal(new Set(ids).size, 26);
});
