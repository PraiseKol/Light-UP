// src/components/ui/tooltip.jsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils";

export function Tooltip({ children, content }) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={cn(
              "bg-charcoal text-white text-xs rounded px-2 py-1 shadow-lg z-50 animate-fadeInUp",
              "data-[state=delayed-open]:data-[side=top]:slide-in-from-bottom-2"
            )}
            sideOffset={6}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-charcoal" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
