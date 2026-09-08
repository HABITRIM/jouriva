// Root 404 for paths that never matched a locale (rendered OUTSIDE the
// [locale] layout, so it carries its own minimal document shell).
export default function RootNotFound() {
  return (
    <html lang="en" dir="ltr">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fff", color: "#1A1A1A", margin: 0 }}>
        <div style={{ maxWidth: "36rem", margin: "0 auto", padding: "6rem 1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "3.5rem", fontWeight: 900, color: "#C86845", margin: 0 }}>404</p>
          <h1 style={{ fontSize: "1.4rem", color: "#0D2B45" }}>Page not found</h1>
          <p style={{ color: "#4A4A48" }}>Página no encontrada · الصفحة غير موجودة</p>
          <p style={{ marginTop: "2rem" }}>
            <a
              href="/en/"
              style={{ display: "inline-block", background: "#0D2B45", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "999px", textDecoration: "none", fontWeight: 700 }}
            >
              JOURIVA — Home
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
