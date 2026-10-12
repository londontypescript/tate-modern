import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../../shared/react/usePrefersReducedMotion';
import {
  layerSymmetry,
  layerVelocities,
  stepMotion,
  type AnimationConfig,
  type MotionInputs,
  type MotionMode,
  type MotionState,
  type SheetLayer,
} from '../engine';

/**
 * Drives the background sheets with requestAnimationFrame, one
 * `stepMotion` per frame. Returns the current rotations, or `undefined`
 * while the emblem is in its static composition.
 *
 * Starting resumes from wherever the sheets are; stopping glides each one
 * to the nearest pose identical to its static one and then hands back the
 * exact static composition. Reduced-motion users get no movement at all.
 */
export function useLayerRotations(
  layers: readonly SheetLayer[],
  config: AnimationConfig,
  enabled: boolean,
): number[] | undefined {
  const reducedMotion = usePrefersReducedMotion();
  const mode: MotionMode = reducedMotion ? 'still' : enabled ? 'run' : 'settle';
  const [rotations, setRotations] = useState<number[] | undefined>(undefined);

  const inputs = useMemo<MotionInputs>(
    () => ({
      targets: layers.map((l) => l.rotation),
      symmetries: layers.map(layerSymmetry),
      velocities: layerVelocities(layers.length, config),
    }),
    [layers, config],
  );

  // The frame loop reads the latest inputs without restarting.
  const latest = useRef(inputs);
  useLayoutEffect(() => {
    latest.current = inputs;
  }, [inputs]);
  const state = useRef<MotionState | undefined>(undefined);

  useEffect(() => {
    if (mode === 'still' || (mode === 'settle' && !state.current)) {
      state.current = undefined;
      setRotations(undefined);
      return;
    }
    // A new loop measures time from its own first frame.
    if (state.current) state.current = { ...state.current, last: undefined };

    let frame = 0;
    const tick = (now: number) => {
      state.current = stepMotion(state.current, now, latest.current, mode);
      setRotations(state.current?.rotations);
      if (state.current) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  return rotations;
}
