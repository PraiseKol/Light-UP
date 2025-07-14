// src/components/ui/progress.jsx
import { cn } from "../../lib/utils";

export default function ProgressBar({ value = 0, max = 100, className }) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div
      className={cn(
        "w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner",
        className
      )}
    >
      <div
        className="h-full bg-gold transition-all duration-700 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
