"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { EyeIcon, EyeOffIcon } from "@/components/Icons";

export default function SignInView() {
  const { login, err, setForgot, setErr } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

  const validate = () => {
    const nextErrors = { email: "", password: "" };
    let isValid = true;
    const trimmedEmail = email.trim();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!trimmedEmail) {
      nextErrors.email = "Email is required";
      isValid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address (e.g. name@ladera.com)";
      isValid = false;
    }

    if (!password) {
      nextErrors.password = "Password is required";
      isValid = false;
    }

    setFieldErrors(nextErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (err) setErr("");

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Banner matching Mockup .lb */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center p-12 lg:p-16 text-white"
        style={{
          background: "linear-gradient(150deg, #2b2447, #6d5bb8)",
        }}
      >
        <div className="max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white text-lg shadow-sm"
              style={{ backgroundColor: "var(--pu)" }}
            >
              T
            </div>
            <b className="text-white text-xl font-bold tracking-tight">
              Ladera TMS
            </b>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight mb-3 text-white leading-tight">
            Raise it. Approve it. Resolve it.
          </h2>
          <p className="text-base text-white/85 leading-relaxed mb-6">
            One place to create tickets, route approvals and track every resolution.
          </p>

          <ul className="space-y-2 text-sm text-white/90">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Role-based dashboards & queues
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Approval and clarification workflow
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Email and in-app notifications
            </li>
          </ul>
        </div>
      </div>

      {/* Right Form Pane matching Mockup .lf */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-black dark:text-white">
              Sign in
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--mu)" }}>
              Use the credentials issued by your Admin.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {(() => {
              const isEmailErr =
                Boolean(err) &&
                (err.toLowerCase().includes("user") ||
                  err.toLowerCase().includes("email") ||
                  err.toLowerCase().includes("account") ||
                  err.toLowerCase().includes("inactive"));
              const isPwErr = Boolean(err) && !isEmailErr;

              return (
                <>
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5"
                    >
                      Email <span style={{ color: "var(--rd)" }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: "" }));
                        }
                        if (err) setErr("");
                      }}
                      placeholder="name@ladera.com"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                      style={{
                        backgroundColor: "var(--sf)",
                        borderColor: "var(--ln)",
                      }}
                    />
                    {fieldErrors.email ? (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {fieldErrors.email}
                      </p>
                    ) : isEmailErr ? (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {err}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5"
                    >
                      Password <span style={{ color: "var(--rd)" }}>*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors((prev) => ({ ...prev, password: "" }));
                          }
                          if (err) setErr("");
                        }}
                        placeholder="Enter password"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                        style={{
                          backgroundColor: "var(--sf)",
                          borderColor: "var(--ln)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password ? (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {fieldErrors.password}
                      </p>
                    ) : isPwErr ? (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {err}
                      </p>
                    ) : null}
                  </div>
                </>
              );
            })()}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg font-bold text-white shadow-xs hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-sm disabled:opacity-50"
              style={{ backgroundColor: "var(--pu)" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="text-center mt-1">
              <button
                type="button"
                onClick={() => setForgot(true)}
                className="text-xs font-bold hover:underline cursor-pointer"
                style={{ color: "var(--pu)" }}
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
