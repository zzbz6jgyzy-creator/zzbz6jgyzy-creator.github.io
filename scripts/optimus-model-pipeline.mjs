// One-off asset pipeline for assets/3d/optimus.glb. Not run in CI.
// Source: "Tesla Optimus Gen 3" by Michael (sketchfab.com/gmmichaelonearth), CC BY 4.0,
// stored as the release asset optimus-model-source/tesla-optimus-gen-3.zip.
// Run from a scratch folder with:
//   npm i --no-save @gltf-transform/core@4.5.1 @gltf-transform/functions@4.5.1 @gltf-transform/extensions@4.5.1 \
//     meshoptimizer@0.22.0 draco3dgltf@1.5.9 sharp@0.35.5
//   node optimus-model-pipeline.mjs <source.glb> <out.glb>
// Steps: bake the node rotation, cut the single fused mesh into 17 body parts at the joints,
// simplify each part, re-encode textures as WebP and compress geometry with Draco.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, dedup, prune, draco, clearNodeTransform, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const [src, out] = process.argv.slice(2);
if (!src || !out) throw Error('usage: node optimus-model-pipeline.mjs <source.glb> <out.glb>');

// Joint landmarks in model units after baking (Y up, 0 = soles, 1.17 = head top).
export const CUT = { neck: 1.025, shoulder: 0.975, armX: 0.118, elbow: 0.735, wrist: 0.605, chest: 0.82, waist: 0.70, hip: 0.60, knee: 0.31, ankle: 0.075, neckX: 0.06 };
export function region(x, y) {
  const side = x < 0 ? 'R' : 'L'; // the robot's right is the viewer's left (negative x)
  if (y > CUT.neck) return 'head';
  if (y > CUT.shoulder) return Math.abs(x) < CUT.neckX ? 'neck' : 'chest';
  if (Math.abs(x) > CUT.armX && y > 0.47) return y > CUT.elbow ? 'upperArm' + side : y > CUT.wrist ? 'forearm' + side : 'hand' + side;
  if (y > CUT.chest) return 'chest';
  if (y > CUT.waist) return 'waist';
  if (y > CUT.hip) return 'pelvis';
  if (y > CUT.knee) return 'thigh' + side;
  if (y > CUT.ankle) return 'shin' + side;
  return 'foot' + side;
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.encoder': await draco3d.createEncoderModule() });
const doc = await io.read(src);
const root = doc.getRoot(), scene = root.listScenes()[0], node = root.listNodes()[0];
clearNodeTransform(node);
await doc.transform(weld());
const mesh = node.getMesh(), prim = mesh.listPrimitives()[0];
const pos = prim.getAttribute('POSITION'), idx = prim.getIndices().getArray();
const groups = {};
const a = [], b = [], c = [];
for (let t = 0; t < idx.length; t += 3) {
  pos.getElement(idx[t], a); pos.getElement(idx[t + 1], b); pos.getElement(idx[t + 2], c);
  const id = region((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3);
  (groups[id] ||= []).push(idx[t], idx[t + 1], idx[t + 2]);
}
const buffer = root.listBuffers()[0];
for (const [id, list] of Object.entries(groups).sort()) {
  const p = prim.clone().setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(list)).setBuffer(buffer));
  compactPrimitive(p);
  const m = doc.createMesh(id).addPrimitive(p);
  scene.addChild(doc.createNode(id).setMesh(m));
  console.log(id.padEnd(10), (list.length / 3).toLocaleString('en-GB'), 'triangles');
}
node.dispose(); mesh.dispose();
await MeshoptSimplifier.ready;
await doc.transform(
  prune(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.15, error: 0.0004, lockBorder: true }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], slots: /^baseColor/, quality: 82 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], slots: /^(normal|metallicRoughness)/, quality: 85 }),
  dedup(), prune(),
  draco({ method: 'edgebreaker', quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
);
let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += p.getIndices().getCount() / 3;
console.log('total', tris.toLocaleString('en-GB'), 'triangles');
await io.write(out, doc);
