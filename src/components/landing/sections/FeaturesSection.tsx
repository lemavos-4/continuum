/*
 * CONTINUUM — FeaturesSection
 * Design: Void Cartography — 2x2 grid, each feature with icon + title + one-liner
 * Large decorative numbers in background. Hover: cyan accent line.
 */
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Link2, Zap, Layers, Gauge } from "@/lib/heroicons";

const EASE = [0.16, 1, 0.3, 1] as const;

const features = [
  {
    icon: Link2,
    title: "Linked Thinking",
    body: "Every note is a node. Reference concepts inline and watch your knowledge graph grow with every keystroke.",
    number: "01",
  },
  {
    icon: Zap,
    title: "Instant Capture",
    body: "No friction, no folders. Write first. Continuum connects the dots automatically, in the background.",
    number: "02",
  },
  {
    icon: Layers,
    title: "Entity System",
    body: "People, projects, ideas, books — each becomes a first-class entity. Your notes orbit around what matters.",
    number: "03",
  },
  {
    icon: Gauge,
    title: "Blazing Fast",
    body: "Sub-50ms response time. Keyboard-first. No loading spinners. Thinking at the speed of thought.",
    number: "04",
  },
];

export default function FeaturesSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section id="features" ref={ref} className="relative py-28 lg:py-36 overflow-hidden">
      {/* Separator line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="container relative z-10">
        {/* Header */}
        {inView && (
          <div className="max-w-2xl mb-16 lg:mb-20">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mb-6"
            >
              <span className="label-caps text-[#888888]">Features</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
              className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.02em] text-white"
            >
              Built for how you{' '}
              <span className="italic text-[#888888]">actually think.</span>
            </motion.h2>
          </div>
        )}

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05]">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, ease: EASE, delay: 0.15 + i * 0.1 }}
                className="relative group bg-[#090909] p-8 lg:p-10 overflow-hidden hover:bg-[#121212] transition-colors duration-300"
              >
                {/* Decorative number */}
                <span
                  className="absolute top-4 right-6 font-display text-[5rem] font-bold leading-none select-none pointer-events-none"
                  style={{ color: "rgba(255, 255, 255, 0.025)" }}
                >
                  {feature.number}
                </span>

                {/* Left accent line on hover */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />

                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/[0.12] flex items-center justify-center mb-6 group-hover:bg-white/15 transition-colors duration-300">
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <h3 className="font-display text-[1.25rem] font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="font-body text-[0.9375rem] leading-[1.75] text-[#888888]">
                  {feature.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
