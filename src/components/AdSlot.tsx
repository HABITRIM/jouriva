import { getTranslations } from "next-intl/server";
import { AD_SLOTS, adsDemoEnabled, type AdPlacementKey } from "@/lib/ads";

/**
 * Ad-slot component (Phase 1 foundation).
 *  - Reserved space prevents layout shift (CLS) before creatives load.
 *  - `mobileSticky` renders a fixed bottom strip on small screens only.
 *  - Phase 3: provider integration maps placement key → provider unit;
 *    the surrounding layout and reserved sizes remain untouched.
 *  - Demo rendering is controlled by NEXT_PUBLIC_ADS_DEMO (see .env.example).
 */
export async function AdSlot({
  placement,
  className = "",
}: {
  placement: AdPlacementKey;
  className?: string;
}) {
  const t = await getTranslations("common");
  const config = AD_SLOTS[placement];
  if (!adsDemoEnabled()) return null;

  const isSticky = placement === "mobileSticky";
  const maxH = Math.max(...config.sizes.map((s) => s.h));

  const frame = (
    <aside
      aria-label={t("adsLabel")}
      className={`${isSticky ? "fixed inset-x-0 bottom-0 z-40 md:hidden" : ""} ${className}`}
    >
      <div
        className="ad-frame w-full"
        style={{ minHeight: config.reserve, maxHeight: maxH }}
        data-ad-placement={placement}
        data-ad-sizes={config.sizes.map((s) => `${s.w}x${s.h}`).join(",")}
      >
        <span className="px-3">
          {t("demoAd", { label: config.label })}
          <br />
          <span className="normal-case">{t("demoAdNote")}</span>
        </span>
      </div>
    </aside>
  );

  return frame;
}
