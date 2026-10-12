import type { Box, PathShape, Point } from '../../../shared';
import { emptyBox, unionBox } from '../../../shared';
import { placeSlabs, type SlabPlacement } from '../../three/stack';
import type { ProjectedConfig } from './config';
import { hexToLinear, luminance, shade, srgbToHex, toDisplay, type DirectionalLight, type Rgb } from './shading';
import { slabFaces, type SlabFace } from './slab';
import {
  add,
  centroid,
  dot,
  mul,
  normalize,
  polygonNormal,
  rotateX,
  rotateY,
  rotateZ,
  scale,
  sub,
  type Vec3,
} from './vec';

const DEG = Math.PI / 180;

/** One polygon of the drawing, in SVG units (y down), ready to paint. */
export interface ProjectedFace {
  type: 'face';
  id: string;
  slab: number;
  kind: SlabFace['kind'];
  points: Point[];
  /** Colour at the face's centre (sRGB hex); the fill when there is no gradient. */
  fill: string;
  /** A linear gradient between the face's lightest and darkest corners. */
  gradient?: { from: Point; to: Point; fromColour: string; toColour: string };
  opacity: number;
}

/** The tile lettering, mapped onto the front slab's face by an affine transform. */
export interface ProjectedLettering {
  type: 'lettering';
  /** SVG `matrix(a b c d e f)` from the 100-unit lettering tile to the face. */
  matrix: readonly [number, number, number, number, number, number];
  colour: string;
}

export type ProjectedItem = ProjectedFace | ProjectedLettering;

export interface ProjectedEmblem {
  /** Faces and lettering in paint order, back to front. */
  items: ProjectedItem[];
  bounds: Box;
  /** The glyph outlines the lettering item refers to (in the 100-unit tile). */
  lettering: PathShape[];
}

/** SVG units per unit of normalised device coordinates: the view spans ±100. */
const VIEW = 100;

/** The scene's lights, as in the 3D concept (`Scene.tsx`): fixed in the world. */
function sceneLights(lighting: ProjectedConfig['lighting']): DirectionalLight[] {
  const a = lighting.keyAzimuth * DEG;
  const swing = ([x, y, z]: Vec3): Vec3 => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
  return [
    { direction: normalize(swing([10, -2, 5])), intensity: lighting.key },
    { direction: normalize(swing([10, 5, 5])), intensity: lighting.key },
    { direction: normalize([-4, 4, -4]), intensity: lighting.fill },
  ];
}

/**
 * Places a point of slab `placement` in the world, applying the same
 * transforms as the 3D scene: the slab's scale, turn and position, then
 * the stack's scale and tilt (three's XYZ Euler order).
 */
function toWorld(p: Vec3, placement: SlabPlacement, spin: number, config: ProjectedConfig): Vec3 {
  const { stack } = config;
  let q = mul(p, placement.scale as Vec3);
  q = rotateZ(q, placement.rotation + spin);
  q = add(q, placement.position as Vec3);
  q = scale(q, stack.scale);
  q = rotateY(q, stack.tiltY * DEG);
  return rotateX(q, stack.tiltX * DEG);
}

/**
 * The 3D concept's stack as flat polygons: each slab face is transformed,
 * culled if it faces away, shaded like `MeshStandardMaterial` under the
 * scene's lights (tone mapped and sRGB-encoded as react-three-fiber does),
 * projected through the perspective camera and ordered back to front.
 *
 * `spins` adds a turn (radians) to each slab, for animation.
 */
export function buildProjectedEmblem(
  config: ProjectedConfig,
  lettering: PathShape[] = [],
  spins: readonly number[] = [],
): ProjectedEmblem {
  const { slab, material, lighting, camera, projection } = config;
  const placements = placeSlabs(config.stack, slab, material);
  const faces = slabFaces(slab);
  const lights = sceneLights(lighting);
  const ambient = lighting.ambient;
  const surface = {
    colour: hexToLinear(material.colour),
    metalness: material.metalness,
    roughness: material.roughness,
  };
  const cameraPosition: Vec3 = [0, 0, camera.distance];
  const focal = 1 / Math.tan((camera.fov * DEG) / 2);
  const project = (p: Vec3): Point => {
    const depth = cameraPosition[2] - p[2];
    return { x: ((p[0] * focal) / depth) * VIEW, y: (-(p[1] * focal) / depth) * VIEW };
  };
  const colourAt = (n: Vec3, p: Vec3): Rgb =>
    toDisplay(shade(surface, n, normalize(sub(cameraPosition, p)), lights, ambient), projection.exposure);

  const slabs = placements.map((placement, i) => {
    const spin = spins[i] ?? 0;
    const centre = toWorld([0, 0, 0], placement, spin, config);
    const drawn: ProjectedItem[] = [];
    let front: { points: Point[]; normal: Vec3; centre: Vec3 } | undefined;

    faces.forEach((face, f) => {
      const world = face.points.map((p) => toWorld(p, placement, spin, config));
      const mid = centroid(world);
      let normal = polygonNormal(world);
      if (dot(normal, sub(mid, centre)) < 0) normal = scale(normal, -1);
      const facing = dot(normal, sub(cameraPosition, mid)) > 0;
      if (!facing && !projection.backFaces) return;
      // A face seen from behind is lit from its inner side.
      const litNormal = facing ? normal : scale(normal, -1);
      const points = world.map(project);
      const corners = world.map((p) => colourAt(litNormal, p));
      const centreColour = colourAt(litNormal, mid);
      let gradient: ProjectedFace['gradient'];
      if (projection.gradients) {
        let best = { i: 0, j: 0, diff: 0 };
        corners.forEach((a, ai) =>
          corners.forEach((b, bi) => {
            const diff = luminance(a) - luminance(b);
            if (diff > best.diff) best = { i: ai, j: bi, diff };
          }),
        );
        if (best.diff >= projection.gradientThreshold) {
          gradient = {
            from: points[best.i] as Point,
            to: points[best.j] as Point,
            fromColour: srgbToHex(corners[best.i] as Rgb),
            toColour: srgbToHex(corners[best.j] as Rgb),
          };
        }
      }
      if (face.kind === 'front' && facing) front = { points, normal, centre: mid };
      drawn.push({
        type: 'face',
        id: `slab-${placement.index}-face-${f}`,
        slab: placement.index,
        kind: face.kind,
        points,
        fill: srgbToHex(centreColour),
        gradient,
        opacity: placement.opacity,
      });
    });

    // Within a slab, paint faces seen from behind first.
    drawn.sort(
      (a, b) => Number(a.type === 'face' && a.kind !== 'back') - Number(b.type === 'face' && b.kind !== 'back'),
    );

    if (placement.index === 0 && config.lettering.show && front && lettering.length > 0) {
      // Lettering tile (u, v) in [-50, 50], y down → the front face's corners:
      // ring order is (-r,-r), (r,-r), (r,r), (-r,r) with y up.
      const [p0, , p2, p3] = front.points as [Point, Point, Point, Point];
      const a = (p2.x - p3.x) / 100;
      const b = (p2.y - p3.y) / 100;
      const c = (p0.x - p3.x) / 100;
      const d = (p0.y - p3.y) / 100;
      drawn.push({
        type: 'lettering',
        matrix: [a, b, c, d, p3.x + 50 * a + 50 * c, p3.y + 50 * b + 50 * d],
        // Lit like the 3D scene's lettering: a matt, non-metallic material.
        colour: srgbToHex(
          toDisplay(
            shade(
              { colour: hexToLinear(config.lettering.colour), metalness: 0, roughness: 0.4 },
              front.normal,
              normalize(sub(cameraPosition, front.centre)),
              lights,
              ambient,
            ),
            projection.exposure,
          ),
        ),
      });
    }
    return { depth: centre[2], drawn };
  });

  // three.js sorts transparent objects back to front by their centres.
  slabs.sort((a, b) => a.depth - b.depth);
  const items = slabs.flatMap((s) => s.drawn);
  const bounds = items.reduce(
    (box, item) =>
      item.type === 'face'
        ? item.points.reduce((b, p) => unionBox(b, { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y }), box)
        : box,
    emptyBox(),
  );
  return { items, bounds, lettering };
}
