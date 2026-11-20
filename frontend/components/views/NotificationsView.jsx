"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import EmptyState from "@/components/EmptyState";
import { Bell } from "lucide-react";

export default function NotificationsView() {
  const { notifs, me, markAllRead, openNotification } = useApp();

  const currentUserId = Number(me?.employee_id || me?.id);

  const userNotifs = notifs
    .map((n, originalIndex) => ({ ...n, originalIndex }))
    .filter((n) => Number(n.to) === currentUserId);

  const hasUnread = userNotifs.some((n) => !n.read);

  return (
    <div className="max-w-4xl space-y-4">
      {/* Bar */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--ln)" }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--mu)" }}>
            Your in-app notification history.
          </p>
        </div>

        {hasUnread && (
          <button
            type="button"
            onClick={markAllRead}
            className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            style={{
              backgroundColor: "var(--sf)",
              borderColor: "var(--ln)",
              color: "var(--tx)",
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      {userNotifs.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No data available"
          message="You have no notifications at this time."
        />
      ) : (
        <div
          className="rounded-xl border divide-y overflow-hidden shadow-xs"
          style={{
            backgroundColor: "var(--sf)",
            borderColor: "var(--ln)",
          }}
        >
          {userNotifs.map((n) => (
            <div
              key={n.originalIndex}
              onClick={() => openNotification(n.originalIndex)}
              className="px-4 py-3 flex items-start justify-between gap-4 cursor-pointer transition-colors hover:bg-[#fbfaff] dark:hover:bg-white/5"
              style={{
                backgroundColor: !n.read ? "var(--pu2)" : "transparent",
              }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                  style={{
                    backgroundColor: !n.read ? "var(--pu)" : "transparent",
                    border: "1px solid var(--pu)",
                  }}
                />
                <div className="min-w-0">
                  <p
                    className={`text-sm text-black dark:text-white ${
                      !n.read ? "font-bold" : "font-semibold"
                    }`}
                  >
                    {n.title || n.text}
                  </p>
                  {n.message && (
                    <p
                      className="text-xs mt-0.5 break-words"
                      style={{ color: "var(--mu)" }}
                    >
                      {n.message}
                    </p>
                  )}
                </div>
              </div>
              <span
                className="text-xs whitespace-nowrap mt-0.5"
                style={{ color: "var(--mu)" }}
              >
                {n.t}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}