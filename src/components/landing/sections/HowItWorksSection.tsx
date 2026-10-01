/*
 * CONTINUUM — HowItWorksSection
 * Design: Void Cartography — 3 steps, horizontal on desktop, vertical on mobile
 * Connected by animated line. Each step: number + title + body.
 */
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { PenLine, Hash, Network } from "@/lib/heroicons";

const EASE = [0.16, 1, 0.3, 1] as const;

const steps = [
  {
    number: "1",
    icon: PenLine,
    title: "Write freely",
    body: "Capture any thought instantly. No folders, no templates, no rigid structure. Just write and move on.",
  },
  {
    number: "2",
    icon: Hash,
    title: "Link to entities",
    body: "Mention people, projects, or ideas with @ and #. Every connection strengthens your living knowledge graph.",
  },
  {
    number: "3",
    icon: Network,
    title: "Let ideas resurface",
    body: "Our score system surfaces what matters, when it matters. No more lost insights. No more dead notes.",
  },
];

export default function HowItWorksSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section id="how-it-works" ref={ref} className="relative py-28 lg:py-36 overflow-hidden">
      {/* Separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 20% 60%, rgba(255,255,255,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="container relative z-10">
        {/* Header */}
        {inView && (
          <div className="text-center max-w-2xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mb-6"
            >
              <span className="label-caps text-[#888888]">How it works</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
              className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.02em] text-white"
            >
              Three steps to{' '}
              <span className="italic text-[#888888]">effortless thinking.</span>
            </motion.h2>
          </div>
        )}

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          {inView && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, ease: EASE, delay: 0.4 }}
              className="hidden lg:block absolute top-[2.75rem] inset-x-8 h-px bg-gradient-to-r from-white/30 via-white/50 to-white/30 origin-left"
            />
          )}

          <div className="grid lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 32 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.2 + i * 0.15 }}
                  className="relative flex flex-col items-center lg:items-start text-center lg:text-left"
                >
                  {/* Step indicator */}
                  <div className="relative mb-8">
                    <div className="w-14 h-14 rounded-full border-2 border-white/[0.12] bg-[#090909] flex items-center justify-center relative z-10">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    {/* Number badge */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                      <span className="text-[0.625rem] font-bold text-[#090909]">{step.number}</span>
                    </div>
                  </div>

                  <h3 className="font-display text-[1.25rem] font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="font-body text-[0.9375rem] leading-[1.75] text-[#888888] max-w-xs">
                    {step.body}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA nudge */}
        {inView && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.8 }}
            className="mt-16 text-center"
          >
            <p className="font-body text-sm text-[#888888]">
              Takes less than 2 minutes to set up. No credit card required.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
