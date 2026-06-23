/*
 * CONTINUUM — Landing Page
 * Powered by the ScrollGlobe scroll-driven story.
 * Minimal copy, generous space, screenshot slots for the real product.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AuthDialog from "@/components/auth/AuthDialog";
import { ScrollGlobe } from "@/components/ui/landing-page";
import landingNotes from "@/assets/landing-notes.jpg";
import landingEditor from "@/assets/landing-editor.jpg";
import landingGraph from "@/assets/landing-graph.jpg";
import landingInsights from "@/assets/landing-insights.jpg";

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login"); // Hidden: kept for future use
  const navigate = useNavigate();

  const openAuth = () => {
    setAuthOpen(true);
  };

  // Hidden: old openAuth function kept for future use
  const openAuthOld = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const sections = [
    {
      id: "hero",
      badge: "Continuum",
      title: "Your second brain,",
      subtitle: "without the friction.",
      description:
        "Native sync across devices. Zero folder mess. Intelligent resurfacing that brings the right note back when you need it.",
      align: "left" as const,
      actions: [
        { label: "Start for free", variant: "primary" as const, onClick: () => openAuth() },
      ],
    },
    {
      id: "connect",
      badge: "Connections",
      title: "Notes that link themselves.",
      description:
        "Mention people, projects, or topics with @ and #. Every connection strengthens your graph. No folders, no rigid hierarchy — just pure flow.",
      align: "center" as const,
      screenshots: [
        { src: landingNotes, alt: "Notes list", caption: "Every thought, one tap away." },
        { src: landingEditor, alt: "Editor with mentions", caption: "Mentions become living links." },
      ],
    },
    {
      id: "discover",
      badge: "Discovery",
      title: "Ideas resurface",
      subtitle: "when you need them.",
      description:
        "Our score system ranks notes and entities based on your actual usage. Forgotten insights come back automatically. Your knowledge works for you, not against you.",
      align: "left" as const,
      features: [
        {
          title: "Intelligent Score System",
          description:
            "Notes and entities earn relevance based on how you interact with them. The most important stuff always floats to the top — no manual tagging needed.",
        },
        {
          title: "Native Free Sync",
          description:
            "Your entire knowledge graph stays in sync across every device. No plugins, no paid hosting, no manual configuration. It just works.",
        },
        {
          title: "Entity Tracking",
          description:
            "Every entity carries real metrics: mentions, time invested, and connections. Understand what actually matters in your thinking.",
        },
      ],
      screenshots: [
        { src: landingGraph, alt: "Knowledge graph view", caption: "Your second brain, visualized." },
        { src: landingInsights, alt: "Insights dashboard", caption: "What matters resurfaces automatically." },
      ],
    },
    {
      id: "future",
      badge: "Get started",
      title: "Your second brain,",
      subtitle: "without the friction.",
      description:
        "Native sync across devices. Zero folder mess. Intelligent resurfacing that brings the right note back when you need it.",
      align: "center" as const,
      actions: [
        { label: "Start for free", variant: "primary" as const, onClick: () => openAuth() },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar onAuthOpen={() => openAuth()} />
      <main>
        <ScrollGlobe sections={sections} className="bg-black" />
      </main>
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialTab="login" />
    </div>
  );
}
