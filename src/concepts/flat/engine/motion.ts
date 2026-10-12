import { SETTLE_DURATION, advanceRotations, settleRotations, type Symmetry } from './animation';

/**
 * One frame at a time of the sheets' motion, as plain data, so the frame
 * loop in `useLayerRotations` holds no logic of its own and tests can drive
 * it with a fake clock.
 */

/** What the sheets are moving between, read afresh every frame. */
export interface MotionInputs {
  /** Static rotation of each sheet. */
  targets: readonly number[];
  symmetries: readonly Symmetry[];
  /** Degrees per second, while running. */
  velocities: readonly number[];
}

/** `run` turns the sheets, `settle` glides them home, `still` shows the static composition at once. */
export type MotionMode = 'run' | 'settle' | 'still';

interface Settling {
  /** When this glide began, in milliseconds. */
  start: number;
  from: readonly number[];
  targets: readonly number[];
  symmetries: readonly Symmetry[];
}

export interface MotionState {
  rotations: number[];
  /** Time of the previous frame, in milliseconds; none on a loop's first frame. */
  last?: number;
  settling?: Settling;
}

const sameNumbers = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * The state after the frame at `now` (milliseconds), or `undefined` once the
 * sheets are back in their static composition.
 *
 * Settling heads for the targets and symmetries it started with. If those
 * change on the way (a new seed, stretch, fade or layer count, or a loaded
 * configuration), it starts again from wherever the sheets are, so they
 * never jump. A sheet that didn't exist before starts at its static angle.
 */
export function stepMotion(
  state: MotionState | undefined,
  now: number,
  inputs: MotionInputs,
  mode: MotionMode,
): MotionState | undefined {
  if (mode === 'still' || (mode === 'settle' && !state)) return undefined;
  const current = inputs.targets.map((target, i) => state?.rotations[i] ?? target);

  if (mode === 'run') {
    // A long gap (a background tab) counts as a tenth of a second, not a lurch.
    const dt = state?.last === undefined ? 0 : Math.min((now - state.last) / 1000, 0.1);
    return { rotations: advanceRotations(current, inputs.velocities, dt), last: now };
  }

  const previous = state?.settling;
  const settling =
    previous && sameNumbers(previous.targets, inputs.targets) && sameNumbers(previous.symmetries, inputs.symmetries)
      ? previous
      : { start: now, from: current, targets: inputs.targets, symmetries: inputs.symmetries };
  const progress = (now - settling.start) / 1000 / SETTLE_DURATION;
  if (progress >= 1) return undefined;
  return {
    rotations: settleRotations(settling.from, settling.targets, settling.symmetries, progress),
    last: now,
    settling,
  };
}
