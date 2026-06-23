const Terms = () => {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <a href="#/" className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white">
          ← Back to home
        </a>
        
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Terms of Service</h1>
        <p className="mt-4 text-sm text-zinc-400">Last updated: May 22, 2026</p>

        <section className="mt-12 space-y-10 text-white/90">
          <div>
            <h2 className="text-2xl font-semibold">1. Welcome to Continuum</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              Continuum is a personal knowledge app designed to help you capture, connect, and understand your notes, 
              people, projects and ideas over time. By using Continuum, you agree to these Terms of Service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">2. Your Content</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              You own all the content you create in Continuum — your notes, entities, relationships and knowledge graph. 
              We only store and process your data to provide the service, generate insights and keep everything working.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">3. Acceptable Use</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              You may not use Continuum for any illegal, abusive, or harmful activities. 
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">4. Changes to the Service</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              We are constantly improving Continuum. We may add, modify or remove features. 
              Significant changes will be communicated to you.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">5. Termination</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              You can stop using Continuum at any time. We may also suspend or terminate your access if you breach these terms.
            </p>
          </div>
        </section>

        <p className="mt-16 text-sm text-zinc-500">
          If you have any questions about these Terms, feel free to contact us at continuumnodes@gmail.com
        </p>
      </div>
    </div>
  );
};

export default Terms;
