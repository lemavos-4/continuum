/*
 * CONTINUUM — SolutionSection
 * Design: Void Cartography — ordered network visual, three solution pillars
 * Contrast with Problem section: order vs chaos
 */
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";

const EASE = [0.16, 1, 0.3, 1] as const;

const solutions = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="3" fill="#ffffff" />
        <circle cx="3" cy="4" r="2" fill="#ffffff" opacity="0.5" />
        <circle cx="17" cy="4" r="2" fill="#ffffff" opacity="0.5" />
        <circle cx="3" cy="16" r="2" fill="#ffffff" opacity="0.5" />
        <circle cx="17" cy="16" r="2" fill="#ffffff" opacity="0.5" />
        <line x1="10" y1="7" x2="3" y2="4" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
        <line x1="10" y1="7" x2="17" y2="4" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
        <line x1="10" y1="13" x2="3" y2="16" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
        <line x1="10" y1="13" x2="17" y2="16" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
      </svg>
    ),
    title: "Notes connect to entities.",
    body: "Every note links to concepts, people, and ideas. Your knowledge builds a living graph — not a flat list.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10 Q10 3 17 10 Q10 17 3 10Z" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.6" />
        <circle cx="10" cy="10" r="2.5" fill="#ffffff" />
        <circle cx="3" cy="10" r="1.5" fill="#ffffff" opacity="0.5" />
        <circle cx="17" cy="10" r="1.5" fill="#ffffff" opacity="0.5" />
      </svg>
    ),
    title: "Ideas become a network.",
    body: "As you write, patterns emerge. Connections you never saw before surface automatically. Your thinking compounds.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
        <circle cx="10" cy="10" r="4" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
        <circle cx="10" cy="10" r="2" fill="#ffffff" />
        <line x1="10" y1="3" x2="10" y2="1" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="17" y1="10" x2="19" y2="10" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "You don't search — you discover.",
    body: "Navigate by meaning, not keywords. The right idea surfaces when you need it, not when you remember to look.",
  },
];

export default function SolutionSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section ref={ref} className="relative py-28 lg:py-36 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 60%)
          `,
        }}
      />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-24 items-center">
          {/* Left: Solution visual */}
          <div className="order-2 lg:order-1">
            {inView && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
                className="relative"
              >
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)",
                  }}
                />
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464802334/7C5e7P5tcQcacgwrqY5Hy6/continuum-solution-network-az53iFkdzQFmz3MWVFFHLg.webp"
                  alt="Organized knowledge network"
                  className="w-full h-72 lg:h-96 object-cover rounded-2xl opacity-90"
                />
                {/* Overlay gradient */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Stats overlay */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
                  className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-4"
                >
                  {[
                    { value: "3×", label: "faster recall" },
                    { value: "∞", label: "connections" },
                    { value: "0", label: "friction" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-black/80 backdrop-blur-sm border border-white/[0.08] rounded-lg p-3 text-center"
                    >
                      <div className="font-display text-xl font-bold text-white">{stat.value}</div>
                      <div className="label-caps text-[#888888] mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Right: Text content */}
          <div className="order-1 lg:order-2">
            {inView && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="mb-6"
                >
                  <span className="label-caps text-[#888888]">The solution</span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
                  className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.02em] text-white mb-12"
                >
                  A mind that{' '}
                  <span className="italic text-[#888888]">thinks with you.</span>
                </motion.h2>

                <div className="flex flex-col gap-10">
                  {solutions.map((s, i) => (
                    <motion.div
                      key={s.title}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.55, ease: EASE, delay: 0.2 + i * 0.1 }}
                      className="flex gap-5 group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 border border-white/[0.12] flex items-center justify-center group-hover:bg-white/15 transition-colors duration-300">
                        {s.icon}
                      </div>
                      <div>
                        <h3 className="font-display text-[1.125rem] font-semibold text-white mb-2">
                          {s.title}
                        </h3>
                        <p className="font-body text-[0.9375rem] leading-[1.75] text-[#888888]">
                          {s.body}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
