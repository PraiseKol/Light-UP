import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { playSound } from "@/utils/sound";

export default function RightAnswerModal({
  isOpen,
  onClose,
  onNext,
  onBackToMap,
  score,
  effectsOn
}) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-10">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-green-50 via-white to-yellow-50 p-5 sm:p-6 shadow-2xl text-center space-y-3 sm:space-y-4 border-4 border-green-300 animate-scale-in relative overflow-hidden">
            {/* Decorative stars */}
            <div className="absolute top-2 left-2 text-2xl animate-spin-slow">⭐</div>
            <div className="absolute top-2 right-2 text-2xl animate-spin-slow animation-delay-300">⭐</div>
            <div className="absolute bottom-2 left-4 text-xl animate-bounce animation-delay-500">✨</div>
            <div className="absolute bottom-2 right-4 text-xl animate-bounce animation-delay-700">✨</div>
            
            <div className="text-5xl sm:text-6xl animate-bounce mb-2">🎉</div>
            
            <Dialog.Title className="text-2xl sm:text-3xl font-black text-transparent bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text drop-shadow-lg">
              Correct!
            </Dialog.Title>

            {score !== undefined && (
              <div className="inline-block bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 text-white text-xl sm:text-2xl font-black px-5 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg animate-pulse">
                +{score} points
              </div>
            )}

            <p className="text-gray-700 font-semibold text-sm sm:text-base">
              Great job! Ready for the next challenge?
            </p>

            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={() => {
                  playSound("success", effectsOn);
                  onNext();
                }}
                className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-sm sm:text-base py-2.5 sm:py-3 rounded-xl shadow-[0_4px_0_#059669,0_6px_12px_rgba(5,150,105,0.4)] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#059669] transition-all"
              >
                ✨ Next Level
              </button>
              <button
                onClick={() => {
                  playSound("select", effectsOn);
                  onBackToMap();
                }}
                className="w-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 font-bold text-sm sm:text-base py-2.5 sm:py-3 rounded-xl shadow-[0_3px_0_#6b7280] hover:scale-105 active:translate-y-1 active:shadow-[0_1px_0_#6b7280] transition-all"
              >
                🗺️ Back to Map
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
