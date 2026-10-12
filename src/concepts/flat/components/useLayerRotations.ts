import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../../shared/react/usePrefersReducedMotion';
import {
  SETTLE_DURATION,
  advanceRotations,
  layerVelocities,
  settleRotations,
  type AnimationConfig,
  type SquareLayer,
} from '../engine';

/**
 * Drives the background squares with requestAnimationFrame, using the pure
 * functions in `logo/animation`. Returns the current rotations, or
 * `undefined` while the emblem is in its static composition.
 *
 * Starting resumes from wherever the squares are; stopping glides each one
 * to the nearest pose identical to its static angle and then hands back the
 * exact static composition. Reduced-motion users get no movement at all.
 */
export function useLayerRotations(
  layers: readonly SquareLayer[],
  config: AnimationConfig,
  enabled: boolean,
): number[] | undefined {
  const reducedMotion = usePrefersReducedMotion();
  const active = enabled && !reducedMotion;
  const [rotations, setRotations] = useState<number[] | undefined>(undefined);

  const targets = useMemo(() => layers.map((l) => l.rotation), [layers]);
  const velocities = useMemo(() => layerVelocities(layers.length, config), [layers.length, config]);

  // The frame loop reads the latest inputs without restarting.
  const latest = useRef({ targets, velocities });
  useLayoutEffect(() => {
    latest.current = { targets, velocities };
  }, [targets, velocities]);
  const current = useRef<number[] | undefined>(undefined);

  useEffect(() => {
    if (!active && (reducedMotion || !current.current)) {
      current.current = undefined;
      setRotations(undefined);
      return;
    }

    let frame = 0;
    let last: number | undefined;
    let settle: { start: number; from: number[] } | undefined;

    const tick = (now: number) => {
      const dt = last === undefined ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      const { targets, velocities } = latest.current;
      let next = current.current;
      if (!next || next.length !== targets.length) next = [...targets];

      if (active) {
        next = advanceRotations(next, velocities, dt);
      } else {
        settle ??= { start: now, from: next };
        const progress = (now - settle.start) / 1000 / SETTLE_DURATION;
        if (progress >= 1) {
          current.current = undefined;
          setRotations(undefined);
          return;
        }
        next = settleRotations(settle.from, targets, progress);
      }

      current.current = next;
      setRotations(next);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reducedMotion]);

  return rotations;
}
