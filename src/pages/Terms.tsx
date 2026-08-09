import { useLanguage } from "@/contexts/LanguageContext";

const Terms = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <a href="#/" className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white">
          {t("lp_terms_back_to_home")}
        </a>

        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{t("lp_terms_title")}</h1>
        <p className="mt-4 text-sm text-zinc-400">{t("lp_terms_last_updated")}</p>

        <section className="mt-12 space-y-10 text-white/90">
          <div>
            <h2 className="text-2xl font-semibold">{t("lp_terms_section_1_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_terms_section_1_body")}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("lp_terms_section_2_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_terms_section_2_body")}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("lp_terms_section_3_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_terms_section_3_body")}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("lp_terms_section_4_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_terms_section_4_body")}</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("lp_terms_section_5_title")}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{t("lp_terms_section_5_body")}</p>
          </div>
        </section>

        <p className="mt-16 text-sm text-zinc-500">
          {t("lp_terms_contact")}{" "}
          <a href="mailto:contact@continuum.onl" className="underline underline-offset-4 transition hover:text-white">
            contact@continuum.onl
          </a>
        </p>
      </div>
    </div>
  );
};

export default Terms;
