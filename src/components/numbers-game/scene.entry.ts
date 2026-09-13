// Browser-only entry for the 3D network map. Compiled by `bun run build:scene`
// into public/ops/scene.<hash>.js and loaded by the page at runtime, so the
// app build never has to bundle WebGL code.
import { TownScene } from "./scene";

declare global {
  interface Window { __HTG_SCENE__?: { TownScene: typeof TownScene } }
}
window.__HTG_SCENE__ = { TownScene };
