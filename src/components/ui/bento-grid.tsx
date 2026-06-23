import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface BentoItem {
  title: string;
  description: string;
  icon: ReactNode;
  status?: string;
  tags?: string[];
  meta?: string;
  cta?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
  onClick?: () => void;
}

interface BentoGridProps {
  items: BentoItem[];
}

function BentoGrid({ items }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map((item, index) => (
        <div
          key={index}
          onClick={item.onClick}
          className={cn(
            "bento-card group cursor-pointer",
            item.colSpan === 2 ? "md:col-span-2" : "col-span-1",
            item.hasPersistentHover && "border-primary/10"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bento-pattern transition-opacity duration-300",
              item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          />

          <div className="relative flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="bento-icon-box">{item.icon}</div>
              <span className="bento-status">{item.status || "Active"}</span>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-foreground tracking-tight text-[15px]">
                {item.title}
                {item.meta && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">{item.meta}</span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground leading-snug">{item.description}</p>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {item.tags?.map((tag, i) => (
                  <span key={i} className="bento-tag">#{tag}</span>
                ))}
              </div>
              <span className="text-xs text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.cta || "Open →"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { BentoGrid };
