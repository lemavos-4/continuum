"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { useRef } from "react";
import { Check } from "@/lib/heroicons";

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    buttonText: "Current Plan",
    buttonVariant: "outline" as const,
    includes: [
      "Unlimited notes",
      "Unlimited entities",
      "Basic knowledge graph",
      "Community support",
    ],
  },
  {
    name: "Pro",
    description: "For power users and teams",
    price: 19.90,
    buttonText: "Upgrade to Pro",
    buttonVariant: "default" as const,
    popular: true,
    includes: [
      "Everything in Free, plus:",
      "Advanced search",
      "Custom tags",
      "API access",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    description: "For organizations",
    price: 99.90,
    buttonText: "Contact Sales",
    buttonVariant: "outline" as const,
    includes: [
      "Everything in Pro, plus:",
      "Team management",
      "Advanced analytics",
      "SSO & SAML",
      "Dedicated support",
    ],
  },
];

export default function PricingSection6() {
  const pricingRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.4,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  return (
    <div className="min-h-screen mx-auto relative bg-black overflow-x-hidden" ref={pricingRef}>
      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <article className="text-center mb-12 space-y-4">
          <h2 className="text-4xl font-bold text-white">
            <VerticalCutReveal
              splitBy="words"
              staggerDuration={0.1}
              staggerFrom="first"
              containerClassName="justify-center"
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 40,
              }}
            >
              Simple, Transparent Pricing
            </VerticalCutReveal>
          </h2>

          <TimelineContent
            as="p"
            animationNum={0}
            timelineRef={pricingRef}
            customVariants={revealVariants}
            className="text-zinc-400 text-lg max-w-2xl mx-auto"
          >
            Choose the perfect plan for your needs. Always flexible to scale as you grow.
          </TimelineContent>
        </article>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <TimelineContent
              key={plan.name}
              as="div"
              animationNum={1 + index}
              timelineRef={pricingRef}
              customVariants={revealVariants}
            >
              <Card
                className={cn(
                  "relative border transition-all hover:border-white/20",
                  plan.popular
                    ? "border-white/20 bg-white/5"
                    : "border-white/10 bg-white/[0.02]"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold text-white bg-white/10 border border-white/20 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-zinc-400 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-4xl font-bold text-white">
                      {plan.price === 0 ? "Free" : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-zinc-500">/month</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <button
                    className={cn(
                      "w-full py-2.5 px-4 rounded-lg font-medium transition-colors",
                      plan.popular
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                    )}
                  >
                    {plan.buttonText}
                  </button>

                  <div className="space-y-3 pt-6 border-t border-white/10">
                    <p className="text-sm font-medium text-white">Includes:</p>
                    <ul className="space-y-3">
                      {plan.includes.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-white/60 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-zinc-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TimelineContent>
          ))}
        </div>
      </div>
    </div>
  );
}
