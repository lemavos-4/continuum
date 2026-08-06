export default function About() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <a
          href="#/"
          className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white"
        >
          ← Back to home
        </a>

        <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">About</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-white sm:text-5xl">About Continuum</h1>
        <p className="mt-4 text-sm text-white/50">Your second brain, without the friction.</p>

        <section className="mt-12 space-y-10 text-white/90">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-white">What is Continuum?</h2>
            <p className="mt-3 text-sm leading-7 text-white/50">
              Continuum is a modern knowledge management platform designed to help you capture, connect,
              and rediscover your ideas at the speed of thought. Notes link themselves through mentions and
              topics, building a living graph of everything you care about.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl tracking-tight text-white">Our philosophy</h2>
            <p className="mt-3 text-sm leading-7 text-white/50">
              No folder mess, no rigid hierarchy — just pure flow. Your most relevant notes and entities
              resurface automatically based on how you actually use them, so your knowledge works for you.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-2xl tracking-tight text-white">Built to last</h2>
            <p className="mt-3 text-sm leading-7 text-white/50">
              Native sync across every device, full offline support, and a design that stays out of your way.
              Continuum is here to grow with your thinking over time.
            </p>
          </div>
        </section>

        <div className="mt-16 flex flex-wrap gap-4">
          <a
            href="#/support"
            className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.02] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-white/80 rounded-sm transition hover:border-white/40 hover:text-white"
          >
            Visit the support center →
          </a>
          <a
            href="#/pricing"
            className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.02] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-white/80 rounded-sm transition hover:border-white/40 hover:text-white"
          >
            See pricing →
          </a>
        </div>

        <p className="mt-16 text-sm text-white/40">
          Get in touch at{" "}
          <a href="mailto:contact@continuum.onl" className="font-medium text-white hover:underline">
            contact@continuum.onl
          </a>
          .
        </p>
      </div>
    </div>
  );
}
