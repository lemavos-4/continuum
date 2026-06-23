import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Minimal monochrome auth layout: split screen, hairline borders,
 * serif headline, no glows, no gradients.
 */
export default function AuthShell({ eyebrow = "Continuum", title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-black text-white grid lg:grid-cols-2">
      {/* Left — form */}
      <section className="flex flex-col px-6 sm:px-10 lg:px-16 py-10">
        <header className="flex items-center justify-between">
          <Link to="/" className="label-caps text-white/80 hover:text-white transition-colors">
            {eyebrow}
          </Link>
          <Link to="/" className="text-xs text-white/50 hover:text-white transition-colors">
            ← Back
          </Link>
        </header>

        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight">{title}</h1>
          {subtitle && <p className="mt-3 text-sm text-white/60">{subtitle}</p>}
          <div className="mt-10">{children}</div>
          {footer && <div className="mt-8 text-sm text-white/50">{footer}</div>}
        </div>

        <footer className="text-[11px] text-white/30 tracking-wider uppercase">
          © {new Date().getFullYear()} Continuum
        </footer>
      </section>

      {/* Right — typographic side */}
      <aside className="hidden lg:flex relative items-center justify-center border-l border-white/[0.06] bg-[#050505] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="relative max-w-md px-12">
          <p className="label-caps mb-6">Knowledge, structured</p>
          <p className="font-serif text-3xl leading-tight tracking-tight">
            “The mind is not a vessel to be filled, but a fire to be kindled.”
          </p>
          <p className="mt-4 text-xs text-white/40">— Plutarch</p>
        </div>
      </aside>
    </div>
  );
}
