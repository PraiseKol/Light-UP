import { useEffect, useState, useRef, useCallback } from "react";

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
    if (!isRunning || timeLeft <= 0) return;

    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, tick]);

  const reset = useCallback(() => {
    setTimeLeft(durationSeconds);
    setIsRunning(true);
  }, [durationSeconds]);

  return {
    timeLeft,
    isRunning,
    setIsRunning,
    reset,
  };
}
