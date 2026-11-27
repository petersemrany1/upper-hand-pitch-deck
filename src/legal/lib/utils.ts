// Ported from the Legal app (family-law-floater/src/lib/utils.ts). Re-run the port script to refresh.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
