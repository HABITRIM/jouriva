// Root layout is intentionally a passthrough: the document shell
// (<html>/<body>) lives in src/app/[locale]/layout.tsx so that lang/dir are
// set per locale. The root not-found (invalid locale paths) renders its own
// minimal shell.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
