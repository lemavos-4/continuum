import { motion } from "framer-motion";
import { ComponentProps, ReactNode } from "react";
import { staggerContainer, staggerItem } from "@/lib/motion";

type DivProps = ComponentProps<typeof motion.div>;

/** Reveals children sequentially once mounted (or when in view). */
export function Stagger({
  children,
  stagger = 0.045,
  whenInView = false,
  ...rest
}: { children: ReactNode; stagger?: number; whenInView?: boolean } & Omit<DivProps, "variants">) {
  return (
    <motion.div
      variants={staggerContainer(stagger)}
      initial="hidden"
      {...(whenInView
        ? { whileInView: "visible", viewport: { once: true, amount: 0.15 } }
        : { animate: "visible" })}
      exit="exit"
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...rest }: { children: ReactNode } & Omit<DivProps, "variants">) {
  return (
    <motion.div variants={staggerItem} {...rest}>
      {children}
    </motion.div>
  );
}