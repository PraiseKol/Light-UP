// src/components/ui/modal.jsx
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

export default function Modal({ isOpen, onClose, title, children, className }) {
  // lock body scroll when modal open
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [isOpen]);

  const modalContent = (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          {/* overlay */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        {/* center container uses fixed on viewport and will not be affected by parent transforms when portalled */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="scale-95 opacity-0" enterTo="scale-100 opacity-100"
            leave="ease-in duration-200" leaveFrom="scale-100 opacity-100" leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel
              className={cn(
                // default panel styles
                "w-full max-w-md rounded-2xl bg-white p-6 shadow-lg",
                // allow caller to override
                className
              )}
            >
              {title && (
                <Dialog.Title className="text-lg font-bold mb-2">
                  {title}
                </Dialog.Title>
              )}
              <div className="text-sm text-gray-700">{children}</div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );

  // Render into document.body so it's outside any transformed/overflowing ancestor
  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  // server-side fallback
  return null;
}
