"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const canUseDom = typeof document !== "undefined";

  useEffect(() => {
    if (!canUseDom) return;
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [canUseDom, isOpen]);

  if (!canUseDom) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-200"
              role="dialog"
              aria-modal="true"
              aria-busy={isLoading || undefined}
            >
              <div className="relative p-6">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  aria-disabled={isLoading || undefined}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${isDestructive ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-lg font-semibold text-gray-900 leading-none">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    onClick={onCancel}
                    disabled={isLoading}
                    aria-disabled={isLoading || undefined}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    aria-disabled={isLoading || undefined}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      isDestructive
                        ? "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 shadow-rose-200"
                        : "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 shadow-emerald-200"
                    } ${isLoading ? "opacity-75 cursor-wait" : "hover:scale-105"}`}
                  >
                    {isLoading ? "Processing..." : confirmLabel}
                  </button>
                </div>
              </div>
              
              {isLoading && (
                 <div className="absolute inset-0 bg-white/50 z-10" aria-hidden="true" />
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
