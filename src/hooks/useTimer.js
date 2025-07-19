import { useEffect, useState, useRef, useCallback } from "react";

/**
 * Custom hook for a countdown timer.
 * @param {number} durationSeconds - Initial countdown duration.
 * @param {Function} onExpire - Callback to run when time expires.
 * @param {boolean} autoStart - Whether the timer starts immediately.
 */
export function useTimer(durationSeconds = 60, onExpire, autoStart = true) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef(null);

  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        clearInterval(intervalRef.current);
        if (onExpire) onExpire();
        return 0;
      }
      return prev - 1;
    });
  }, [onExpire]);

  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) return;

    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, tick]);

  const reset = useCallback(() => {
    setTimeLeft(durationSeconds);
    setIsRunning(true);
  }, [durationSeconds]);

  return {
    timeLeft,
    setTimeLeft, // ✅ Expose this for manual reset (fixes your error)
    isRunning,
    setIsRunning,
    reset,
  };
}
