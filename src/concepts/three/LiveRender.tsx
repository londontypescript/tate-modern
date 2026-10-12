import { Canvas } from '@react-three/fiber';
import type { Font } from 'opentype.js';
import type { ThreeConfig } from './config';
import { StackScene } from './Scene';

const ignoreCapture = () => {};

/**
 * The 3D render of a configuration on its own, for other concepts to show
 * beside theirs (loaded lazily, so three.js costs nothing until it is used).
 */
export default function LiveRender({
  config,
  font,
  animate = false,
}: {
  config: ThreeConfig;
  font: Font;
  animate?: boolean;
}) {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: config.camera.fov, position: [0, 0, config.camera.distance] }}
      dpr={[1, 2]}
    >
      <StackScene config={config} font={font} animate={animate} orbit={false} onCaptureReady={ignoreCapture} />
    </Canvas>
  );
}
