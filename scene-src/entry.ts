// Browser-only entry for the 3D network map. `bun run build:scene` compiles
// this into public/ops/scene.<hash>.js, which the page loads at runtime.
// Nothing under src/ imports this, so the app build never sees three.js.
import { TownScene } from "./scene";
import type { TownSceneCtor } from "../src/components/numbers-game/scene-types";

declare global { interface Window { __HTG_SCENE__?: { TownScene: TownSceneCtor } } }
window.__HTG_SCENE__ = { TownScene };
