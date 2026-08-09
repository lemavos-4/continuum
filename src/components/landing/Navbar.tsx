/*
 * CONTINUUM — Navbar
 * Design: Void Cartography — minimal, dark, transparent-to-solid on scroll
 * Font: Logo uses Playfair Display.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppLogo from "./AppLogo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

interface NavbarProps {
  onAuthOpen?: () => void;
}

export default function Navbar({ onAuthOpen }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const compactLoginLabel = t("lp_nav_signIn")
    .replace(/\s+(with|com|con|avec)\s+(google|Google)?/i, "")
    .trim();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/60 backdrop-blur-md border-b border-white/[0.04]"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center h-14 px-6 md:px-8">
        {/* Logo mais sutil */}
        <a href="/" className="flex items-center gap-2 shrink-0 opactiy-85 hover:opacity-100 transition-opacity duration-300">
          <div className="opacity-70 group-hover:opacity-100 transition-opacity">
            <AppLogo className="w-5 h-5 object-contain" />
          </div>
          <span
            className="text-white/80 font-medium tracking-wide text-[0.95rem]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Continuum
          </span>
        </a>

        <div className="flex flex-1 min-w-0" />

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (onAuthOpen) onAuthOpen();
              else navigate("/login");
            }}
            className="shrink-0 text-white/60 hover:text-white/100 text-[11px] sm:text-xs font-medium tracking-wide transition-colors duration-300 py-2 px-2 whitespace-nowrap"
          >
            {compactLoginLabel}
          </button>
          <LanguageSelector compact />
        </div>
      </div>
    </motion.header>
  );
}