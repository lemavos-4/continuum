/*
 * CONTINUUM — CTASection
 * Design: Void Cartography — full-width, high contrast, strong typography
 * The final conversion moment. No distractions.
 */
import { motion } from "framer-motion";
import { ArrowRight } from "@/lib/heroicons";
import { useNavigate } from "react-router-dom";
import { useInView } from "@/hooks/useInView";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function CTASection() {
  const { ref, inView } = useInView(0.15);
  const navigate = useNavigate();

  return (
    <section id="cta" ref={ref} className="relative py-28 lg:py-40 overflow-hidden">
      {/* Separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Background: soft glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 50%)
          `,
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {inView && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="mb-8"
              >
                <span className="label-caps text-[#888888]">Get started today</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
                className="font-display text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.025em] text-white mb-6"
              >
                Your ideas deserve to resurface.
                <br />
                <span className="italic text-[#888888]">Start building for free, sync everywhere.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
                className="font-body text-[1.0625rem] leading-[1.75] text-[#888888] mb-12 max-w-lg mx-auto"
              >
                Native sync, intelligent resurfacing, and a mobile-first experience designed for thinkers who are tired of fighting their tools.
              </motion.p>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
              >
                <button
                  onClick={() => navigate("/register")}
                  className="btn-primary animate-pulse-glow text-lg"
                >
                  Start for free
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>

              {/* Reassurances */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-6"
              >
                {[
                  "No credit card required",
                  "Free native sync",
                  "Mobile-first",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 label-caps text-[#888888]">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    {item}
                  </span>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
