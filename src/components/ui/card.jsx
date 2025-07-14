// src/components/ui/card.jsx
import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <div className={cn("rounded-2xl border bg-white shadow-md p-4", className)} {...props} />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div className={cn("mb-2 font-bold text-lg", className)} {...props} />
  );
}

export function CardContent({ className, ...props }) {
  return (
    <div className={cn("text-sm text-gray-700", className)} {...props} />
  );
}
