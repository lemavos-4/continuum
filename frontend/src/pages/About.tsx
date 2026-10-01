import { useLanguage } from "@/contexts/LanguageContext";
import AppLogo from "@/components/landing/AppLogo";
import { Button } from "@/components/ui/button";
import type { ComponentType, SVGProps } from "react";
import {
  ArrowUpRight,
  Code,
  Lock,
  HardDrive,
  Activity,
  GlobeAlt,
  Cloud,
  Check,
  ArrowLeft,
} from "@/lib/heroicons";

const GITHUB_URL = "https://github.com/continuumnodes/continuum";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
      {children}
    </h2>
  );
}

function FlowStep({
  icon: IconEl,
  title,
  desc,
  last = false,
}: {
  icon: Icon;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-4">
      {!last && (
        <span className="absolute left-[19px] top-10 h-[calc(100%-2rem)] w-px bg-border" />
      )}
      <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-card">
        <IconEl className="h-4.5 w-4.5 text-muted-foreground" />
      </span>
      <div className="pb-7">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}

export default function About() {
  const { t } = useLanguage();

  const whatPoints = [
    t("ab_what_p1"),
    t("ab_what_p2"),
    t("ab_what_p3"),
    t("ab_what_p4"),
    t("ab_what_p5"),
    t("ab_what_p6"),
    t("ab_what_p7"),
  ];

  const steps = [t("ab_step1"), t("ab_step2"), t("ab_step3"), t("ab_step4")];

  const flow: { icon: Icon; title: string; desc: string }[] = [
    { icon: GlobeAlt, title: t("ab_how_frontend_t"), desc: t("ab_how_frontend_d") },
    { icon: Activity, title: t("ab_how_api_t"), desc: t("ab_how_api_d") },
    { icon: Lock, title: t("ab_how_auth_t"), desc: t("ab_how_auth_d") },
    { icon: HardDrive, title: t("ab_how_db_t"), desc: t("ab_how_db_d") },
    { icon: Cloud, title: t("ab_how_storage_t"), desc: t("ab_how_storage_d") },
  ];

  const techGroups: { label: string; items: string[] }[] = [
    { label: t("ab_tech_backend"), items: ["Java", "Spring Boot", "REST API"] },
    { label: t("ab_tech_frontend"), items: ["React", "TypeScript"] },
    { label: t("ab_tech_data"), items: ["MongoDB"] },
    { label: t("ab_tech_storage"), items: ["Backblaze B2"] },
    { label: t("ab_tech_infra"), items: ["Redis", "Stripe"] },
    { label: t("ab_tech_auth"), items: ["JWT", "Google OAuth"] },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="container mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <AppLogo />
            <span className="font-serif text-[1.05rem] font-semibold tracking-tight text-foreground">
              Continuum
            </span>
          </a>
          <Button variant="ghost" size="sm" asChild>
            <a href="/" className="inline-flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              {t("ab_back_to_home")}
            </a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 sm:px-6">
        {/* Hero */}
        <section className="py-12 sm:py-16">
          <span className="cx-badge cx-badge-accent inline-flex items-center gap-1.5">
            <Code className="h-3.5 w-3.5" />
            {t("ab_badge")}
          </span>
          <h1 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            {t("ab_hero_title")}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
            {t("ab_hero_sub")}
          </p>
        </section>

        {/* What is Continuum */}
        <section className="border-t border-border py-10 sm:py-14">
          <SectionTitle>{t("ab_what_title")}</SectionTitle>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            {t("ab_what_body")}
          </p>

          <ul className="mt-7 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {whatPoints.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s} className="bento-card text-center">
                <span className="eyebrow">0{i + 1}</span>
                <p className="mt-1.5 font-serif text-lg tracking-tight text-foreground">{s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border py-10 sm:py-14">
          <SectionTitle>{t("ab_how_title")}</SectionTitle>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            {t("ab_how_sub")}
          </p>

          <ul className="mt-8">
            {flow.map((f, i) => (
              <FlowStep
                key={f.title}
                icon={f.icon}
                title={f.title}
                desc={f.desc}
                last={i === flow.length - 1}
              />
            ))}
          </ul>
        </section>

        {/* Your data */}
        <section className="border-t border-border py-10 sm:py-14">
          <SectionTitle>{t("ab_data_title")}</SectionTitle>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            {t("ab_data_body1")}
          </p>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground/80">
            {t("ab_data_body2")}
          </p>
          <p className="mt-5 border-l-2 border-border pl-4 text-[13px] leading-6 text-muted-foreground/70">
            {t("ab_data_note")}
          </p>
        </section>

        {/* Open source */}
        <section className="border-t border-border py-10 sm:py-14">
          <SectionTitle>{t("ab_oss_title")}</SectionTitle>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            {t("ab_oss_body")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                {t("ab_oss_cta")}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                {t("ab_oss_contribute")}
              </a>
            </Button>
          </div>
        </section>

        {/* Technology */}
        <section className="border-t border-border py-10 sm:py-14">
          <SectionTitle>{t("ab_tech_title")}</SectionTitle>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {techGroups.map((g) => (
              <div key={g.label}>
                <p className="eyebrow">{g.label}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {g.items.map((item) => (
                    <span key={item} className="bento-tag">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border py-14 sm:py-20">
          <div className="text-center">
            <h2 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
              {t("ab_cta_title")}
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild>
                <a href="/">{t("ab_cta_try")}</a>
              </Button>
              <Button variant="secondary" asChild>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  {t("ab_cta_github")}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="mx-auto mt-8 max-w-xl text-xs leading-5 text-muted-foreground/70">
              {t("ab_disclaimer")}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <AppLogo />
            <span className="font-serif text-sm font-semibold tracking-tight text-foreground">
              Continuum
            </span>
          </a>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a href="/pricing" className="transition-colors hover:text-foreground">{t("lp_footer_pricing")}</a>
            <a href="/support" className="transition-colors hover:text-foreground">{t("lp_footer_support")}</a>
            <a href="/terms" className="transition-colors hover:text-foreground">{t("lp_footer_terms")}</a>
            <a href="/privacy" className="transition-colors hover:text-foreground">{t("lp_footer_privacy")}</a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
