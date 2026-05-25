/*
 * CONTINUUM — Footer
 * Design: Void Cartography — minimal, dark, clean grid
 * Logo + links + copyright. No clutter.
 */
import AppLogo from "./AppLogo";

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
        <div className="max-w-2xl">
          <a href="/" className="flex items-center gap-2.5 mb-5">
            <AppLogo />
            <span
              className="text-white font-semibold tracking-tight text-[1.05rem]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Continuum
            </span>
          </a>

          <p className="font-body text-sm leading-[1.75] text-[#888888] max-w-lg">
            Continuum is a modern knowledge management platform designed to help you organize,
            connect, and discover your ideas at the speed of thought.
          </p>

          <div className="pt-8 mt-8 border-t border-white/[0.05] space-y-4">
            <div className="flex gap-6 text-xs text-[#888888]">
              <a href="#/terms" className="hover:text-white transition-colors">Terms and Conditions</a>
              <a href="#/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="mailto:lemavos.noreply@gmail.com" className="hover:text-white transition-colors">Contact</a>
              <a href="https://www.instagram.com/continuumnodes" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a>
            </div>
            <p className="font-body text-xs text-[#888888]">
              © {new Date().getFullYear()} Continuum. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
