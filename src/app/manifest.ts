import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";
import { faviconSet } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  const fav = faviconSet();
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.slogan,
    start_url: "/en/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0D2B45",
    icons: fav.manifestIcons,
  };
}
