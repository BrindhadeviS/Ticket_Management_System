"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

export default function Toast() {
  const { toast } = useApp();

  if (!toast.visible) return null;

  if (toast.onConfirm) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
          style={{ backgroundColor: "var(--sf)", borderColor: "var(--bd)" }}
        >
          <div
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--ac2)", color: "var(--ac)" }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M10.3 3.86 2.7 17.2A2 2 0 0 0 4.43 20h15.14a2 2 0 0 0 1.73-2.8L13.73 3.86a2 2 0 0 0-3.46 0Z" />
            </svg>
          </div>
          <h2 id="confirm-title" className="text-lg font-bold" style={{ color: "var(--tx)" }}>
            Please confirm
          </h2>
          <p id="confirm-message" className="mt-2 text-sm leading-6" style={{ color: "var(--mu)" }}>
            {toast.message}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={toast.onCancel}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
              style={{ borderColor: "var(--bd)", color: "var(--tx)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={toast.onConfirm}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--wr)" }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-xl"
      style={{ background: "var(--sh)" }}
    >
      <span className="leading-snug">{toast.message}</span>
    </div>
  );
}
