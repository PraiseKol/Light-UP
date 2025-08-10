import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Menu } from "lucide-react"; // You can change icons

/**
 * CollapsibleSidebar
 * @param {string} side - "left" or "right"
 * @param {boolean} isOpen - Sidebar open state
 * @param {function} onToggle - Function to toggle sidebar
 * @param {ReactNode} children - Content inside sidebar
 * @param {boolean} mobileOnly - If true, only show in mobile view
 * @param {boolean} desktopOnly - If true, only show in desktop view
 */
export default function CollapsibleSidebar({
  side = "left",
  isOpen,
  onToggle,
  children,
  mobileOnly = false,
  desktopOnly = false,
}) {
  const sidebarWidth = 280; // adjust as needed

  const slideVariants = {
    hidden: { x: side === "left" ? -sidebarWidth : sidebarWidth },
    visible: { x: 0 },
    exit: { x: side === "left" ? -sidebarWidth : sidebarWidth },
  };

  return (
    <div
      className={`
        fixed top-0 ${side === "left" ? "left-0" : "right-0"} h-screen z-40
        ${mobileOnly ? "md:hidden" : ""} ${desktopOnly ? "hidden md:block" : ""}
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`absolute top-4 ${
          side === "left" ? "left-4" : "right-4"
        } z-50 bg-white rounded-full p-2 shadow-md`}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={slideVariants}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ width: sidebarWidth }}
            className="h-full bg-white shadow-lg overflow-y-auto p-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
