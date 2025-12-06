import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect } from "react";
import { playSound } from "@/utils/sound";

export default function TimeUpModal({ isOpen, onTryAgain, onGoToMap, effectsOn, currentLives = 1 }) {
  // Play time up sound
  useEffect(() => {
    if (isOpen) {
      playSound("gameOver", effectsOn);
    }
  }, [isOpen, effectsOn]);
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog onClose={() => {}} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-3 md:p-4">
          <Dialog.Panel className="w-full max-w-xs md:max-w-sm rounded-2xl bg-gradient-to-br from-frostBlue/30 via-white to-snowWhite border-2 border-frostBlue p-6 shadow-[0_8px_0_#3b82f6,0_12px_20px_rgba(59,130,246,0.4)] text-center space-y-3 md:space-y-4 relative overflow-hidden">
            {/* Christmas decorations */}
            <div className="absolute top-2 left-3 text-lg">❄️</div>
            <div className="absolute top-2 right-3 text-lg">❄️</div>
            
            <Dialog.Title className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-frostBlue bg-clip-text text-transparent">
              ⏰ Time's Up!
            </Dialog.Title>
            <Dialog.Description className="text-gray-700">
              You didn't complete the level in time.
            </Dialog.Description>

            <div className="space-y-1 md:space-y-2">
              <button
                onClick={() => {
                  playSound("back", effectsOn);
                  onTryAgain();
                }}
                disabled={currentLives <= 0}
                className={`w-full py-1 md:py-2 rounded-full font-bold transition-all ${
                  currentLives <= 0
                    ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                    : "bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 text-white shadow-[0_4px_0_#1e40af] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#1e40af]"
                }`}
              >
                {currentLives <= 0 ? "⏰ No more lives, wait for regeneration" : "🔁 Try Again"}
              </button>
              <button
                onClick={() => {
                  playSound("click", effectsOn);
                  onGoToMap();
                }}
                className="w-full bg-gradient-to-b from-gray-300 to-gray-400 text-gray-800 py-1 md:py-2 rounded-full font-bold hover:scale-105 shadow-[0_4px_0_#6b7280] active:translate-y-1 active:shadow-[0_2px_0_#6b7280] transition-all"
              >
                🔙 Return to Map
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
