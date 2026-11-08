// Inline <script> that runs during HTML parsing (before first paint) without
// React's "script tag while rendering" warning: on the client the type becomes
// text/plain, and suppressHydrationWarning accepts the server's attribute.
// Pattern from the Next.js guide "Preventing flash before hydration".
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
