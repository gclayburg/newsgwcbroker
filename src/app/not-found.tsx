import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-muted">That edition or page doesn&apos;t exist.</p>
      <p className="mt-6 flex gap-4 text-sm">
        <Link href="/" className="underline underline-offset-4">
          Latest edition
        </Link>
        <Link href="/editions" className="underline underline-offset-4">
          Archive
        </Link>
      </p>
    </main>
  );
}
