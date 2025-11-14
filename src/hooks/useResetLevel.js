// src/hooks/useResetLevel.js
export function useResetLevel({
  setModals,
  setUserInput,
  setStatus,
  setTimeLeft,
  setIsRunning,
  hasAnsweredRef,
  reshuffleLetters,
  onIncorrect,
  forceIncorrectLifeLoss = false,
  lifeLostRef, // ✅ NEW
}) {
  return function resetLevel({ skipIncorrect = false } = {}) {
    if (setModals) {
      setModals.setShowRightModal?.(false);
      setModals.setShowWrongModal?.(false);
      setModals.setShowTimeUpModal?.(false);
    }

    console.log("[useResetLevel] Resetting level");

    // Prevent double life loss
    if (!skipIncorrect && forceIncorrectLifeLoss && onIncorrect && !lifeLostRef?.current) {
      console.log("[useResetLevel] Forcing incorrect life loss on retry");
      onIncorrect();
      lifeLostRef.current = true;
    }

    setUserInput?.("");
    setStatus?.("idle");
    setTimeLeft?.(30);
    setIsRunning?.(true);
    if (hasAnsweredRef) hasAnsweredRef.current = false;
    if (lifeLostRef) lifeLostRef.current = false; // Reset ref
    reshuffleLetters?.();
  };
}
