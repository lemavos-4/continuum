/*
 * CONTINUUM — Footer
 * Design: Void Cartography — minimal, dark, clean grid
 */
import AppLogo from "./AppLogo";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Pricing", href: "#/pricing" },
      { label: "About", href: "#/about" },
      { label: "Support", href: "#/support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms and Conditions", href: "#/terms" },
      { label: "Privacy", href: "#/privacy" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "contact@continuum.onl", href: "mailto:contact@continuum.onl" },
      { label: "feedback@continuum.onl", href: "mailto:feedback@continuum.onl" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-black">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255,255,255,0.02) 0%, transparent 60%)",
        }}
      />

      <div className="container relative z-10 py-14 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="max-w-sm">
            <a href="/" className="flex items-center gap-2.5 mb-5">
              <AppLogo />
              <span
                className="text-white font-semibold tracking-tight text-[1.05rem]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Continuum
              </span>
            </a>
            <p className="font-body text-sm leading-[1.75] text-[#888888]">
              A modern knowledge management platform designed to help you organize,
              connect, and discover your ideas at the speed of thought.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/30">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="font-body text-sm text-[#888888] transition-colors hover:text-white"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.05]">
          <p className="font-body text-xs text-[#888888]">
            © {new Date().getFullYear()} Continuum. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
