import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { playSound } from "utils/sound";

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

        <div className="fixed inset-0 flex items-center justify-center p-3 md:p-4">
          <Dialog.Panel className="w-full max-w-xs md:max-w-sm rounded-xl md:rounded-2xl bg-white p-4 md:p-6 shadow-lg text-center space-y-3 md:space-y-4">
            <Dialog.Title className="text-xl md:text-2xl font-semibold text-green-600">
              Correct! 🎉
            </Dialog.Title>

            {score !== undefined && (
              <div className="text-3xs md:text-lg font-bold text-blue-700">
                +{score} points
              </div>
            )}

            <p className="text-gray-600">
              Great job. Ready for the next challenge?
            </p>

            <div className="space-y-1 md:space-y-2">
              <button
                onClick={() => {
                  playSound("success", effectsOn);
                  onNext();
                }}
                className="w-full bg-blue-600 text-white py-1 md:py-2 rounded hover:bg-blue-700 transition"
              >
                Next Level
              </button>
              <button
                onClick={() => {
                  playSound("select", effectsOn);
                  onBackToMap();
                }}
                className="w-full bg-gray-200 text-gray-800 py-1 md:py-2 rounded hover:bg-gray-300 transition"
              >
                Back to Map
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
