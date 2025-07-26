// src/components/ui/RightAnswerModal.jsx
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

export default function RightAnswerModal({
  isOpen,
  onClose,
  onNext,
  onBackToMap,
  score, // 👈 Accept score as a prop
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-10">
        <Transition.Child
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
          <Dialog.Panel className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg text-center space-y-4">
            <Dialog.Title className="text-2xl font-semibold text-green-600">
              Correct! 🎉
            </Dialog.Title>

            {score !== undefined && (
              <div className="text-lg font-bold text-blue-700">
                +{score} points
              </div>
            )}

            <p className="text-gray-600">
              Great job. Ready for the next challenge?
            </p>

            <div className="space-y-2">
              <button
                onClick={onNext}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
              >
                Next Level
              </button>
              <button
                onClick={onBackToMap}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 transition"
              >
                Back to Map
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
