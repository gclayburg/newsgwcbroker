"use client";

import { useState } from "react";

const btn =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subtle sm:px-3";

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  download: "M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 19h16",
  link: "M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5",
  check: "M20 6 9 17l-5-5",
  // A pull handle: an arched grip on two mounting feet.
  handle: "M6 17v-5a6 6 0 0 1 12 0v5M3.5 17h5M15.5 17h5",
  sun: "M12 3v1.5M12 19.5V21M4.6 4.6l1.1 1.1M18.3 18.3l1.1 1.1M3 12h1.5M19.5 12H21M4.6 19.4l1.1-1.1M18.3 5.7l1.1-1.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z",
};

/** Opens the browser print dialog; choose "Save as PDF" as the destination. */
export function PrintButton() {
  return (
    <button
      type="button"
      className={btn}
      onClick={() => window.print()}
      title="Opens your browser's print dialog. Choose Save as PDF as the destination."
    >
      <Icon d={ICONS.download} />
      <span className="hidden sm:inline">Download PDF</span>
      <span className="sr-only sm:hidden">Download PDF</span>
    </button>
  );
}

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable (permissions, insecure context); ignore.
    }
  }
  return (
    <button type="button" className={btn} onClick={copy}>
      <Icon d={copied ? ICONS.check : ICONS.link} />
      <span className="hidden sm:inline" aria-live="polite">
        {copied ? "Copied" : "Copy link"}
      </span>
      <span className="sr-only sm:hidden">Copy link</span>
    </button>
  );
}

/** Opens the Private Handle page that offers to add this site as a handle. */
export function AddHandleButton() {
  return (
    <a href="https://demo1.privatehandle.com/open#news.gwcbroker.com" className={btn} title="Add news.gwcbroker.com as a handle">
      <Icon d={ICONS.handle} />
      <span className="hidden sm:inline">Add handle</span>
      <span className="sr-only sm:hidden">Add handle</span>
    </a>
  );
}

/**
 * Light/dark toggle. Starts from the OS preference; a click stores an explicit
 * choice. Which icon shows is decided purely by CSS (see globals.css), so the
 * server and client render identical markup.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current =
      root.getAttribute("data-theme") ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage may be blocked; the choice then lasts for this page view only.
    }
  }
  return (
    <button
      type="button"
      className={btn}
      onClick={toggle}
      aria-label="Toggle light or dark theme"
      title="Toggle light or dark theme"
    >
      <Icon d={ICONS.moon} className="icon-moon" />
      <Icon d={ICONS.sun} className="icon-sun" />
    </button>
  );
}
