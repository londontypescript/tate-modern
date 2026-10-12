import type { AnimationConfig, EmblemModel } from '../engine';
import type { SvgFrameProps } from '../../../shared/react/SvgFrame';
import { TypeScriptMark } from './TypeScriptMark';
import { useLayerRotations } from './useLayerRotations';

export interface AnimatedTypeScriptMarkProps extends SvgFrameProps {
  emblem: EmblemModel;
  animation: AnimationConfig;
  /** When false (or under reduced motion) the static composition is shown. */
  enabled?: boolean;
}

/** The same `TypeScriptMark`, with its squares driven by `useLayerRotations`. */
export function AnimatedTypeScriptMark({
  emblem,
  animation,
  enabled = true,
  ...props
}: AnimatedTypeScriptMarkProps) {
  const rotations = useLayerRotations(emblem.layers, animation, enabled);
  return <TypeScriptMark emblem={emblem} rotations={rotations} framing="rotation-safe" {...props} />;
}
