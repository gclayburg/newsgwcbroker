// Site logo shown in the header: the same newspaper artwork as the browser-tab
// icon. Keep it in sync with src/app/icon.svg (and favicon.ico/apple-icon.png).
// Inlined so it paints with the page, with no extra request.
export function SiteLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="28"
      height="28"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill="#1c2430" />
      <path d="M8 22a3 3 0 0 1 3-3h8v29h-3a4 4 0 0 1-8 0z" fill="#c9d1dc" />
      <path
        d="M19 15a3 3 0 0 1 3-3h32a3 3 0 0 1 3 3v34a3 3 0 0 1-3 3H12a4 4 0 0 0 4-4h3z"
        fill="#ffffff"
      />
      <rect x="24" y="17" width="28" height="6" rx="1" fill="#1c2430" />
      <rect x="24" y="27" width="12" height="11" rx="1" fill="#c2410c" />
      <rect x="39" y="27" width="13" height="3" rx="1.5" fill="#7b8696" />
      <rect x="39" y="33" width="13" height="3" rx="1.5" fill="#7b8696" />
      <rect x="24" y="41" width="28" height="3" rx="1.5" fill="#7b8696" />
      <rect x="24" y="46" width="20" height="3" rx="1.5" fill="#7b8696" />
    </svg>
  );
}
