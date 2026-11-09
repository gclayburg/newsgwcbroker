import Link from "next/link";
import {
  AddHandleButton,
  CopyLinkButton,
  PrintButton,
  ThemeToggle,
} from "@/components/header-actions";
import { SiteLogo } from "@/components/site-logo";
import { CONTENT_DIR, IS_SANDBOX } from "@/lib/editions";
import { SITE_NAME } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-border bg-header backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-tight"
        >
          <SiteLogo className="size-7 shrink-0" />
          <span className="truncate">{SITE_NAME}</span>
        </Link>
        {IS_SANDBOX && (
          <span
            className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-black"
            title={`Reading test editions from ${CONTENT_DIR}`}
          >
            Sandbox
          </span>
        )}
        <nav aria-label="Page actions" className="ml-auto flex items-center gap-0.5">
          <Link
            href="/editions"
            className="rounded-full px-2.5 py-1.5 text-sm text-muted sm:px-3 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            Archive
          </Link>
          <PrintButton />
          <CopyLinkButton />
          <AddHandleButton />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 text-sm text-subtle sm:px-6">
      <div className="border-t border-border pt-6">
        Headlines link to the original reporting from each outlet.
      </div>
    </footer>
  );
}
