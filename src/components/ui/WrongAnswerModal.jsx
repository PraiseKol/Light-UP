// src/components/ui/WrongAnswerModal.jsx
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { playSound } from "utils/sound";

export default function WrongAnswerModal({ isOpen, onRetry, onBack, effectsOn }) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog onClose={onBack || (() => {})} className="relative z-50">
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

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg text-center space-y-4">
            <Dialog.Title className="text-2xl font-bold text-red-600">
              ❌ Incorrect!
            </Dialog.Title>
            <Dialog.Description className="text-gray-600">
              That’s not the right answer. Want to try again?
            </Dialog.Description>

            <div className="space-y-2">
              <button
                onClick={() => {
                  playSound("back", effectsOn);
                  onRetry();
                }}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
              >
                🔁 Retry
              </button>
              <button
                onClick={() => {
                  playSound("click", effectsOn);
                  onBack();
                }}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 transition"
              >
                🗺️ Return to Map
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
