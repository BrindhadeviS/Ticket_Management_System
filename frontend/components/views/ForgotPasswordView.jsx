"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";

export default function ForgotPasswordView() {
  const { requestReset, sent, setForgot, setSent } = useApp();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const validate = () => {
    const trimmed = email.trim();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!trimmed) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(trimmed)) {
      setEmailError("Please enter a valid email address (e.g. name@ladera.com)");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    requestReset(email);
  };

  const handleBack = () => {
    setForgot(false);
    setSent(false);
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
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--tx)" }}>
            Reset your password
          </h1>

          {sent ? (
            <div
              className="p-4 rounded-lg border text-sm leading-relaxed mb-6"
              style={{
                backgroundColor: "var(--ac2)",
                borderColor: "var(--bd)",
                color: "var(--tx)"
              }}
            >
              <p className="font-semibold mb-2">Request submitted successfully</p>
              <p>
                If that email belongs to an active account, your admin has been notified.
                They will reset your password and share a temporary one. You will choose a
                new password when you sign in.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm mb-6" style={{ color: "var(--mu)" }}>
                Enter your work email. Your admin will reset your password and give you a
                temporary one.
              </p>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <div>
                  <label
                    className="block text-sm font-semibold mb-1"
                    style={{ color: "var(--tx)" }}
                  >
                    Work email <span style={{ color: "var(--wr)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    placeholder="name@ladera.com"
                    className="w-full px-3.5 py-2.5 rounded-md text-sm border focus:outline-hidden transition-colors"
                    style={{
                      backgroundColor: "var(--sf)",
                      borderColor: "var(--bd)",
                      color: "var(--tx)"
                    }}
                  />
                  {emailError && (
                    <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--wr)" }}>
                      {emailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 rounded-md font-semibold text-white shadow-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                  style={{ backgroundColor: "var(--ac)" }}
                >
                  Request reset
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm font-semibold hover:underline cursor-pointer"
              style={{ color: "var(--ac)" }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
