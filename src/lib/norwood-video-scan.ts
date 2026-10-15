import { z } from "zod";
import { NORWOOD_VIEWS, type NorwoodView } from "./norwood-assessment";

export const NORWOOD_SCAN_VIEWS = { upper: ["front", "top", "crown"], sides: ["left", "right"] } as const;
export type NorwoodScan = keyof typeof NORWOOD_SCAN_VIEWS;
export type NorwoodScanSelection = { view: NorwoodView; frame: number }[];
export const NORWOOD_SCAN_SECONDS = 8;
export const NORWOOD_SCAN_MAX_FRAMES = 12;

export function nextNorwoodScan(saved: readonly NorwoodView[]): NorwoodScan {
  return NORWOOD_SCAN_VIEWS.upper.every(v => saved.includes(v)) ? "sides" : "upper";
}
export function pendingScanViews(scan: NorwoodScan, saved: readonly NorwoodView[]): NorwoodView[] {
  return NORWOOD_SCAN_VIEWS[scan].filter(v => !saved.includes(v));
}
export function parseNorwoodScanSelection(raw: string, requested: readonly NorwoodView[], frameCount: number): NorwoodScanSelection {
  const result = z.object({ selected: z.array(z.object({ view: z.enum(NORWOOD_VIEWS), frame: z.number().int().min(0).max(frameCount - 1) }).strict()).max(5) }).strict().parse(JSON.parse(raw));
  if (new Set(result.selected.map(p => p.view)).size !== result.selected.length || new Set(result.selected.map(p => p.frame)).size !== result.selected.length || result.selected.some(p => !requested.includes(p.view))) throw new Error("Invalid scan selection");
  return requested.flatMap(view => result.selected.filter(p => p.view === view));
}
