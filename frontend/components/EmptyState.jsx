"use client";

import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({
  title = "No data available",
  message = "There are no records to display at this moment.",
  icon: Icon = Inbox,
  action = null,
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border transition-all ${
        compact ? "py-8 px-4" : "py-12 px-6"
      }`}
      style={{
        backgroundColor: "var(--sf)",
        borderColor: "var(--bd)",
      }}
    >
      <div
        className="flex items-center justify-center rounded-2xl mb-3 shadow-xs"
        style={{
          width: compact ? "44px" : "56px",
          height: compact ? "44px" : "56px",
          backgroundColor: "rgba(109, 91, 184, 0.08)",
          color: "var(--ac)",
        }}
      >
        <Icon size={compact ? 22 : 28} strokeWidth={1.75} />
      </div>

      <h3
        className="font-bold tracking-tight text-black dark:text-white"
        style={{ fontSize: compact ? "14px" : "15px" }}
      >
        {title}
      </h3>

      {message && (
        <p
          className="mt-1 max-w-sm text-xs font-normal"
          style={{ color: "var(--mu)" }}
        >
          {message}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
