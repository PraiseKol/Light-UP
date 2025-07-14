// src/components/ui/TimeUpModal.jsx
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Button } from '../ui/button';

export default function TimeUpModal({ isOpen, onTryAgain, onGoToMap }) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="scale-95 opacity-0" enterTo="scale-100 opacity-100"
            leave="ease-in duration-200" leaveFrom="scale-100 opacity-100" leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg text-center">
              <Dialog.Title className="text-2xl font-bold text-red-600 mb-2">
                ⏰ Time’s Up!
              </Dialog.Title>
              <p className="text-gray-700 text-sm mb-6">
                You didn’t complete the level in time. Want to try again?
              </p>

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={onGoToMap}>
                  🔙 Return to Map
                </Button>
                <Button onClick={onTryAgain}>
                  🔁 Try Again
                </Button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
