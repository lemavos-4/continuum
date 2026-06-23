/*
 * CONTINUUM — ProblemSection
 * Design: Void Cartography — emotional pain points, dark imagery
 * Three pain cards with the chaos image as visual anchor
 */
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";

const EASE = [0.16, 1, 0.3, 1] as const;

const problems = [
  {
    number: "01",
    title: "Sync is a hassle.",
    body: "You love linked notes on desktop, but getting them on your phone shouldn't require plugins, paid hosting, or manual workarounds.",
  },
  {
    number: "02",
    title: "Ideas get buried forever.",
    body: "You capture constantly, but without a real resurfacing system, the right note never shows up when you actually need it.",
  },
  {
    number: "03",
    title: "Folders and plugins drain you.",
    body: "Complex setups, endless plugins, and rigid folder structures turn your thinking tool into another chore to maintain.",
  },
];

function ProblemCard({ number, title, body, delay }: typeof problems[0] & { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      className="group relative"
    >
      {/* Left accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent group-hover:via-white/30 transition-all duration-500" />

      <div className="pl-6">
        <span className="label-caps text-[#888888] block mb-3">{number}</span>
        <h3
          className="font-display text-[1.375rem] font-semibold text-white mb-3 leading-tight"
        >
          {title}
        </h3>
        <p className="font-body text-[0.9375rem] leading-[1.75] text-[#888888]">
          {body}
        </p>
      </div>
    </motion.div>
  );
}

export default function ProblemSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section ref={ref} className="relative py-28 lg:py-36 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,255,255,0.03) 0%, transparent 60%)",
        }}
      />

      <div className="container relative z-10">
        {/* Section label */}
        {inView && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mb-16"
          >
            <span className="label-caps text-[#888888]">The problem</span>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-24 items-start">
          {/* Left: Headline + visual */}
          <div>
            {inView && (
              <motion.h2
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
                className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.02em] text-white mb-8"
              >
                Powerful tools,{" "}
                <span className="text-[#888888] italic">too much friction.</span>
              </motion.h2>
            )}

            {inView && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
                className="relative rounded-xl overflow-hidden"
              >
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663464802334/7C5e7P5tcQcacgwrqY5Hy6/continuum-problem-chaos-8LGa5jtTygStDFeMet4F54.webp"
                  alt="Information chaos visualization"
                  className="w-full h-64 lg:h-80 object-cover opacity-80"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-body text-sm text-[#888888] italic">
                    "You should be thinking, not configuring."
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Problem cards */}
          <div className="flex flex-col gap-10">
            {inView && problems.map((p, i) => (
              <ProblemCard key={p.number} {...p} delay={0.2 + i * 0.12} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
