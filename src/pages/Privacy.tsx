const Privacy = () => {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <a href="#/" className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white">
          ← Back to home
        </a>
        
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-zinc-400">Last updated: May 22, 2026</p>

        <section className="mt-12 space-y-10 text-white/90">
          <div>
            <h2 className="text-2xl font-semibold">1. Our Philosophy</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              At Continuum, we deeply respect your personal information. Your notes and knowledge are yours — 
              we exist to help you organize your life and thoughts, not to exploit your data.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              We collect the information you provide while using the app: your notes, entities, relationships, 
              time tracking data, and technical information needed to run the service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">3. How We Use Your Data</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              We use your data to:
              <br />• Provide and maintain your workspace
              <br />• Generate personal insights and connections
              <br />• Improve the performance and security of the app
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">4. Data Sharing</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              We do not sell your personal data. We only share information with trusted service providers 
              (such as hosting and analytics) when necessary, under strict confidentiality agreements.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">5. Your Rights</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              You can request access to, correction, or deletion of your data at any time. 
              Just contact us and we will respond promptly.
            </p>
          </div>
        </section>

        <p className="mt-16 text-sm text-zinc-500">
          Any questions about your privacy? Reach out to continuumnodes@gmail.com
        </p>
      </div>
    </div>
  );
};

export default Privacy;
