// src/components/WrongAnswerModal.jsx
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Button } from "./button";

export default function WrongAnswerModal({ isOpen, onRetry, onBack }) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onBack || (() => {})}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-200"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg text-center">
              <Dialog.Title className="text-xl font-bold text-red-600">
                ❌ Incorrect!
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-gray-600">
                That’s not the right answer. Want to try again?
              </Dialog.Description>

              <div className="mt-6 flex justify-center gap-4">
                <Button variant="outline" onClick={onBack}>
                  🗺️ Return to Map
                </Button>
                <Button onClick={onRetry}>
                  🔁 Retry
                </Button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
