import type { Tone, Town } from "./model";

/**
 * The contract between the page and the 3D map. The map itself lives in
 * scene-src/ and is compiled to a static script (see scripts/build-scene.sh),
 * so nothing under src/ imports WebGL code.
 */
export type PickKind = "tower" | "bay" | "tank" | "puddle" | "depot" | "meter" | "pump";
export type PickTarget = { kind: PickKind; id: string };
export type LabelSpec = { key: string; x: number; y: number; short: string; title: string; kpis: [string, string][]; tone: Tone; hidden: boolean; active: boolean; kind: PickKind };
export type SceneOpts = { onPick?: (t: PickTarget | null) => void; onLabels?: (labels: LabelSpec[]) => void };

export interface TownSceneApi {
  setTown(town: Town): void;
  deliverBooking(repId: string | null, clinicId: string | null): void;
  setTankFill(clinicId: string, delivered: number, packSize: number): void;
  focus(target: PickTarget | null): void;
  dispose(): void;
}
export type TownSceneCtor = new (container: HTMLElement, opts?: SceneOpts) => TownSceneApi;

declare global {
  interface Window { __HTG_SCENE__?: { TownScene: TownSceneCtor } }
}

