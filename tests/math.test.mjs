import assert from "node:assert/strict";
import test from "node:test";
import { celShapeTime, flowTrack, motionCurve } from "../dist/math.js";
import { listEffects } from "../dist/registry.js";
import { meshDefaults, meshMaps } from "../dist/effects/mesh-maps.js";
import { effectDocs } from "../site/effects.js";

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

test("curated registry contains 17 unique effects", () => {
  const ids = listEffects().map((effect) => effect.id);
  assert.equal(ids.length, 17);
  assert.equal(new Set(ids).size, 17);
});

test("every effect page exposes valid live parameters", () => {
  const runtimeIds = listEffects().map((effect) => effect.id).sort();
  const documentedIds = effectDocs.map((effect) => effect.id).sort();
  assert.deepEqual(documentedIds, runtimeIds);

  for (const effect of effectDocs) {
    const keys = effect.controls.map((control) => control.key);
    assert.ok(keys.includes("duration"), `${effect.id} exposes duration`);
    assert.ok(keys.includes("playbackRate"), `${effect.id} exposes playback rate`);
    assert.equal(new Set(keys).size, keys.length, `${effect.id} parameter keys are unique`);
    effect.controls.filter((control) => control.type === "range").forEach((control) => {
      assert.ok(control.value >= control.min && control.value <= control.max, `${effect.id}.${control.key} default is in range`);
      assert.ok(control.step > 0, `${effect.id}.${control.key} has a positive step`);
    });
  }
});

test("connected mesh maps remain finite and connected through every pose", () => {
  const base = { x: 78, y: 94, w: 234, h: 110 };
  const stage = { clientWidth: 480, clientHeight: 270 };
  const params = {
    ...meshDefaults,
    suck: { ...meshDefaults.suck, targetX: 450, targetY: 135 },
    spit: { ...meshDefaults.spit, sourceX: 30, sourceY: 135 },
  };

  for (const name of Object.keys(meshMaps)) {
    for (let frame = 0; frame <= 20; frame += 1) {
      const progress = frame / 20;
      for (let column = 0; column <= 8; column += 1) {
        const top = meshMaps[name](progress, column / 8, 0, base, stage, params[name]);
        const bottom = meshMaps[name](progress, column / 8, 1, base, stage, params[name]);
        assert.ok(Number.isFinite(top.x) && Number.isFinite(top.y), `${name} top vertex must stay finite`);
        assert.ok(Number.isFinite(bottom.x) && Number.isFinite(bottom.y), `${name} bottom vertex must stay finite`);
        assert.ok(bottom.y >= top.y - 0.001, `${name} columns must not flip vertically`);
      }
    }
  }
});

test("restoring mesh effects return to the original drawing", () => {
  const base = { x: 78, y: 94, w: 234, h: 110 };
  const stage = { clientWidth: 480, clientHeight: 270 };
  const sample = [0, 0.25, 0.5, 0.75, 1];
  const restoring = {
    wipe: meshDefaults.wipe,
    stamp: meshDefaults.stamp,
    spit: { ...meshDefaults.spit, sourceX: 30, sourceY: 135 },
  };

  for (const [name, effectParams] of Object.entries(restoring)) {
    for (const u of sample) {
      for (const v of sample) {
        const point = meshMaps[name](1, u, v, base, stage, effectParams);
        assert.ok(Math.abs(point.x - (base.x + base.w * u)) < 0.001, `${name} restores x`);
        assert.ok(Math.abs(point.y - (base.y + base.h * v)) < 0.001, `${name} restores y`);
      }
    }
  }
});
