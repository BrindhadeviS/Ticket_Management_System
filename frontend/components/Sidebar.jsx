"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { ROLE_NAV, getInitials } from "@/lib/constants";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Plus,
  Bell,
  CheckCircle,
  Archive,
  Layers,
  BriefcaseBusiness,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

const NAV_ICONS = {
  dash: LayoutDashboard,
  mine: LayoutDashboard,
  users: Users,
  tickets: Ticket,
  new: Plus,
  notifs: Bell,
  approvals: CheckCircle,
  all: Archive,
  pool: Layers,
  work: BriefcaseBusiness,
};

export default function Sidebar() {
  const {
    me,
    view,
    setView,
    setSel,
    setEditing,
    logout,
    tickets,
    poolTickets,
    notifs,
    theme,
    toggleTheme,
  } = useApp();

  if (!me) return null;

  const roleNavItems = ROLE_NAV[me.role] || [];
  const pendingCount = tickets.filter(
    (ticket) =>
      ticket.status === "Pending Approval" &&
      Number(ticket.by) !== Number(me.employee_id || me.id)
  ).length;

  const unreadCount = notifs.filter(
    (notification) =>
      Number(notification.to) === Number(me.employee_id || me.id) &&
      !notification.read
  ).length;

  const poolCount =
    poolTickets.length ||
    tickets.filter((ticket) => ticket.status === "Open" && !ticket.assignee)
      .length;

  const handleNavClick = (key) => {
    setView(key);
    setSel(null);
    setEditing(false);
  };

  return (
    <aside
      className="w-60 flex-none flex flex-col p-3.5 sm:p-4 border-r transition-all select-none"
      style={{
        backgroundColor: "var(--nav)",
        borderColor: "rgba(255, 255, 255, 0.08)",
        color: "var(--nm)",
      }}
    >
      {/* Brand Logo matching Mockup .logo */}
      <div className="flex items-center gap-2.5 px-1.5 pb-4 mb-2 border-b border-white/10">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-white text-base shadow-xs"
          style={{ backgroundColor: "var(--pu)" }}
        >
          T
        </div>
        <div className="leading-tight min-w-0">
          <b className="text-white text-base font-bold tracking-tight block truncate">
            Ladera TMS
          </b>
          <small className="text-xs opacity-70 block font-normal text-white/70">
            Ticket Management
          </small>
        </div>
      </div>

      {/* Nav Buttons matching Mockup .nav */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto py-1">
        {roleNavItems.map(({ key, label }) => {
          const Icon = NAV_ICONS[key] || Ticket;
          const active = view === key;
          const badgeCount =
            key === "approvals"
              ? pendingCount
              : key === "notifs"
              ? unreadCount
              : key === "pool"
              ? poolCount
              : 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleNavClick(key)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-all text-left cursor-pointer ${
                active
                  ? "bg-[#6d5bb8] text-white font-bold shadow-xs"
                  : "text-[#d8d2ec] hover:bg-white/10 hover:text-white font-medium"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={16} className="flex-shrink-0" />
                <span className="truncate">{label}</span>
              </div>

              {badgeCount > 0 && (
                <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-bold bg-[#a33c32] text-white">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile matching Mockup .me */}
      <div className="pt-3 mt-2 border-t border-white/10 flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-2xs"
          style={{ backgroundColor: "var(--pu)" }}
        >
          {getInitials(me.name)}
        </div>

        <div className="min-w-0 flex-1 leading-tight">
          <b className="text-white text-sm font-bold block truncate">
            {me.name}
          </b>
          <small className="text-xs text-white/70 block truncate">
            {me.role}
          </small>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 text-white/80 hover:bg-white/20 hover:text-white cursor-pointer transition-colors"
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <button
            type="button"
            onClick={logout}
            title="Logout"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/10 text-white/80 hover:bg-red-500/30 hover:text-red-300 cursor-pointer transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
