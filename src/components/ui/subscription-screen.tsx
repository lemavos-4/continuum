import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Feature {
  icon?: React.ReactNode;
  text: string;
}

interface PricingOption {
  id: string;
  price: string;
  period: string;
  badge?: string;
}

interface SubscriptionScreenProps {
  backgroundImageSrc?: string;
  headerImageSrc: string;
  appName: string;
  planType: string;
  features: Feature[];
  pricingOptions: PricingOption[];
  defaultPlanId: string;
  subscribeButtonText: string;
  footerText: string;
  currentPlanText?: string;
  onSubscribe: (planId: string) => void;
}

export function SubscriptionScreen({
  backgroundImageSrc,
  headerImageSrc,
  appName,
  planType,
  features,
  pricingOptions,
  defaultPlanId,
  subscribeButtonText,
  footerText,
  currentPlanText,
  onSubscribe,
}: SubscriptionScreenProps) {
  const [selectedPlan, setSelectedPlan] = React.useState(defaultPlanId);

  return (
    <div className="relative flex w-[clamp(18rem,88vw,26rem)] flex-col items-center justify-end overflow-visible rounded-2xl bg-transparent shadow-2xl">
      {backgroundImageSrc && <img src={backgroundImageSrc} alt="" className="absolute inset-0 z-0 h-full w-full object-cover" />}
      {backgroundImageSrc && <div className="absolute inset-0 z-[1] bg-black/25" />}

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        data-subscription-panel
        className="relative z-10 flex w-[calc(100%+0.5rem)] flex-col items-center rounded-t-3xl bg-muted/60 px-6 pb-6 pt-12 backdrop-blur-xl sm:w-[calc(100%+1rem)] sm:px-8"
      >
        <motion.img
          src={headerImageSrc}
          alt=""
          className="absolute -top-16 h-32 w-32 rounded-full border-4 border-background/80 object-cover shadow-xl"
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
        />

        <div className="mt-4 text-center">
          <h1 className="font-serif text-3xl tracking-tight text-foreground">
            {appName} <span className="text-primary">{planType}</span>
          </h1>
          {currentPlanText && <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{currentPlanText}</p>}
        </div>

        <ul className="mt-5 w-full space-y-2.5">
          {features.map((feature, index) => (
            <motion.li
              key={feature.text}
              className="flex items-center gap-3 text-sm text-muted-foreground"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.45 + index * 0.07, ease: "easeOut" }}
            >
              {feature.icon ?? <Check className="h-4 w-4 shrink-0 text-primary" />}
              <span>{feature.text}</span>
            </motion.li>
          ))}
        </ul>

        <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="mt-6 w-full space-y-2.5">
          {pricingOptions.map((option) => (
            <div key={option.id} className="relative">
              <RadioGroupItem value={option.id} id={`subscription-${option.id}`} className="peer sr-only" />
              <Label
                htmlFor={`subscription-${option.id}`}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-lg border-2 border-transparent bg-muted/50 p-3.5 transition-colors hover:bg-muted",
                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground">
                    <AnimatePresence>
                      {selectedPlan === option.id && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="h-3 w-3 rounded-full bg-primary" />}
                    </AnimatePresence>
                  </div>
                  <span className="font-semibold text-foreground">{option.price}</span>
                  <span className="text-sm text-muted-foreground">{option.period}</span>
                </div>
                {option.badge && <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{option.badge}</span>}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <Button size="lg" className="mt-6 w-full text-base" onClick={() => onSubscribe(selectedPlan)}>
          {subscribeButtonText}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">{footerText}</p>
      </motion.div>
    </div>
  );
}
