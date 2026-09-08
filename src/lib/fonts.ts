import { Playfair_Display, Inter, Tajawal } from "next/font/google";

/**
 * Typography system:
 * - Playfair Display → editorial headings (EN/ES)
 * - Inter → UI/body (EN/ES)
 * - Tajawal → Arabic headings + body (high-quality Arabic UI typeface)
 *
 * Fonts are self-hosted at build time via next/font (no third-party runtime
 * requests, no layout shift, automatic font-display: swap).
 */
export const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
});

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-tajawal",
});

export const fontVariables = `${playfair.variable} ${inter.variable} ${tajawal.variable}`;
