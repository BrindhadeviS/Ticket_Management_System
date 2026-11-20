"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import Sidebar from "@/components/Sidebar";
import SignInView from "@/components/views/SignInView";
import ForgotPasswordView from "@/components/views/ForgotPasswordView";
import ChangePasswordView from "@/components/views/ChangePasswordView";
import TicketListView from "@/components/views/TicketListView";
import TicketDetailView from "@/components/views/TicketDetailView";
import NewTicketView from "@/components/views/NewTicketView";
import EmployeesView from "@/components/views/EmployeesView";
import NotificationsView from "@/components/views/NotificationsView";
import DashboardView from "@/components/views/DashboardView";

export default function Home() {
  const { me, view, sel, forgot, mounted, tickets, poolTickets, assignedTickets } = useApp();

  // Prevent SSR hydration mismatch
  if (!mounted) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: "var(--bg)", color: "var(--tx)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide">Loading TMS...</p>
        </div>
      </div>
    );
  }

  // 1. Forced Password Change if user was given temporary credentials
  if (me && me.must) {
    return <ChangePasswordView />;
  }

  // 2. Forgot Password Flow
  if (!me && forgot) {
    return <ForgotPasswordView />;
  }

  // 3. Sign In Flow
  if (!me) {
    return <SignInView />;
  }

  // 4. Authenticated Application
  const renderActiveView = () => {
    // If a ticket is selected, display detail view
    if (sel) {
      return <TicketDetailView />;
    }

    switch (view) {
      case "dash":
        return <DashboardView mode={me.role === "Employee" ? "employee" : "all"} />;
      case "mine":
        return <DashboardView mode={me.role === "Employee" ? "employee" : "my"} />;
      case "notifs":
        return <NotificationsView />;
      case "users":
        return <EmployeesView />;
      case "new":
        return <NewTicketView />;
      case "tickets":
        return (
          <TicketListView
            title="All Tickets"
            subtitle="Every ticket in the organization."
            tickets={tickets}
            emptyMessage="No tickets available."
          />
        );
      case "approvals":
        return (
          <TicketListView
            title="Awaiting Approval"
            subtitle="Tickets waiting for manager / approver decision"
            tickets={tickets.filter((t) => t.status === "Pending Approval")}
            emptyMessage="Nothing to review right now."
            hideStatusFilter={true}
            hideAssigneeFilter={true}
          />
        );
      case "all":
        return (
          <TicketListView
            title="All Reviewed"
            subtitle="All tickets with recorded approval or rejection decisions"
            tickets={tickets.filter((t) => t.approver)}
            emptyMessage="No reviewed tickets yet."
          />
        );
      case "pool":
        return (
          <TicketListView
            title="Ticket Pool"
            subtitle="Approved tickets waiting for an engineer."
            tickets={poolTickets}
            emptyMessage="No approved tickets in the pool yet."
          />
        );
      case "work":
        return (
          <TicketListView
            title="My Assigned Work"
            subtitle="Tickets currently assigned to you for resolution"
            tickets={assignedTickets}
            emptyMessage="No tickets are assigned to you."
          />
        );
      default:
        return <DashboardView mode={me.role === "Employee" ? "employee" : "all"} />;
    }
  };

  return (
    <div
      className="shell flex h-screen overflow-hidden"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* Left Sidebar matching Mockup aside */}
      <Sidebar />

      {/* Main Content Area matching Mockup main */}
      <main
        className={`flex-1 min-w-0 flex flex-col overflow-x-hidden ${
          sel || view === "new"
            ? "lg:overflow-y-hidden overflow-y-auto p-3 sm:p-4 lg:p-4 h-full"
            : "overflow-y-auto hidden-scroll p-3.5 sm:p-5 lg:p-6"
        }`}
      >
        <div className="w-full flex-1 flex flex-col min-h-0 h-full">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}
