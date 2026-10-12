import { Environment, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { ExtrudeGeometry, Shape, ShapeGeometry, Vector2, type Mesh, type PerspectiveCamera } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import type { Font } from 'opentype.js';
import { tileLettering } from '../../shared';
import type { CameraConfig, LetteringConfig, LightingConfig, SlabConfig, ThreeConfig } from './config';
import { placeSlabs, slabFaceHalfWidth, slabFrontZ } from './stack';

const DEG = Math.PI / 180;

/** A unit square extruded with the configured chamfer, centred on the origin. */
function useSlabGeometry(slab: SlabConfig) {
  const geometry = useMemo(() => {
    const shape = new Shape([
      new Vector2(-0.5, -0.5),
      new Vector2(-0.5, 0.5),
      new Vector2(0.5, 0.5),
      new Vector2(0.5, -0.5),
    ]);
    return new ExtrudeGeometry(shape, {
      depth: slab.depth,
      bevelEnabled: true,
      bevelThickness: slab.bevelThickness,
      bevelSize: slab.bevelSize,
      bevelOffset: slab.bevelOffset,
      bevelSegments: Math.max(1, Math.round(slab.bevelSegments)),
    }).center();
  }, [slab.depth, slab.bevelThickness, slab.bevelSize, slab.bevelOffset, slab.bevelSegments]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/**
 * "TS" as flat geometry for the front face, set like the flat concept's
 * tile (`tileLettering`), via SVG path data.
 */
function useLetteringGeometry(font: Font, faceHalf: number) {
  const geometry = useMemo(() => {
    const size = 100;
    const glyphs = tileLettering(font);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">${glyphs.map((g) => `<path d="${g.d}"/>`).join('')}</svg>`;
    const shapes = new SVGLoader().parse(svg).paths.flatMap((path) => SVGLoader.createShapes(path));
    const geometry = new ShapeGeometry(shapes);
    // From a 100-unit, y-down tile to the slab's face, y up. The mirror
    // reverses the triangles' winding, so turn them back to face forwards.
    const k = (2 * faceHalf) / size;
    geometry.scale(k, -k, 1);
    const index = geometry.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const b = index.getX(i + 1);
        index.setX(i + 1, index.getX(i + 2));
        index.setX(i + 2, b);
      }
    }
    return geometry;
  }, [font, faceHalf]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function Lettering({ font, slab, lettering }: { font: Font; slab: SlabConfig; lettering: LetteringConfig }) {
  const geometry = useLetteringGeometry(font, slabFaceHalfWidth(slab));
  return (
    <mesh geometry={geometry} position={[0, 0, slabFrontZ(slab) + 0.002]}>
      <meshStandardMaterial color={lettering.colour} roughness={0.4} metalness={0} />
    </mesh>
  );
}

/** The prototype's lights, with the two key lights swung by `keyAzimuth`. */
function Lights({ lighting }: { lighting: LightingConfig }) {
  const swing = (x: number, y: number, z: number): [number, number, number] => {
    const a = lighting.keyAzimuth * DEG;
    return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
  };
  return (
    <>
      <ambientLight intensity={lighting.ambient} />
      <directionalLight position={swing(10, -2, 5)} intensity={lighting.key} />
      <directionalLight position={swing(10, 5, 5)} intensity={lighting.key} />
      <directionalLight position={[-4, 4, -4]} intensity={lighting.fill} />
      {lighting.environment !== 'none' && (
        <Environment preset={lighting.environment} environmentIntensity={lighting.environmentIntensity} />
      )}
    </>
  );
}

function CameraRig({ camera: config }: { camera: CameraConfig }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useEffect(() => {
    // react-three-fiber hands out the live three.js camera, which is mutable by
    // design: moving it in an effect is the library's own pattern.
    // eslint-disable-next-line react-hooks/immutability
    camera.fov = config.fov;
    camera.position.set(0, 0, config.distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, config.fov, config.distance]);
  return null;
}

/** Hands the parent a function that renders the current view to a PNG at `scale` × resolution. */
function Capture({ onReady }: { onReady: (capture: (scale: number) => string) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    onReady((scale) => {
      const previous = gl.getPixelRatio();
      gl.setPixelRatio(scale);
      gl.render(scene, camera);
      const url = gl.domElement.toDataURL('image/png');
      gl.setPixelRatio(previous);
      gl.render(scene, camera);
      return url;
    });
  }, [gl, scene, camera, onReady]);
  return null;
}

export interface StackSceneProps {
  config: ThreeConfig;
  font: Font;
  /** Spin the slabs (each slab n at n + 1 times the front slab's rate). */
  animate: boolean;
  orbit: boolean;
  onCaptureReady: (capture: (scale: number) => string) => void;
}

/** The slab stack, lights and camera; rendered inside a react-three-fiber <Canvas>. */
export function StackScene({ config, font, animate, orbit, onCaptureReady }: StackSceneProps) {
  const { stack, slab, material, lighting, camera, lettering, motion } = config;
  const geometry = useSlabGeometry(slab);
  const slabs = useMemo(() => placeSlabs(stack, slab, material), [stack, slab, material]);
  const meshes = useRef<(Mesh | null)[]>([]);
  const spin = useRef<number[]>([]);

  useFrame((_, delta) => {
    if (!animate || motion.speed === 0) return;
    slabs.forEach((placement, i) => {
      spin.current[i] = (spin.current[i] ?? 0) + delta * motion.speed * DEG * (i + 1);
      const mesh = meshes.current[i];
      if (mesh) mesh.rotation.z = placement.rotation + (spin.current[i] ?? 0);
    });
  });

  return (
    <>
      <CameraRig camera={camera} />
      <Lights lighting={lighting} />
      <group rotation={[stack.tiltX * DEG, stack.tiltY * DEG, 0]} scale={stack.scale}>
        {slabs.map((placement, i) => (
          <mesh
            key={placement.index}
            ref={(mesh) => {
              meshes.current[i] = mesh;
              // Set here rather than as a prop, which would read the spin ref
              // during render. The callback is new on every render, so this
              // runs on each commit and a re-render mid-spin doesn't snap back.
              if (mesh) mesh.rotation.z = placement.rotation + (spin.current[i] ?? 0);
            }}
            geometry={geometry}
            position={placement.position as [number, number, number]}
            scale={placement.scale as [number, number, number]}
          >
            <meshStandardMaterial
              color={material.colour}
              metalness={material.metalness}
              roughness={material.roughness}
              transparent
              opacity={placement.opacity}
            />
            {i === 0 && lettering.show && <Lettering font={font} slab={slab} lettering={lettering} />}
          </mesh>
        ))}
      </group>
      {orbit && <OrbitControls makeDefault />}
      <Capture onReady={onCaptureReady} />
    </>
  );
}
