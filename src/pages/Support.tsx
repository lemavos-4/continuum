import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Mail,
  MessageSquare,
  Bug,
  ChevronDown,
} from "@/lib/heroicons";
import { useLanguage } from "@/contexts/LanguageContext";

const FEEDBACK_EMAIL = "feedback@continuum.onl";
const CONTACT_EMAIL = "contact@continuum.onl";
const BUG_EMAIL = "bugs@continuum.onl";

function mailto(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left normal-case tracking-normal text-sm font-medium text-white/85 hover:bg-white/[0.02]"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>
      {open && (
        <p className="px-5 pb-5 text-sm leading-7 text-white/50">{a}</p>
      )}
    </Card>
  );
}

export default function Support() {
  const { t } = useLanguage();

  const cards = [
    {
      icon: MessageSquare,
      title: t("bill_card_feedback_title"),
      description: t("bill_card_feedback_desc"),
      action: t("bill_card_feedback_action"),
      href: mailto(
        FEEDBACK_EMAIL,
        t("bill_mailto_feedback_subject"),
        t("bill_mailto_feedback_body"),
      ),
    },
    {
      icon: Mail,
      title: t("bill_card_contact_title"),
      description: t("bill_card_contact_desc"),
      action: t("bill_card_contact_action"),
      href: mailto(
        CONTACT_EMAIL,
        t("bill_mailto_contact_subject"),
        t("bill_mailto_contact_body"),
      ),
    },
    {
      icon: Bug,
      title: t("bill_card_bug_title"),
      description: t("bill_card_bug_desc"),
      action: t("bill_card_bug_action"),
      href: mailto(
        BUG_EMAIL,
        t("bill_mailto_bug_subject"),
        t("bill_mailto_bug_body"),
      ),
    },
  ];

  const faqs = [
    { q: t("bill_faq_sync_q"), a: t("bill_faq_sync_a") },
    { q: t("bill_faq_offline_q"), a: t("bill_faq_offline_a") },
    { q: t("bill_faq_mentions_q"), a: t("bill_faq_mentions_a") },
    { q: t("bill_faq_score_q"), a: t("bill_faq_score_a") },
    { q: t("bill_faq_manage_q"), a: t("bill_faq_manage_a") },
    { q: t("bill_faq_delete_q"), a: t("bill_faq_delete_a") },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Button asChild variant="link" className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white">
          <a href="#/profile">{t("bill_back_to_home")}</a>
        </Button>

        <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">{t("bill_support_help_contact")}</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-white sm:text-5xl">{t("bill_support_center")}</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">
          {t("bill_support_subtitle")}
        </p>

        {/* Action cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card
                key={c.title}
                className="group overflow-hidden border-white/10 bg-white/[0.02] p-5 rounded-sm transition hover:border-white/30 hover:bg-white/[0.04]"
              >
                <a href={c.href} className="flex h-full flex-col">
                  <Icon className="h-6 w-6 text-white/70" />
                  <h2 className="mt-4 text-base font-medium text-white/90">{c.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-white/50">{c.description}</p>
                  <span className="mt-4 text-xs uppercase tracking-[0.22em] text-white/60 group-hover:text-white transition-colors">
                    {c.action} →
                  </span>
                </a>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="font-serif text-2xl tracking-tight text-white">{t("bill_faq_title")}</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        <p className="mt-16 text-sm text-white/40">
          {t("bill_still_stuck")}{" "}
          <Button asChild variant="link" className="font-medium text-white hover:underline">
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </Button>
          .
        </p>
      </div>
    </div>
  );
}
