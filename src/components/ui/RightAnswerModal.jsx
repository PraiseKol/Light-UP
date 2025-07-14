// src/components/ui/RightAnswerModal.jsx
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { CheckCircle2 } from "lucide-react";

export default function RightAnswerModal({ isOpen, onClose, onNext }) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        {/* BACKDROP */}
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

        {/* MODAL CONTENT */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full space-y-6">
              <CheckCircle2 className="w-16 h-16 text-gold mx-auto" />
              <Dialog.Title className="text-2xl font-bold text-charcoal">
                Level Complete!
              </Dialog.Title>
              <Dialog.Description className="text-gray-600">
                Well done! You're one step closer to Bible mastery!
              </Dialog.Description>

              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-charcoal text-white hover:bg-black transition"
                >
                  Back to Map
                </button>
                <button
                  onClick={onNext}
                  className="px-4 py-2 rounded-lg bg-gold text-black hover:bg-yellow-400 transition"
                >
                  Next Level
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
