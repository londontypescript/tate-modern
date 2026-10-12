import { describe, expect, it } from 'vitest';
import { SETTLE_DURATION, type Symmetry } from './animation';
import { stepMotion, type MotionInputs, type MotionMode, type MotionState } from './motion';

const FRAME = 16;

/** A fake frame clock: each `frame()` advances time by one frame and steps the motion, as the hook's loop does. */
function frameClock(inputs: MotionInputs) {
  let now = 1000;
  let state: MotionState | undefined;
  let mode: MotionMode = 'run';
  return {
    set inputs(next: MotionInputs) {
      inputs = next;
    },
    set mode(next: MotionMode) {
      mode = next;
    },
    frame() {
      now += FRAME;
      state = stepMotion(state, now, inputs, mode);
      return state?.rotations;
    },
    frames(count: number) {
      let last: number[] | undefined;
      for (let i = 0; i < count; i++) last = this.frame();
      return last;
    },
  };
}

const inputsOf = (targets: number[], symmetries: Symmetry[], velocities = targets.map(() => 30)): MotionInputs => ({
  targets,
  symmetries,
  velocities,
});

const settleFrames = Math.ceil((SETTLE_DURATION * 1000) / FRAME);

/** The largest change of any sheet's angle from one frame to the next. */
const jump = (a: readonly number[] | undefined, b: readonly number[] | undefined) =>
  Math.max(...(a ?? []).map((v, i) => Math.abs(v - (b?.[i] ?? NaN))));

const offPose = (angle: number, target: number, symmetry: number) =>
  Math.abs(((((angle - target) % symmetry) + symmetry * 1.5) % symmetry) - symmetry / 2);

describe('stepMotion', () => {
  it('does nothing until started, and shows the static composition once settled', () => {
    const clock = frameClock(inputsOf([7.5, 22.5], [90, 90]));
    clock.mode = 'settle';
    expect(clock.frame()).toBeUndefined();
    clock.mode = 'run';
    expect(clock.frames(30)).toBeDefined();
    clock.mode = 'settle';
    expect(clock.frames(settleFrames - 1)).toBeDefined();
    expect(clock.frames(2)).toBeUndefined();
  });

  it('settles each sheet the short way round its own symmetry', () => {
    const targets = [7.5, 22.5, 37.5];
    const symmetries: Symmetry[] = [90, 180, 360];
    const clock = frameClock(inputsOf(targets, symmetries, [40, -55, 70]));
    clock.frames(200);
    clock.mode = 'settle';
    const near = clock.frames(settleFrames - 2) ?? [];
    near.forEach((angle, i) => expect(offPose(angle, targets[i] ?? NaN, symmetries[i] ?? NaN)).toBeLessThan(0.1));
  });

  it('restarts settling from where the sheets are when the targets change on the way', () => {
    const clock = frameClock(inputsOf([7.5, 22.5], [90, 90]));
    clock.frames(100);
    clock.mode = 'settle';
    const before = clock.frames(settleFrames / 2);
    // A new seed moves the static angles mid-glide.
    clock.inputs = inputsOf([31, -4], [90, 90]);
    const after = clock.frame();
    expect(jump(before, after)).toBeLessThan(1e-9); // the glide starts again from here
    const near = clock.frames(settleFrames - 2) ?? [];
    expect(offPose(near[0] ?? NaN, 31, 90)).toBeLessThan(0.1);
    expect(offPose(near[1] ?? NaN, -4, 90)).toBeLessThan(0.1);
    expect(clock.frames(3)).toBeUndefined();
  });

  it('restarts settling when a symmetry changes, so a newly faded sheet takes the full turn', () => {
    const clock = frameClock(inputsOf([0], [90]));
    clock.frames(Math.round(2250 / FRAME)); // 30°/s for 2.25 s: about 67.5°
    clock.mode = 'settle';
    clock.frame();
    clock.inputs = inputsOf([0], [360]); // the fade is switched on mid-glide
    const restarted = clock.frame() ?? [];
    const near = clock.frames(settleFrames - 2) ?? [];
    // As a square it would have gone on to 90°; as a faded sheet it must come back to 0°.
    expect(restarted[0]).toBeGreaterThan(45);
    expect(near[0]).toBeCloseTo(0, 0);
  });

  it('starts new layers at their static angle and keeps the others moving smoothly', () => {
    const clock = frameClock(inputsOf([10, 20], [90, 90]));
    const running = clock.frames(50) ?? [];
    clock.inputs = inputsOf([10, 20, 30, 40], [90, 90, 90, 90]);
    const grown = clock.frame() ?? [];
    expect(grown).toHaveLength(4);
    expect(Math.abs((grown[0] ?? NaN) - (running[0] ?? NaN))).toBeLessThan(1);
    expect(Math.abs((grown[2] ?? NaN) - 30)).toBeLessThan(1);

    clock.mode = 'settle';
    const settling = clock.frames(10) ?? [];
    clock.inputs = inputsOf([10, 20, 30, 40, 50], [90, 90, 90, 90, 90]);
    const more = clock.frame() ?? [];
    expect(jump(settling, more.slice(0, 4))).toBeLessThan(1e-9);
    expect(more[4]).toBe(50);
    clock.inputs = inputsOf([10, 20], [90, 90]);
    expect(clock.frame()).toHaveLength(2);
  });

  it('resumes from where the sheets are when animation restarts before settling finishes', () => {
    const clock = frameClock(inputsOf([7.5, 22.5], [90, 180]));
    clock.frames(100);
    clock.mode = 'settle';
    const settling = clock.frames(settleFrames / 3);
    clock.mode = 'run';
    const resumed = clock.frame();
    expect(jump(settling, resumed)).toBeLessThan(1); // one frame's turn, no jump back
    clock.mode = 'settle';
    clock.frames(10);
    expect(clock.frames(settleFrames)).toBeUndefined();
  });

  it('shows the static composition at once under reduced motion, running or settling', () => {
    const clock = frameClock(inputsOf([7.5], [90]));
    clock.frames(20);
    clock.mode = 'still';
    expect(clock.frame()).toBeUndefined();
    clock.mode = 'run';
    clock.frames(20);
    clock.mode = 'settle';
    clock.frames(5);
    clock.mode = 'still';
    expect(clock.frame()).toBeUndefined();
    clock.mode = 'settle';
    expect(clock.frame()).toBeUndefined();
  });
});
