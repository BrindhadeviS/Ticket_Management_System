"use client";

import Link from "next/link";

export default function Register() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div
        className="w-full max-w-md rounded-xl p-8 border shadow-lg text-center"
        style={{
          backgroundColor: "var(--sf)",
          borderColor: "var(--bd)"
        }}
      >
        <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-xl mb-4">
          TMS
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "var(--tx)" }}>
          Admin-Managed Accounts
        </h1>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--mu)" }}>
          Self-registration is disabled. Employee accounts are created and provisioned exclusively by your organization's Administrator.
        </p>

        <div
          className="p-4 rounded-lg border text-xs text-left mb-6"
          style={{
            backgroundColor: "var(--ac2)",
            borderColor: "var(--bd)",
            color: "var(--tx)"
          }}
        >
          <p className="font-semibold mb-1">Need access?</p>
          <p>
            Please contact your IT administrator or HR department to create your corporate account. Once created, you will receive your login credentials.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block w-full py-2.5 px-4 rounded-md font-semibold text-white shadow-sm hover:opacity-90 transition-opacity text-sm"
          style={{ backgroundColor: "var(--ac)" }}
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}
