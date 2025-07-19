// src/hooks/useResetLevel.js
export function useResetLevel({ 
    setModals,       // object: { setShowRightModal, setShowWrongModal, setShowTimeUpModal }
    setUserInput,    // function or null
    setStatus,       // function or null
    setTimeLeft,     // function or null
    setIsRunning,    // function or null
    hasAnsweredRef,  // ref or null
    reshuffleLetters // optional function to reshuffle
  }) {
    return function resetLevel() {
      if (setModals) {
        setModals.setShowRightModal?.(false);
        setModals.setShowWrongModal?.(false);
        setModals.setShowTimeUpModal?.(false);
      }
  
      setUserInput?.("");
      setStatus?.("idle");
      setTimeLeft?.(30);
      setIsRunning?.(true);
      if (hasAnsweredRef) hasAnsweredRef.current = false;
      reshuffleLetters?.();
    };
  }
  