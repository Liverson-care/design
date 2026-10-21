import type { PackType } from "@/lib/types";

/** Pictogrammes des types d'emballage (trait, 48 × 48) */
const PATHS: Record<PackType, string> = {
  etiquette: "M14 8h20v5H14z|M12 13h24v28a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z|M12 20h24v14H12z",
  etui: "M10 14l14-6 14 6v22l-14 6-14-6z|M10 14l14 6 14-6|M24 20v22",
  fourreau: "M8 18h32v14H8z|M8 18l6-5h32l-6 5|M40 32l6-5V13",
  sachet: "M14 6h20l2 6v28a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V12z|M12 12h24|M18 22h12",
  autre: "M8 30l16-8 16 8-16 8z|M8 30v6l16 8 16-8v-6|M24 38v6",
};

export function PackIcon({ type, size = 40 }: { type: PackType; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" aria-hidden>
      {PATHS[type].split("|").map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
