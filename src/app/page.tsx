export default function Home() {
  return (
    <main className="relative isolate flex min-h-screen flex-1 items-center justify-center overflow-hidden px-6">
      {/* Animated aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-aurora absolute -left-1/4 -top-1/4 h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.45),transparent_60%)] blur-3xl" />
        <div className="animate-aurora absolute -bottom-1/4 -right-1/4 h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.4),transparent_60%)] blur-3xl [animation-delay:-6s]" />
        <div className="animate-aurora absolute left-1/3 top-1/2 h-[45vmax] w-[45vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.3),transparent_60%)] blur-3xl [animation-delay:-12s]" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <section className="animate-fade-up w-full max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center shadow-[0_0_80px_-20px_rgba(124,58,237,0.5)] backdrop-blur-xl sm:p-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>

        <h1 className="animate-shimmer mt-8 bg-[linear-gradient(90deg,#c4b5fd,#7dd3fc,#f9a8d4,#c4b5fd)] bg-[length:200%_auto] bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-7xl">
          Hello News World
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60">
          The front page is warming up. Stories are on their way.
        </p>

        <div className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </section>
    </main>
  );
}
