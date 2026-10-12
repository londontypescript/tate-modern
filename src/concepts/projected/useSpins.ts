import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const DEG = Math.PI / 180;

/**
 * Extra turn of each slab over time, in radians, matching the 3D concept:
 * slab n turns n + 1 times as fast as the front slab. Holds its angles when
 * stopped; returns an empty list until it first runs.
 */
export function useSpins(count: number, speed: number, enabled: boolean): number[] {
  const [spins, setSpins] = useState<number[]>([]);
  const current = useRef<number[]>([]);
  // The frame loop reads the latest inputs without restarting.
  const latest = useRef({ count, speed });
  useLayoutEffect(() => {
    latest.current = { count, speed };
  }, [count, speed]);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let last: number | undefined;
    const tick = (now: number) => {
      const dt = last === undefined ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      const { count, speed } = latest.current;
      current.current = Array.from(
        { length: count },
        (_, i) => (current.current[i] ?? 0) + dt * speed * DEG * (i + 1),
      );
      setSpins(current.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  return spins;
}
