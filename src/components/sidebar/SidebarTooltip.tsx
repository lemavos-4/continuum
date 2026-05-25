import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarTooltip({ content, children }: SidebarTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
