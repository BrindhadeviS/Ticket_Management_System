"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { EyeIcon, EyeOffIcon } from "@/components/Icons";
import PasswordCheckList from "@/components/PasswordCheckList";
import { getPasswordError } from "@/lib/passwordRules";

export default function ChangePasswordView() {
  const { changePw, err, logout } = useApp();
  const [passwordA, setPasswordA] = useState("");
  const [passwordB, setPasswordB] = useState("");
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);
  const [pwErrors, setPwErrors] = useState({ passwordA: "", passwordB: "" });

  const validate = () => {
    const errs = { passwordA: "", passwordB: "" };
    let isValid = true;

    if (!passwordA) {
      errs.passwordA = "New password is required";
      isValid = false;
    } else {
      const strengthError = getPasswordError(passwordA);
      if (strengthError) {
        errs.passwordA = strengthError;
        isValid = false;
      }
    }

    if (!passwordB) {
      errs.passwordB = "Please confirm your new password";
      isValid = false;
    } else if (passwordA && passwordB !== passwordA) {
      errs.passwordB = "Passwords do not match";
      isValid = false;
    }

    setPwErrors(errs);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const success = await changePw(passwordA, passwordB);

    if (success) {
      setPasswordA("");
      setPasswordB("");
      setPwErrors({ passwordA: "", passwordB: "" });
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Hero Section */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center p-12 lg:p-16 text-white"
        style={{ backgroundColor: "var(--sh)" }}
      >
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-white leading-tight">
            Ticket Management System
          </h1>
          <p className="text-lg opacity-85 leading-relaxed text-[#d4cdf0]">
            Raise, approve and resolve employee tickets in one place.
          </p>
        </div>
      </div>

      {/* Pane */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--tx)" }}>
            Set a new password
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--mu)" }}>
            Your admin gave you a temporary password. Choose your own to continue.
          </p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div>
              <label
                className="block text-sm font-semibold mb-1"
                style={{ color: "var(--tx)" }}
              >
                New password <span style={{ color: "var(--wr)" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showA ? "text" : "password"}
                  value={passwordA}
                  onChange={(e) => {
                    setPasswordA(e.target.value);
                    if (pwErrors.passwordA) setPwErrors((p) => ({ ...p, passwordA: "" }));
                  }}
                  placeholder="Min 8 characters"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-md text-sm border focus:outline-hidden transition-colors"
                  style={{
                    backgroundColor: "var(--sf)",
                    borderColor: "var(--bd)",
                    color: "var(--tx)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowA(!showA)}
                  aria-label={showA ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                >
                  {showA ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>

              <PasswordCheckList password={passwordA} />

              {pwErrors.passwordA && (
                <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--wr)" }}>
                  {pwErrors.passwordA}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-1"
                style={{ color: "var(--tx)" }}
              >
                Confirm new password <span style={{ color: "var(--wr)" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showB ? "text" : "password"}
                  value={passwordB}
                  onChange={(e) => {
                    setPasswordB(e.target.value);
                    if (pwErrors.passwordB) setPwErrors((p) => ({ ...p, passwordB: "" }));
                  }}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-md text-sm border focus:outline-hidden transition-colors"
                  style={{
                    backgroundColor: "var(--sf)",
                    borderColor: "var(--bd)",
                    color: "var(--tx)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowB(!showB)}
                  aria-label={showB ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                >
                  {showB ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              {pwErrors.passwordB ? (
                <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--wr)" }}>
                  {pwErrors.passwordB}
                </p>
              ) : (
                passwordB &&
                passwordA !== passwordB && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--wr)" }}>
                    Passwords do not match
                  </p>
                )
              )}
            </div>

            {err && (
              <p className="text-xs font-medium" style={{ color: "var(--wr)" }}>
                {err}
              </p>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded-md font-semibold text-white shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
              style={{ backgroundColor: "var(--ac)" }}
            >
              Save password
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={logout}
              className="text-sm font-semibold hover:underline cursor-pointer"
              style={{ color: "var(--ac)" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}