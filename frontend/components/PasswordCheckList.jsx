"use client";

import React from "react";
import { passwordChecks } from "@/lib/passwordRules";

export default function PasswordChecklist({ password }) {
  if (!password) return null;

  return (
    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs">
      {passwordChecks(password).map((c) => (
        <li
          key={c.label}
          className="font-medium"
          style={{ color: c.ok ? "#237a4a" : "var(--mu)" }}
        >
          {c.ok ? "✓" : "○"} {c.label}
        </li>
      ))}
    </ul>
  );
}