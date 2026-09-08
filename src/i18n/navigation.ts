import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation helpers. <Link href="/morocco/"> automatically
// prefixes the active locale: /ar/morocco/, /en/morocco/, /es/morocco/ ...
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
