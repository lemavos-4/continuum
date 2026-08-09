import { useLanguage } from "@/contexts/LanguageContext";

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <a
          href="#/"
          className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white"
        >
          {t("lp_about_back_to_home")}
        </a>

        <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">{t("lp_about_eyebrow")}</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-white sm:text-5xl">
          {t("lp_about_title")}
        </h1>
        <p className="mt-4 text-sm text-white/50">{t("lp_about_subtitle")}</p>

        <section className="mt-12 space-y-10 text-white/90">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-white">{t("lp_about_section_1_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-white/50">{t("lp_about_section_1_body")}</p>
          </div>

          <div>
            <h2 className="font-serif text-2xl tracking-tight text-white">{t("lp_about_section_2_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-white/50">{t("lp_about_section_2_body")}</p>
          </div>

          <div>
            <h2 className="font-serif text-2xl tracking-tight text-white">{t("lp_about_section_3_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-white/50">{t("lp_about_section_3_body")}</p>
          </div>
        </section>

        <div className="mt-16 flex flex-wrap gap-4">
          <a
            href="#/support"
            className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.02] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-white/80 rounded-sm transition hover:border-white/40 hover:text-white"
          >
            {t("lp_about_support_cta")}
          </a>
          <a
            href="#/pricing"
            className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.02] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-white/80 rounded-sm transition hover:border-white/40 hover:text-white"
          >
            {t("lp_about_pricing_cta")}
          </a>
        </div>

        <p className="mt-16 text-sm text-white/40">
          {t("lp_about_contact")}{" "}
          <a href="mailto:contact@continuum.onl" className="font-medium text-white hover:underline">
            contact@continuum.onl
          </a>
          .
        </p>
      </div>
    </div>
  );
}
