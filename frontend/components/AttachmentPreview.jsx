"use client";

import React, { useEffect, useState } from "react";
import { X, Download, FileText, Image as ImageIcon } from "lucide-react";
import { downloadAttachment } from "@/lib/api";

export default function AttachmentPreview({ isOpen, onClose, fileName, fileUrl, fileSize }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!fileUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadAttachment(fileUrl, fileName);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName || "");
  const isPdf = /\.pdf$/i.test(fileName || "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(40, 33, 63, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: "var(--sf)",
          borderColor: "var(--ln)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching mockup modal */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--ln)" }}>
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
              style={{ backgroundColor: "var(--pu2)", color: "var(--pu)" }}
            >
              {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold truncate text-black dark:text-white">
                {fileName || "Attachment"}
              </h3>
              {fileSize && (
                <p className="text-xs" style={{ color: "var(--mu)" }}>
                  {fileSize} · Preview
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fileUrl && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60 cursor-pointer"
                style={{ borderColor: "var(--ln)", color: "var(--pu)" }}
              >
                <Download size={14} className={isDownloading ? "animate-pulse" : ""} />
                <span>{isDownloading ? "Downloading..." : "Download"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition text-gray-500 hover:text-black dark:hover:text-white"
              style={{ borderColor: "var(--ln)" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview Content Area */}
        <div className="py-5 overflow-auto flex items-center justify-center min-h-[260px] max-h-[60vh] rounded-xl my-2 bg-[#f8f6fd] dark:bg-white/[0.02] border" style={{ borderColor: "var(--ln)" }}>
          {isImage ? (
            <img
              src={fileUrl}
              alt={fileName || "Attachment preview"}
              className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-xs"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextElementSibling.style.display = "flex";
              }}
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-[55vh] rounded-lg border-none"
            />
          ) : null}

          {/* Fallback preview visual matching mockup style */}
          <div
            className={`flex flex-col items-center justify-center text-center p-8 ${isImage || isPdf ? "hidden" : "flex"}`}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl mb-3"
              style={{ backgroundColor: "var(--pu2)", color: "var(--pu)" }}
            >
              <FileText size={32} />
            </div>
            <p className="text-sm font-bold text-black dark:text-white">{fileName}</p>
            <p className="text-xs mt-1" style={{ color: "var(--mu)" }}>
              No inline preview available for this file type. Click Download to open.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
