// src/components/ui/modal.jsx
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Modal({ isOpen, onClose, title, icon, children, className }) {
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* center container uses fixed on viewport and will not be affected by parent transforms when portalled */}
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="scale-95 opacity-0" enterTo="scale-100 opacity-100"
            leave="ease-in duration-200" leaveFrom="scale-100 opacity-100" leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel
              className={cn(
                // default panel styles — matches the app's candy-3D modal system
                "modal-3d relative w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col",
                className
              )}
            >
              {title && (
                <div className="modal-3d-header sticky top-0 z-10 flex items-center justify-between p-4 rounded-t-2xl flex-shrink-0">
                  <Dialog.Title className="text-lg sm:text-xl font-black flex items-center gap-2">
                    {icon && <span className="text-xl sm:text-2xl">{icon}</span>}
                    {title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1.5 transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              <div className="text-sm text-gray-700 p-4 overflow-y-auto flex-1">{children}</div>
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
