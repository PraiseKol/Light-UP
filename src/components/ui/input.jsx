// src/components/ui/input.jsx
import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-md border border-charcoal/20 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition",
        className
      )}
      {...props}
    />
  );
}
