"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { MoonIcon, SunIcon } from "@/components/Icons";

export default function Header({ mobileOpen, setMobileOpen }) {
  const { me, theme, toggleTheme } = useApp();

  if (!me) return null;

  return (
    <header
      className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
      style={{
        backgroundColor: "var(--sf)",
        borderColor: "var(--bd)"
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          className="p-1.5 rounded-md border text-sm font-semibold"
          style={{ borderColor: "var(--bd)" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold text-base tracking-wide" style={{ color: "var(--tx)" }}>
          TMS
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
        >
          {theme === "light" ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
        </button>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
          style={{ backgroundColor: "#8b7bd8" }}
        >
          {me.name.charAt(0)}
        </div>
      </div>
    </header>
  );
}
