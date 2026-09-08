/**
 * Ad-slot architecture (Phase 1: placement registry + placeholder rendering).
 *
 * Real ad providers (Phase 3+) plug into the AdSlot component by mapping a
 * placement key to a provider unit — the layout never changes. Reserved
 * sizes below prevent layout shift (CLS) because the slot reserves its
 * final height before any creative loads.
 */

export type AdPlacementKey =
  | "header"
  | "sidebar"
  | "inContent"
  | "betweenSections"
  | "mobile"
  | "mobileSticky";

export interface AdSlotConfig {
  label: string;
  sizes: { w: number; h: number }[];
  /** CSS min-height used to reserve space and avoid CLS. */
  reserve: string;
}

export const AD_SLOTS: Record<AdPlacementKey, AdSlotConfig> = {
  header: { label: "Header leaderboard", sizes: [{ w: 728, h: 90 }, { w: 320, h: 100 }], reserve: "90px" },
  sidebar: { label: "Sidebar MPU", sizes: [{ w: 300, h: 250 }], reserve: "250px" },
  inContent: { label: "In-content", sizes: [{ w: 336, h: 280 }, { w: 320, h: 100 }], reserve: "280px" },
  betweenSections: { label: "Between sections", sizes: [{ w: 728, h: 90 }, { w: 320, h: 100 }], reserve: "90px" },
  mobile: { label: "Mobile banner", sizes: [{ w: 320, h: 100 }], reserve: "100px" },
  mobileSticky: { label: "Sticky mobile", sizes: [{ w: 320, h: 50 }], reserve: "50px" },
};

/** Phase 1 demo toggle (NEXT_PUBLIC_ADS_DEMO). Real providers arrive later. */
export function adsDemoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADS_DEMO !== "false";
}
