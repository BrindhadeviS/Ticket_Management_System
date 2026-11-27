"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { fetchDashboardSummary } from "@/lib/api";
import EmptyState from "@/components/EmptyState";
import TicketListView from "@/components/views/TicketListView";
import {
  Ticket,
  Clock3,
  CheckCircle2,
  Users,
  AlertCircle,
  Flame,
  PieChart as PieIcon,
  ShieldAlert,
  AlertTriangle,
  Info,
} from "lucide-react";

// Wave SVG decoration matching Reference Image 1
function CardWave({ fromColor = "#6d5bb8", toColor = "#a494e8", id = "wave-grad" }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-11 sm:h-12 overflow-hidden pointer-events-none rounded-b-xl">
      <svg
        viewBox="0 0 320 60"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={fromColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={toColor} stopOpacity="0.10" />
          </linearGradient>
          <linearGradient id={`line-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={fromColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor={toColor} stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Layer 1 Soft Gradient Wave */}
        <path
          d="M 0 35 C 50 15, 110 50, 170 30 C 230 10, 270 45, 320 25 L 320 60 L 0 60 Z"
          fill={`url(#grad-${id})`}
        />

        {/* Layer 2 Smooth Wave Stroke */}
        <path
          d="M 0 38 C 60 18, 120 48, 180 28 C 240 8, 280 42, 320 28"
          fill="none"
          stroke={`url(#line-${id})`}
          strokeWidth="2"
        />

        {/* Layer 3 Decorative Secondary Stroke */}
        <path
          d="M 0 45 C 50 28, 110 55, 170 38 C 230 20, 280 48, 320 38"
          fill="none"
          stroke={`url(#line-${id})`}
          strokeWidth="1.2"
          strokeOpacity="0.5"
        />
      </svg>
    </div>
  );
}

// Semi-circular gauge chart replacing vertical bar chart (Reference Image 2)
function SemiCirclePriorityChart({ priorityStats, className = "", compact = false }) {
  const { critical, high, medium, low, total } = priorityStats;

  const cx = 140;
  const cy = 115;
  const R = 105;
  const r = 74;

  const categories = [
    {
      id: "critical",
      label: "Critical",
      count: critical,
      color: "#8b1e3f",
      icon: Flame,
    },
    {
      id: "high",
      label: "High",
      count: high,
      color: "#c9594e",
      icon: AlertTriangle,
    },
    {
      id: "medium",
      label: "Medium",
      count: medium,
      color: "#e0a52a",
      icon: ShieldAlert,
    },
    {
      id: "low",
      label: "Low",
      count: low,
      color: "#2f9e63",
      icon: Info,
    },
  ];

  const leftCategories = categories.slice(0, 2); // Critical, High
  const rightCategories = categories.slice(2); // Medium, Low

  let currentAngle = Math.PI; // 180 degrees (left)
  const arcSegments = categories.map((cat) => {
    const fraction = total > 0 ? cat.count / total : 0;
    const sweep = fraction * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle - sweep;
    currentAngle = endAngle;

    if (sweep === 0) return null;

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy - R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy - R * Math.sin(endAngle);

    const x3 = cx + r * Math.cos(endAngle);
    const y3 = cy - r * Math.sin(endAngle);
    const x4 = cx + r * Math.cos(startAngle);
    const y4 = cy - r * Math.sin(startAngle);

    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return { ...cat, d };
  }).filter(Boolean);

  // Compact layout for Support Team: split into Left (half-circle gauge) and Right (priority boxes)
  if (compact) {
    return (
      <div
        className={`rounded-xl border shadow-xs flex flex-col justify-between p-3 sm:p-3.5 h-full ${className}`}
        style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
      >
        <div
          className="flex items-center gap-2 border-b pb-1.5 mb-1.5"
          style={{ borderColor: "var(--ln)" }}
        >
          <div
            className="flex h-4.5 w-4.5 items-center justify-center rounded-md"
            style={{ backgroundColor: "var(--pu2)", color: "var(--pu)" }}
          >
            <PieIcon size={11} />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-black dark:text-white">
            Tickets by Priority
          </h2>
        </div>

        <div className="flex-1 flex items-center justify-between gap-2.5 sm:gap-3.5 px-0.5 min-h-0">
          {/* Left: Half-Circle Gauge */}
          <div className="flex-shrink-0 flex items-center justify-center w-[140px] sm:w-[175px]">
            <svg
              viewBox="0 0 280 126"
              className="w-full max-w-[145px] sm:max-w-[500px] overflow-visible"
            >
              <path
                d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy} Z`}
                fill="currentColor"
                className="text-black/[0.06] dark:text-white/[0.06]"
              />
              {arcSegments.map((seg) => (
                <path
                  key={seg.id}
                  d={seg.d}
                  fill={seg.color}
                  className="transition-all duration-300 hover:opacity-90"
                />
              ))}
              <text
                x={cx}
                y={cy - 20}
                textAnchor="middle"
                className="text-2xl sm:text-3xl font-black fill-black dark:fill-white font-mono"
                style={{ fontWeight: 800 }}
              >
                {total}
              </text>
              <text
                x={cx}
                y={cy - 3}
                textAnchor="middle"
                className="text-[16px] font-bold uppercase tracking-wider fill-neutral-600 dark:fill-neutral-300"
                style={{ fontWeight: 700, letterSpacing: "0.06em" }}
              >
                Tickets
              </text>
            </svg>
          </div>

          {/* Right: Priority Box List displayed in 2x2 order */}
          <div className="flex-1 grid grid-cols-2 gap-5 min-w-0">
            {categories.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors border"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--ln)",
                    borderLeft: `3px solid ${item.color}`,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex h-4 w-4 items-center justify-center rounded-xs flex-shrink-0"
                      style={{
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                      }}
                    >
                      <IconComponent size={10} />
                    </div>
                    <span className="font-bold text-black dark:text-white truncate text-xs">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-extrabold font-mono text-black dark:text-white text-xs pl-1">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Standard (non-compact) view for Admin / Approver / My Dashboard
  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full ${className}`}
      style={{
        backgroundColor: "var(--sf)",
        borderColor: "var(--ln)",
      }}
    >
      <div className="flex items-center gap-2 pb-2.5 border-b mb-2" style={{ borderColor: "var(--ln)" }}>
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ backgroundColor: "var(--pu2)", color: "var(--pu)" }}
        >
          <PieIcon size={14} />
        </div>
        <h2 className="text-sm font-bold text-black dark:text-white">
          Tickets by Priority
        </h2>
      </div>

      {/* Top Section: Wider Half-Circle Gauge with Count & Tickets inside the circle */}
      <div className="flex-1 flex flex-col items-center justify-center py-1 sm:py-2">
        <svg viewBox="0 0 280 126" className="w-full max-w-[260px] sm:max-w-[290px] lg:max-w-[320px] overflow-visible">
          {/* Base track */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} L ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy} Z`}
            fill="currentColor"
            className="text-black/[0.06] dark:text-white/[0.06]"
          />

          {/* Segments */}
          {arcSegments.map((seg) => (
            <path
              key={seg.id}
              d={seg.d}
              fill={seg.color}
              className="transition-all duration-300 hover:opacity-90"
            />
          ))}

          {/* Label count & tickets placed inside the circle with small font */}
          <text
            x={cx}
            y={cy - 20}
            textAnchor="middle"
            className="text-xl sm:text-2xl font-black fill-black dark:fill-white font-mono"
            style={{ fontWeight: 800 }}
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider fill-neutral-600 dark:fill-neutral-300"
            style={{ fontWeight: 700, letterSpacing: "0.06em" }}
          >
            Tickets
          </text>
        </svg>
      </div>

      {/* Bottom Section: Split vertically - Left: Critical & High | Right: Medium & Low */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-2">
        {/* Left Column: Critical & High */}
        <div className="space-y-2">
          {leftCategories.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg p-2 sm:p-2.5 transition-colors border"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--ln)",
                  borderLeft: `4px solid ${item.color}`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0"
                    style={{
                      backgroundColor: `${item.color}15`,
                      color: item.color,
                    }}
                  >
                    <IconComponent size={13} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-black dark:text-white truncate">
                    {item.label}
                  </span>
                </div>

                <span className="text-sm sm:text-base font-extrabold font-mono text-black dark:text-white pl-2">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Column: Medium & Low */}
        <div className="space-y-2">
          {rightCategories.map((item) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg p-2 sm:p-2.5 transition-colors border"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--ln)",
                  borderLeft: `4px solid ${item.color}`,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0"
                    style={{
                      backgroundColor: `${item.color}15`,
                      color: item.color,
                    }}
                  >
                    <IconComponent size={13} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-black dark:text-white truncate">
                    {item.label}
                  </span>
                </div>

                <span className="text-sm sm:text-base font-extrabold font-mono text-black dark:text-white pl-2">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Status Donut/Pie chart
function StatusDonutChart({ donutData, compact = false, className = "" }) {
  return (
    <div
      className={`rounded-xl border shadow-xs flex flex-col justify-between ${
        compact ? "p-3 sm:p-3.5 h-full" : "p-5 h-full"
      } ${className}`}
      style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
    >
      <div
        className="flex items-center justify-between border-b pb-1.5 mb-1.5"
        style={{ borderColor: "var(--ln)" }}
      >
        <h2 className="text-xs sm:text-sm font-bold text-black dark:text-white">
          Tickets by Status
        </h2>
        <span className="text-[11px] font-bold text-gray-500">
          {donutData.total} Total
        </span>
      </div>

      <div
        className={`flex-1 flex items-center justify-between text-2xl ${
          compact
            ? "gap-2.5 sm:gap-3.5 px-0.5 min-h-0"
            : "flex-col sm:flex-row justify-center gap-6 py-3"
        }`}
      >
        <div
          className={`flex-shrink-0 flex items-center justify-center ${
            compact ? "w-[140px] sm:w-[155px]" : ""
          }`}
        >
          <div
            className={`relative flex ${
              compact ? "h-[120px] w-[120px] sm:h-[130px] sm:w-[130px]" : "h-36 w-36"
            } flex-shrink-0 items-center justify-center rounded-full shadow-xs`}
            style={{
              background: donutData.total
                ? `conic-gradient(${donutData.gradientStops})`
                : "#eee",
            }}
          >
            <div
              className={`flex ${
                compact ? "h-[65px] w-[65px] sm:h-[72px] sm:w-[72px]" : "h-20 w-20"
              } flex-col items-center justify-center rounded-full shadow-inner`}
              style={{ backgroundColor: "var(--sf)" }}
            >
              <span
                className={`${
                  compact ? "text-lg sm:text-xl" : "text-xl"
                } font-extrabold text-black dark:text-white leading-none`}
              >
                {donutData.total}
              </span>
              <span
                className={`${
                  compact ? "text-[8px] sm:text-[9px]" : "text-xs"
                } font-bold text-gray-500 mt-0.5`}
              >
                Tickets
              </span>
            </div>
          </div>
        </div>

        <div
          className={`flex-1 ${
            compact ? "min-w-[120px] space-y-1" : "min-w-[140px] space-y-2"
          } text-sm`}
        >
          {donutData.counts.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-xs flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-black dark:text-gray-200 font-medium text-[13px]">
                  {item.label}
                </span>
              </div>
              <strong className="text-black dark:text-white font-mono text-sm pl-1">
                {item.count}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Category counts chart component
function CategoryChart({ categoryCounts, maxCat, className = "" }) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-xs flex flex-col h-full max-h-[380px] ${className}`}
      style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
    >
      <div className="border-b pb-2.5 mb-3" style={{ borderColor: "var(--ln)" }}>
        <h2 className="text-sm font-bold text-black dark:text-white">
          Tickets by Category
        </h2>
      </div>

      {categoryCounts.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No data available"
          message="No category breakdown available yet."
          compact
        />
      ) : (
        <div className="flex-1 overflow-y-auto hidden-scroll space-y-3 py-1">
          {categoryCounts.map((c) => (
            <div key={c.category} className="group">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-black dark:text-white">
                  {c.category}
                </span>
                <b className="font-mono text-black dark:text-white">{c.count}</b>
              </div>
              <div className="h-2 w-full rounded-full bg-[#eeeafb] dark:bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(c.count / maxCat) * 100}%`,
                    backgroundColor: "var(--pu)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ mode = "all" }) {
  const {
    me,
    tickets,
    poolTickets,
    assignedTickets,
    setSel,
    setView,
    getUser,
    decide,
    takeTicket,
    categoryList,
    departments: appDepartments,
  } = useApp();

  const [dbSummary, setDbSummary] = useState(null);
  const [activeKpiFilterId, setActiveKpiFilterId] = useState(null);
  const currentId = Number(me?.employee_id || me?.id);
  const role = me?.role || "Employee";

  // Mode: "all" (All Tickets Dashboard), "my" (My Dashboard), or "employee" (Employee Dashboard)
  const isEmployeeRole = role === "Employee";
  const isEmployeeMode = isEmployeeRole || mode === "employee";
  const isMyMode = !isEmployeeRole && mode === "my";
  const isScopeMy = isMyMode || isEmployeeMode;
  const isSupportAllTickets = role === "Support Team" && !isScopeMy;

  // Live PostgreSQL summary poll
  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      const summary = await fetchDashboardSummary();
      if (isMounted && summary) {
        setDbSummary(summary);
      }
    }
    loadSummary();
    const interval = setInterval(loadSummary, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [me]);

  // Combined scoped tickets directly from PostgreSQL
  const allTickets = useMemo(() => {
    const map = new Map();
    [...tickets, ...poolTickets, ...assignedTickets].forEach((t) => {
      if (t?.id) map.set(t.id, t);
    });
    return [...map.values()];
  }, [tickets, poolTickets, assignedTickets]);

  const myTickets = useMemo(() => {
    return allTickets.filter((t) => Number(t.by) === currentId);
  }, [allTickets, currentId]);

  const pendingApprovals = useMemo(() => {
    return allTickets.filter((t) => t.status === "Pending Approval");
  }, [allTickets]);

  const poolList = useMemo(() => {
    return allTickets.filter((t) => t.status === "Open" && !t.assignee);
  }, [allTickets]);

  const myAssigned = useMemo(() => {
    return allTickets.filter((t) => Number(t.assignee) === currentId);
  }, [allTickets, currentId]);

  const countStatus = (list, s) => list.filter((t) => t.status === s).length;

  // Mockup SB status styling
  const SB = {
    Open: { bg: "#e9edff", text: "#454f9b" },
    "In Progress": { bg: "#eaf4fb", text: "#25638b" },
    Pending: { bg: "#eaf4fb", text: "#25638b" },
    "Pending Approval": { bg: "#fff5d9", text: "#95630b" },
    "Clarification Needed": { bg: "#f4eafa", text: "#7b3996" },
    Resolved: { bg: "#e8f6ed", text: "#237a4a" },
    Rejected: { bg: "#fff0ed", text: "#a33c32" },
  };

  const SC = {
    "Pending Approval": "#e0a52a",
    Open: "#5b6bd6",
    "In Progress": "#3b8fc4",
    Pending: "#3b8fc4",
    "Clarification Needed": "#a45bc7",
    Resolved: "#2f9e63",
    Rejected: "#c9594e",
  };

  const getStatusBadge = (status) => {
    const s = SB[status] || { bg: "#eee", text: "#555" };
    return (
      <span
        className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
        style={{ backgroundColor: s.bg, color: s.text }}
      >
        {status}
      </span>
    );
  };

  const getPriorityDot = (p) => {
    const colors = {
      Critical: "text-[#8b1e3f]",
      High: "text-[#c9594e]",
      Medium: "text-[#e0a52a]",
      Low: "text-[#2f9e63]",
    };
    return (
      <span className={`text-xs font-bold ${colors[p] || colors.Medium}`}>
        ● {p || "Medium"}
      </span>
    );
  };

  // Top KPI Cards with themed wave curves matching role requirements
  const kpis = useMemo(() => {
    // 1. Employee Dashboard (Always 6 KPI cards for Employee role)
    if (role === "Employee" || isEmployeeMode) {
      const pendingTickets = myTickets.filter((t) => t.status === "Pending Approval");
      const clarificationTickets = myTickets.filter((t) => t.status === "Clarification Needed");
      const approvedTickets = myTickets.filter((t) =>
        ["In Progress", "Open"].includes(t.status)
      );
      const rejectedTickets = myTickets.filter((t) => t.status === "Rejected");
      const resolvedTickets = myTickets.filter((t) => t.status === "Resolved");

      return [
        {
          id: "myt",
          label: "My Tickets",
          value: myTickets.length,
          waveFrom: "#7E6DC2",
          waveTo: "#BDB2ED",
          tickets: myTickets,
        },
        {
          id: "pend",
          label: "Pending Approval",
          value: pendingTickets.length,
          waveFrom: "#95630b",
          waveTo: "#e0a52a",
          tickets: pendingTickets,
        },
        {
          id: "clar",
          label: "Clarification Needed",
          value: clarificationTickets.length,
          waveFrom: "#7b3996",
          waveTo: "#b15fdb",
          tickets: clarificationTickets,
        },
        {
          id: "appr",
          label: "Approved",
          value: approvedTickets.length,
          waveFrom: "#1f6d34",
          waveTo: "#2f9e63",
          tickets: approvedTickets,
        },
        {
          id: "rej",
          label: "Rejected",
          value: rejectedTickets.length,
          waveFrom: "#a33c32",
          waveTo: "#e06354",
          tickets: rejectedTickets,
        },
        {
          id: "res",
          label: "Resolved",
          value: resolvedTickets.length,
          waveFrom: "#237a4a",
          waveTo: "#48c774",
          tickets: resolvedTickets,
        },
      ];
    }

    // 2. My Dashboard (For other roles: Admin, Approver, Support Team viewing their own tickets)
    if (isMyMode) {
      const inProgressTickets = myTickets.filter((t) =>
        ["In Progress", "Open", "Pending"].includes(t.status)
      );
      const clarificationTickets = myTickets.filter((t) => t.status === "Clarification Needed");
      const resolvedTickets = myTickets.filter((t) => t.status === "Resolved");

      return [
        {
          id: "mine",
          label: "My Tickets",
          value: myTickets.length,
          waveFrom: "#6d5bb8",
          waveTo: "#907ee6",
          tickets: myTickets,
        },
        {
          id: "inpr",
          label: "In Progress",
          value: inProgressTickets.length,
          waveFrom: "#25638b",
          waveTo: "#4a86e8",
          tickets: inProgressTickets,
        },
        {
          id: "clar",
          label: "Clarification Needed",
          value: clarificationTickets.length,
          waveFrom: "#7b3996",
          waveTo: "#b15fdb",
          tickets: clarificationTickets,
        },
        {
          id: "res",
          label: "Resolved",
          value: resolvedTickets.length,
          waveFrom: "#237a4a",
          waveTo: "#48c774",
          tickets: resolvedTickets,
        },
      ];
    }

    // 3. Support Team (All Tickets Dashboard)
    if (role === "Support Team") {
      const poolOpenTickets = Array.isArray(poolTickets) ? poolTickets : [];
      const assignedInProgress = allTickets.filter(
        (t) =>
          ["In Progress", "Clarification Needed", "Pending"].includes(t.status) &&
          Number(t.assignee) === currentId
      );
      const resolvedTickets = allTickets.filter((t) => t.status === "Resolved");
      // Total tickets in all the tickets except pending approval status tickets
      const totalTicketsNonPending = allTickets.filter(
        (t) => t.status !== "Pending Approval"
      );

      return [
        {
          id: "pool",
          label: "Ticket Pool",
          value: poolOpenTickets.length,
          waveFrom: "#3b5998",
          waveTo: "#5b79d6",
          tickets: poolOpenTickets,
        },
        {
          id: "inpr",
          label: "In Progress",
          value: assignedInProgress.length,
          waveFrom: "#25638b",
          waveTo: "#4a86e8",
          tickets: assignedInProgress,
        },
        {
          id: "res",
          label: "Resolved",
          value: resolvedTickets.length,
          waveFrom: "#237a4a",
          waveTo: "#48c774",
          tickets: resolvedTickets,
        },
        {
          id: "total",
          label: "Total Tickets",
          value: totalTicketsNonPending.length,
          waveFrom: "#6d5bb8",
          waveTo: "#907ee6",
          tickets: totalTicketsNonPending,
        },
      ];
    }

    // 4. Approver (Dashboard)
    if (role === "Approver") {
      const pendingTickets = allTickets.filter(
        (t) =>
          t.status === "Pending Approval" &&
          Number(t.approver_id || t.approver) === currentId
      );
      const clarificationTickets = allTickets.filter(
        (t) =>
          t.status === "Clarification Needed" &&
          Number(t.approver_id || t.approver) === currentId
      );
      const approvedByMe = allTickets.filter(
        (t) =>
          ["In Progress", "Open"].includes(t.status) &&
          (Number(t.approver) === currentId ||
            Number(t.approver_id) === currentId ||
            (t.history &&
              t.history.some(
                (h) =>
                  (h.note?.toLowerCase().includes("approved") || h.to === "Open") &&
                  Number(h.by) === currentId
              )))
      );
      const rejectedTickets = allTickets.filter(
        (t) =>
          t.status === "Rejected" &&
          (Number(t.approver_id || t.approver) === currentId || Number(t.by) === currentId)
      );

      return [
        {
          id: "pend",
          label: "Pending Approval",
          value: pendingTickets.length,
          waveFrom: "#95630b",
          waveTo: "#e0a52a",
          tickets: pendingTickets,
        },
        {
          id: "clar",
          label: "Clarification Needed",
          value: clarificationTickets.length,
          waveFrom: "#7b3996",
          waveTo: "#b15fdb",
          tickets: clarificationTickets,
        },
        {
          id: "appr",
          label: "Approved",
          value: approvedByMe.length,
          waveFrom: "#1f6d34",
          waveTo: "#2f9e63",
          tickets: approvedByMe,
        },
        {
          id: "rej",
          label: "Rejected",
          value: rejectedTickets.length,
          waveFrom: "#a33c32",
          waveTo: "#e06354",
          tickets: rejectedTickets,
        },
      ];
    }

    // 5. Admin (All Tickets Dashboard) - 5 Cards
    const pendingTickets = allTickets.filter((t) => t.status === "Pending Approval");
    const inProgressTickets = allTickets.filter((t) =>
      ["In Progress", "Open", "Pending", "Clarification Needed"].includes(t.status)
    );
    const resolvedTickets = allTickets.filter((t) => t.status === "Resolved");
    const rejectedTickets = allTickets.filter((t) => t.status === "Rejected");

    return [
      {
        id: "total",
        label: "Total Tickets",
        value: allTickets.length,
        waveFrom: "#6d5bb8",
        waveTo: "#907ee6",
        tickets: allTickets,
      },
      {
        id: "pend",
        label: "Pending Approval",
        value: pendingTickets.length,
        waveFrom: "#95630b",
        waveTo: "#e0a52a",
        tickets: pendingTickets,
      },
      {
        id: "inpr",
        label: "In Progress",
        value: inProgressTickets.length,
        waveFrom: "#25638b",
        waveTo: "#4a86e8",
        tickets: inProgressTickets,
      },
      {
        id: "res",
        label: "Resolved",
        value: resolvedTickets.length,
        waveFrom: "#237a4a",
        waveTo: "#48c774",
        tickets: resolvedTickets,
      },
      {
        id: "rej",
        label: "Rejected",
        value: rejectedTickets.length,
        waveFrom: "#a33c32",
        waveTo: "#e06354",
        tickets: rejectedTickets,
      },
    ];
  }, [isMyMode, isEmployeeMode, role, allTickets, myTickets, poolTickets, currentId]);

  // Priority breakdown for semi-circular chart
  const priorityStats = useMemo(() => {
    const list = isScopeMy ? myTickets : allTickets;
    const critical = list.filter((t) => t.priority === "Critical").length;
    const high = list.filter((t) => t.priority === "High").length;
    const medium = list.filter((t) => (t.priority || "Medium") === "Medium").length;
    const low = list.filter((t) => t.priority === "Low").length;
    const total = critical + high + medium + low;
    return { critical, high, medium, low, total };
  }, [isScopeMy, myTickets, allTickets]);

  // Category counts fetched dynamically from DB (categoryList / dbSummary)
  const categoryCounts = useMemo(() => {
    const map = {};

    // 1. Initialize map with all active categories from DB
    if (categoryList && categoryList.length > 0) {
      categoryList.forEach((c) => {
        const name = typeof c === "string" ? c : c.name;
        if (name) map[name] = 0;
      });
    } else if (dbSummary?.byCategory?.length) {
      dbSummary.byCategory.forEach((c) => {
        if (c.category) map[c.category] = 0;
      });
    } else {
      [
        "Software & Applications",
        "Hardware & Devices",
        "Network & Connectivity",
        "Others",
        "Accounts & Access",
        "Printing & Scanning",
      ].forEach((cat) => {
        map[cat] = 0;
      });
    }

    // 2. Count tickets for each category from scoped tickets
    const list = isScopeMy ? myTickets : allTickets;
    list.forEach((t) => {
      const cat = t.cat ? t.cat.split(" › ")[0] : "General";
      map[cat] = (map[cat] || 0) + 1;
    });

    return Object.entries(map)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [categoryList, dbSummary, isScopeMy, myTickets, allTickets]);

  const maxCat = Math.max(1, ...categoryCounts.map((c) => c.count));

  // Department counts with per-status breakdown directly from DB departments table
  const deptCounts = useMemo(() => {
    // For Approvers and non-Admins, build department breakdown directly from their scoped tickets
    if (role !== "Admin") {
      const list = isScopeMy ? myTickets : allTickets;
      if (!list.length) return { list: [], max: 1 };

      const deptMap = {};
      list.forEach((t) => {
        const dept = t.creator_dept || t.byDept || t.department || "Other";
        const status = t.status || "Open";
        if (!deptMap[dept]) {
          deptMap[dept] = { total: 0, statuses: {} };
        }
        deptMap[dept].total += 1;
        deptMap[dept].statuses[status] = (deptMap[dept].statuses[status] || 0) + 1;
      });

      const listResult = Object.entries(deptMap)
        .map(([dept, data]) => ({ dept, total: data.total, statuses: data.statuses }))
        .sort((a, b) => b.total - a.total);

      const max = Math.max(1, ...listResult.map((x) => x.total));
      return { list: listResult, max };
    }

    // For Admin: use backend aggregated data for department totals and per‑status counts
    const deptMap = {};

    // Seed all active departments from AppContext (fetched from DB /api/departments)
    if (Array.isArray(appDepartments)) {
      appDepartments.forEach((d) => {
        const name = typeof d === "string" ? d : d?.name;
        if (name) deptMap[name] = { total: 0, statuses: {} };
      });
    }

    // Merge backend aggregated counts from DB
    if (dbSummary?.byDepartment?.length) {
      dbSummary.byDepartment.forEach((item) => {
        const dept = item.department || "Other";
        deptMap[dept] = { total: Number(item.count || 0), statuses: {} };
      });
    }

    // Merge per‑status breakdown (deptStatus) into the map
    if (dbSummary?.deptStatus) {
      dbSummary.deptStatus.forEach((item) => {
        const dept = item.department || "Other";
        const status = item.status;
        const count = Number(item.count || 0);
        if (!deptMap[dept]) {
          deptMap[dept] = { total: 0, statuses: {} };
        }
        deptMap[dept].statuses[status] = (deptMap[dept].statuses[status] || 0) + count;
      });
    }

    const list = Object.entries(deptMap)
      .map(([dept, data]) => ({ dept, total: data.total, statuses: data.statuses }))
      .sort((a, b) => b.total - a.total);

    const max = Math.max(1, ...list.map((x) => x.total));
    return { list, max };
  }, [role, isScopeMy, myTickets, allTickets, dbSummary, appDepartments]);

  // Status donut calculation matching mockup donut()
  const donutData = useMemo(() => {
    const list = isScopeMy ? myTickets : allTickets;
    const counts = [
      { label: "Open", count: countStatus(list, "Open"), color: SC.Open },
      { label: "In Progress", count: countStatus(list, "In Progress") + countStatus(list, "Pending"), color: SC["In Progress"] },
      { label: "Pending Approval", count: countStatus(list, "Pending Approval"), color: SC["Pending Approval"] },
      { label: "Clarification Needed", count: countStatus(list, "Clarification Needed"), color: SC["Clarification Needed"] },
      { label: "Resolved", count: countStatus(list, "Resolved"), color: SC.Resolved },
      { label: "Rejected", count: countStatus(list, "Rejected"), color: SC.Rejected },
    ].filter((item) => item.count > 0);

    const total = counts.reduce((acc, curr) => acc + curr.count, 0);
    let cumulative = 0;
    const gradientStops = counts
      .map((item) => {
        const start = total ? (cumulative / total) * 100 : 0;
        cumulative += item.count;
        const end = total ? (cumulative / total) * 100 : 0;
        return `${item.color} ${start}% ${end}%`;
      })
      .join(", ") || "#eee 0% 100%";

    return { counts, total, gradientStops };
  }, [isScopeMy, myTickets, allTickets]);

  // Table items matching mockup na logic
  const tableTickets = useMemo(() => {
    if (isScopeMy) {
      return myTickets;
    }
    if (role === "Approver") {
      return allTickets.filter(
        (t) =>
          Number(t.approver_id || t.approver) === currentId ||
          Number(t.by || t.created_by) === currentId
      ).slice(0, 10);
    }
    if (role === "Support Team") {
      return Array.isArray(poolTickets) ? poolTickets : [];
    }
    // Admin / All: Needs Attention · High & Critical (live tickets)
    return allTickets.filter(
      (x) => ["High", "Critical"].includes(x.priority) && !["Resolved", "Rejected"].includes(x.status)
    );
  }, [isScopeMy, role, myTickets, allTickets, poolTickets]);

  const activeKpi = useMemo(() => {
    if (!activeKpiFilterId) return null;
    return kpis.find((k) => k.id === activeKpiFilterId) || null;
  }, [activeKpiFilterId, kpis]);

  if (activeKpi) {
    return (
      <TicketListView
        title={activeKpi.label}
        subtitle={
          isScopeMy
            ? `Showing tickets raised by you under "${activeKpi.label}".`
            : role === "Approver"
            ? `Showing tickets assigned to you under "${activeKpi.label}".`
            : `Showing all organizational tickets under "${activeKpi.label}".`
        }
        tickets={activeKpi.tickets}
        emptyMessage={`No tickets found for "${activeKpi.label}".`}
        onBack={() => setActiveKpiFilterId(null)}
        isMyDashboard={isScopeMy}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 hidden-scroll">
      {/* Top Header matching Mockup .ph0 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--ln)" }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            {isMyMode ? "My Dashboard" : role === "Employee" || role === "Approver" ? "Dashboard" : "All Tickets Dashboard"}
          </h1>
          <p className="mt-1 text-xs" style={{ color: "var(--mu)" }}>
            {isScopeMy ? "Tickets you have raised." : role === "Approver" ? "Tickets assigned for your approval and department." : "Every ticket in the organization."}
          </p>
        </div>
      </div>

      {/* Dynamic KPI Wave Cards Grid (6-column, 5-column, or 4-column responsive) */}
      <section
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          kpis.length === 6
            ? "md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3"
            : kpis.length === 5
            ? "md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5"
            : "lg:grid-cols-4 gap-4"
        }`}
      >
        {kpis.map((kpi, index) => (
          <div
            key={kpi.id}
            onClick={() => setActiveKpiFilterId(kpi.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveKpiFilterId(kpi.id);
              }
            }}
            title={`Click to view ${kpi.label} (${kpi.value})`}
            className={`group relative flex flex-col justify-between rounded-xl border ${
              kpis.length === 6
                ? "p-3 sm:p-3.5 min-h-[110px]"
                : kpis.length === 5
                ? "p-3.5 sm:p-4 min-h-[114px]"
                : "p-4 sm:p-5 min-h-[120px]"
            } shadow-xs transition-all duration-200 overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 select-none`}
            style={{
              backgroundColor: "var(--sf)",
              borderColor: "var(--ln)",
            }}
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider block text-black dark:text-white truncate">
                  {kpi.label}
                </span>
                <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 shrink-0">
                  View →
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 block text-black dark:text-white font-mono">
                {kpi.value}
              </span>
            </div>

            <CardWave
              id={`kpi-${kpi.id}-${index}`}
              fromColor={kpi.waveFrom}
              toColor={kpi.waveTo}
            />
          </div>
        ))}
      </section>

      {/* Main Grid Row 1: Left Table (1.6fr) + Right Chart (1fr) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch ">
        {/* Table Panel matching Mockup */}
        <div
          className={`lg:col-span-7 rounded-xl border shadow-xs overflow-hidden flex flex-col ${
            isSupportAllTickets ? "h-[450px]" : isScopeMy ? "min-h-[380px] lg:min-h-[322px]" : "h-[350px]"
          }`}
          style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
        >
          <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--ln)" }}>
            <h2 className="text-sm font-bold text-black dark:text-white">
              {isScopeMy
                ? "My Tickets"
                : role === "Approver"
                ? "Recent Tickets"
                : role === "Support Team"
                ? "Ticket Pool · Open Tickets"
                : "Needs Attention · High & Critical"}
              {" (" + tableTickets.length + ")"}
            </h2>

            {!isScopeMy && (
              <button
                type="button"
                onClick={() => setView("tickets")}
                className="text-xs font-bold hover:underline cursor-pointer"
                style={{ color: "var(--pu)" }}
              >
                Open all ↗
              </button>
            )}
          </div>

          {tableTickets.length === 0 ? (
            <div className="p-6 flex-1 flex items-center justify-center">
              <EmptyState
                icon={Ticket}
                title="No data available"
                message="No tickets recorded for this view."
                compact
              />
            </div>
          ) : (
            <div className={`overflow-y-auto overflow-x-auto hidden-scroll flex-1 min-h-0 ${
              isSupportAllTickets ? "min-h-0" : isMyMode ? "max-h-[320px] lg:max-h-[350px]" : ""
            }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: "var(--sf)" }}>
                  <tr className="border-b bg-[#f8f6fd] dark:bg-white/[0.04]" style={{ borderColor: "var(--ln)" }}>
                    <th className="px-3.5 py-2 font-bold uppercase tracking-wider text-xs text-black dark:text-white">ID</th>
                    <th className="px-3.5 py-2 font-bold uppercase tracking-wider text-xs text-black dark:text-white">Short Description</th>
                    <th className="px-3.5 py-2 font-bold uppercase tracking-wider text-xs text-black dark:text-white">Priority</th>
                    {!isSupportAllTickets && (
                      <th className="px-3.5 py-2 font-bold uppercase tracking-wider text-xs text-black dark:text-white">Status</th>
                    )}
                    {!isScopeMy && (
                      <th className="px-3.5 py-2 font-bold uppercase tracking-wider text-xs text-black dark:text-white">
                        Raised By
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tableTickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSel(t.id)}
                      className={`border-b transition-colors cursor-pointer hover:bg-[#fbfaff] dark:hover:bg-white/5 ${
                        isSupportAllTickets ? "h-[36px]" : "h-[42px]"
                      }`}
                      style={{ borderColor: "var(--ln)" }}
                    >
                      <td className="px-3.5 py-1.5 font-mono font-bold" style={{ color: "var(--pu)" }}>
                        {t.id}
                      </td>
                      <td className="px-3.5 py-1.5 font-semibold max-w-[240px] truncate text-black dark:text-white">
                        {t.title}
                      </td>
                      <td className="px-3.5 py-1.5 font-bold whitespace-nowrap">
                        {getPriorityDot(t.priority)}
                      </td>
                      {!isSupportAllTickets && (
                        <td className="px-3.5 py-1.5 whitespace-nowrap">
                          {getStatusBadge(t.status)}
                        </td>
                      )}
                      {!isScopeMy && (
                        <td className="px-3.5 py-1.5 whitespace-nowrap">
                          <span className="font-normal text-black dark:text-white">
                            {t.byName || getUser(t.by)}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isSupportAllTickets && tableTickets.length > 0 && (
            <div
              className="flex items-center justify-between px-3.5 py-1.5 border-t text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-[#faf9fe] dark:bg-white/[0.02]"
              style={{ borderColor: "var(--ln)" }}
            >
              <span>{tableTickets.length} open tickets in pool</span>
              <span className="text-[10px] text-gray-400">
                {tableTickets.length > 6 ? "Scroll for more ↓" : "All tickets shown"}
              </span>
            </div>
          )}
        </div>

        {/* Right Panel:
            - In My / Employee Dashboard: SemiCirclePriorityChart
            - In Support Team All Tickets Dashboard: Status on top + Priority on bottom
            - In Approver Dashboard: Status Donut (Category moves to Row 2 full-width)
            - In Admin All Tickets Dashboard: Tickets by Category
        */}
        <div className={`lg:col-span-5 flex flex-col ${isSupportAllTickets ? "h-[450px]" : isScopeMy ? "h-[380px] lg:min-h-[400px]" : "h-[350px]"}`}>
          {isScopeMy ? (
            <div className="flex-1 flex flex-col h-full">
              <SemiCirclePriorityChart priorityStats={priorityStats} />
            </div>
          ) : isSupportAllTickets ? (
            <div className="flex flex-col gap-3 h-full">
              {/* Top: Status Pie / Donut Chart */}
              <div className="h-[220px]">
                <StatusDonutChart donutData={donutData} compact={true} />
              </div>
              {/* Bottom: Priority Half-circle Chart */}
              <div className="h-[220px]">
                <SemiCirclePriorityChart priorityStats={priorityStats} compact={true} />
              </div>
            </div>
          ) : role === "Approver" ? (
            /* Approver: Status Donut shown here; Category goes to Row 2 */
            <div className="flex-1 flex flex-col h-full">
              <StatusDonutChart donutData={donutData} />
            </div>
          ) : (
            /* Admin: Category chart in right panel */
            <div
              className="rounded-xl border p-5 shadow-xs flex-1 flex flex-col h-full min-h-0"
              style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
            >
              <h2 className="text-sm font-bold text-black dark:text-white pb-2.5 border-b mb-3" style={{ borderColor: "var(--ln)" }}>
                Tickets by Category
              </h2>

              {categoryCounts.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title="No data available"
                  message="No category breakdown available yet."
                  compact
                />
              ) : (
                <div className="flex-1 flex flex-col space-y-3 py-1 overflow-y-auto hidden-scroll min-h-0">
                  {categoryCounts.map((c) => (
                    <div key={c.category} className="group">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-black dark:text-white">
                          {c.category}
                        </span>
                        <b className="font-mono text-black dark:text-white">{c.count}</b>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#eeeafb] dark:bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(c.count / maxCat) * 100}%`,
                            backgroundColor: "var(--pu)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Row 2 */}
      {!isScopeMy && !isSupportAllTickets ? (
        role === "Approver" ? (
          /* Approver Row 2: Category (wide, matches ticket table) + Priority (wider half-circle) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch lg:max-h-[380px]">
            {/* Category chart — col-span-8 to match ticket table width */}
            <div className="lg:col-span-7 ">
              <CategoryChart categoryCounts={categoryCounts} maxCat={maxCat} />
            </div>
            {/* Priority half-circle — col-span-4 (slightly wider) */}
            <div className="lg:col-span-5">
              <SemiCirclePriorityChart priorityStats={priorityStats} />
            </div>
          </div>
        ) : (
          /* Admin / other roles Row 2: Status | Dept | Priority */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {/* Panel 1: Tickets by Status */}
            <StatusDonutChart donutData={donutData} />

            {/* Panel 2: Tickets by Department matching mockup deptBars() */}
            <div
              className="rounded-xl border p-5 shadow-xs flex flex-col justify-between"
              style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
            >
              <div className="border-b pb-2 mb-3" style={{ borderColor: "var(--ln)" }}>
                <h2 className="text-sm font-bold text-black dark:text-white">
                  Tickets by Department
                </h2>
              </div>

              {deptCounts.list.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No data available"
                  message="Department data will appear as tickets arrive."
                  compact
                />
              ) : (
                <div className="space-y-3 py-1 flex-1 flex flex-col overflow-y-auto hidden-scroll max-h-[260px]">
                  {deptCounts.list.map(({ dept, total, statuses }) => (
                    <div key={dept} className="dp">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-black dark:text-white">{dept}</span>
                        <b className="font-mono text-black dark:text-white">{total}</b>
                      </div>
                      {/* Outer container sized relative to max department total */}
                      <div style={{ width: `${(total / deptCounts.max) * 100}%` }}>
                        {/* Stacked segmented bar where colors follow ticket status */}
                        <div className="flex h-2 w-full rounded-full bg-[#eeeafb] dark:bg-white/[0.05] overflow-hidden">
                          {Object.entries(statuses).map(([status, count]) => {
                            const color = SC[status] || "var(--pu)";
                            const widthPct = (count / total) * 100;
                            return (
                              <span
                                key={status}
                                title={`${status}: ${count}`}
                                style={{
                                  width: `${widthPct}%`,
                                  backgroundColor: color,
                                }}
                                className="h-full block transition-all duration-300"
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs mt-2 pt-1 font-normal text-black dark:text-white" style={{ color: "var(--mu)" }}>
                    Bar colours follow ticket status.
                  </p>
                </div>
              )}
            </div>

            {/* Panel 3: Tickets by Priority (Semi-circular chart replacing vertical bar chart) */}
            <SemiCirclePriorityChart priorityStats={priorityStats} />
          </div>
        )
      ) : null}
    </div>
  );
}
