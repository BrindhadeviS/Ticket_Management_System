"use client";

import React, { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { SearchIcon, ArrowLeftIcon } from "@/components/Icons";
import EmptyState from "@/components/EmptyState";
import { Ticket } from "lucide-react";

const inputStyle = {
  backgroundColor: "var(--bg)",
  borderColor: "var(--bd)",
  color: "var(--tx)",
};

function displayDate(ticket) {
  const raw = ticket.ticketDate || ticket.ticket_date || ticket.createdAt || ticket.created_at || ticket.created;
  if (!raw) return "—";
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? String(raw)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getTicketDateString(ticket) {
  if (!ticket) return "";
  const raw = ticket.ticketDate || ticket.ticket_date || ticket.createdAt || ticket.created_at || ticket.created;
  if (!raw) return "";
  // Handles plain dates ("2023-09-15") and common DD‑MM‑YYYY formats.
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    // DD‑MM‑YYYY format.
    const dmyMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
    }
    // For ISO or other date‑time strings, fall back to Date conversion.
  }
  // Fallback: use Date object (local timezone) and format as YYYY‑MM‑DD.
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TicketListView({
  title,
  subtitle,
  tickets = [],
  emptyMessage,
  onBack,
  hideStatusFilter = false,
  hideAssigneeFilter = false,
  isMyDashboard = false,
}) {
  const { setSel, getUser, view, me } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [filters, setFilters] = useState({
    id: "",
    title: "",
    category: "",
    priority: "All",
    status: "All",
    raisedBy: "",
    assignedTo: "",
    date: "",
  });

  const isApprover = me?.role === "Approver";
  const isSupport = me?.role === "Support Team";

  const isMyMode = Boolean(
    isMyDashboard ||
    view === "my_tickets" ||
    view === "mine" ||
    title === "My Tickets" ||
    subtitle?.toLowerCase().includes("raised by you")
  );

  const hideRaisedBy = isMyMode;

  const hideAssignedTo = Boolean(
    hideAssigneeFilter ||
    (isApprover && (title === "Pending Approval" || title === "Pending Approvals" || title === "Awaiting Approval" || view === "approvals")) ||
    (isSupport && (title === "Resolved" || title === "Pending" || title === "Awaiting Action"))
  );

  const isAssigneeFilterHidden = hideAssignedTo;

  const availableStatuses = useMemo(() => {
    const set = new Set();
    tickets.forEach((t) => {
      if (t.status) set.add(t.status);
    });
    return Array.from(set);
  }, [tickets]);

  // If only 1 or 0 statuses exist in this card dataset, no status filter needed
  const isStatusFilterHidden = Boolean(
    hideStatusFilter ||
    availableStatuses.length <= 1
  );

  const updateFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = paginatedTickets.map((t) => t.id);
      setSelectedRowIds((prev) => [...new Set([...prev, ...allIds])]);
    } else {
      const pageIds = new Set(paginatedTickets.map((t) => t.id));
      setSelectedRowIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectRow = (e, ticketId) => {
    e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const raisedBy = ticket.byName || getUser(ticket.by);
      const assignedTo =
        ticket.assigneeName ||
        (ticket.assignee ? getUser(ticket.assignee) : "Unassigned");
      const date = displayDate(ticket);
      const globalMatch =
        !term ||
        [
          ticket.id,
          ticket.title,
          ticket.cat,
          ticket.sub,
          ticket.priority,
          ticket.status,
          raisedBy,
          assignedTo,
          date,
        ].some((value) => String(value || "").toLowerCase().includes(term));

      const fieldMatch = (key, value) =>
        !filters[key] || String(value || "").toLowerCase().includes(filters[key].toLowerCase());

      const matchDateFilter = () => {
        if (!filters.date) return true;
        return getTicketDateString(ticket) === filters.date;
      };

      return (
        globalMatch &&
        fieldMatch("id", ticket.id) &&
        fieldMatch("title", ticket.title) &&
        fieldMatch("category", `${ticket.cat || ""} ${ticket.sub || ""}`) &&
        (filters.priority === "All" || ticket.priority === filters.priority) &&
        (isStatusFilterHidden || filters.status === "All" || ticket.status === filters.status) &&
        (hideRaisedBy || fieldMatch("raisedBy", raisedBy)) &&
        (hideAssignedTo || fieldMatch("assignedTo", assignedTo)) &&
        matchDateFilter()
      );
    });
  }, [tickets, searchTerm, filters, getUser, isStatusFilterHidden, hideAssignedTo, hideRaisedBy]);

  const SB = {
    Open: { bg: "#e9edff", text: "#454f9b" },
    "In Progress": { bg: "#eaf4fb", text: "#25638b" },
    Pending: { bg: "#eaf4fb", text: "#25638b" },
    "Pending Approval": { bg: "#fff5d9", text: "#95630b" },
    "Clarification Needed": { bg: "#f4eafa", text: "#7b3996" },
    Resolved: { bg: "#e8f6ed", text: "#237a4a" },
    Rejected: { bg: "#fff0ed", text: "#a33c32" },
  };

  const getStatusBadge = (status) => {
    const s = SB[status] || { bg: "#eee", text: "#555" };
    return (
      <span
        className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
        style={{ backgroundColor: s.bg, color: s.text }}
      >
        {status || "—"}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      Critical: "text-[#8b1e3f]",
      High: "text-[#c9594e]",
      Medium: "text-[#e0a52a]",
      Low: "text-[#2f9e63]",
    };
    return (
      <span className={`text-xs font-bold whitespace-nowrap ${colors[priority] || colors.Medium}`}>
        ● {priority || "Medium"}
      </span>
    );
  };

  const filterInput = (key, placeholder) => (
    <input
      type="text"
      value={filters[key]}
      onChange={(event) => updateFilter(key, event.target.value)}
      onClick={(event) => event.stopPropagation()}
      placeholder={placeholder}
      aria-label={`Filter ${placeholder}`}
      className="w-full min-w-[88px] rounded-md border px-2 py-1.5 text-xs font-normal normal-case tracking-normal outline-none"
      style={inputStyle}
    />
  );

  const hasFilters =
    searchTerm ||
    Object.entries(filters).some(([key, value]) => {
      if (isStatusFilterHidden && key === "status") return false;
      if (isAssigneeFilterHidden && key === "assignedTo") return false;
      if (hideRaisedBy && key === "raisedBy") return false;
      return key === "priority" || key === "status" ? value !== "All" : Boolean(value);
    });

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const validPage = Math.min(Math.max(1, page), totalPages);

  const paginatedTickets = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, validPage, pageSize]);

  const isAllCurrentPageSelected =
    paginatedTickets.length > 0 &&
    paginatedTickets.every((t) => selectedRowIds.includes(t.id));

  const startCount = filteredTickets.length === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endCount = Math.min(validPage * pageSize, filteredTickets.length);

  let pageNumbers = [];
  if (filteredTickets.length === 0) {
    pageNumbers = [1];
  } else if (totalPages <= 7) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (validPage <= 4) {
      pageNumbers = [1, 2, 3, 4, 5, "...", totalPages];
    } else if (validPage >= totalPages - 3) {
      pageNumbers = [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pageNumbers = [1, "...", validPage - 1, validPage, validPage + 1, "...", totalPages];
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--ln)" }}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                backgroundColor: "var(--sf)",
                borderColor: "var(--ln)",
                color: "var(--tx)",
              }}
              title="Back to Dashboard"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white" style={{ color: "var(--tx)" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--mu)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search all ticket columns..."
            className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none"
            style={{ backgroundColor: "var(--sf)", borderColor: "var(--bd)", color: "var(--tx)" }}
          />
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
        </div>
        <div className="flex items-center gap-3">
          {selectedRowIds.length > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{ backgroundColor: "var(--pu2)", color: "var(--pu)" }}
            >
              <span>{selectedRowIds.length} row{selectedRowIds.length > 1 ? "s" : ""} selected</span>
              <button
                type="button"
                onClick={() => setSelectedRowIds([])}
                className="hover:underline ml-1 cursor-pointer font-bold"
                title="Clear selection"
              >
                ✕
              </button>
            </div>
          )}
          <span className="text-xs" style={{ color: "var(--mu)" }}>
            Showing {filteredTickets.length} of {tickets.length}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilters({ id: "", title: "", category: "", priority: "All", status: "All", raisedBy: "", assignedTo: "", date: "" });
                setPage(1);
              }}
              className="text-xs font-semibold cursor-pointer"
              style={{ color: "var(--ac)" }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {tickets.length === 0 && !hasFilters ? (
        <EmptyState
          icon={Ticket}
          title="No data available"
          message={emptyMessage || "There are no tickets to display in this view."}
        />
      ) : (
        <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: "var(--sf)", borderColor: "var(--bd)" }}>
          <div className="overflow-x-auto overflow-y-auto hidden-scroll max-h-[580px]">
            <table className="w-full min-w-[1300px] border-collapse">
              <thead>
                <tr className="border-b bg-[#f8f6fd] dark:bg-white/[0.02]" style={{ borderColor: "var(--ln)" }}>

                  {[
                    { label: "Ticket ID", minWidth: "110px" },
                    { label: "Short Description", minWidth: "260px" },
                    { label: "Category / Subcategory", minWidth: "210px" },
                    { label: "Priority", minWidth: "110px" },
                    { label: "Status", minWidth: "180px" },
                    ...(!hideRaisedBy ? [{ label: "Raised By", minWidth: "140px" }] : []),
                    ...(!hideAssignedTo ? [{ label: "Assigned To", minWidth: "140px" }] : []),
                    { label: "Ticket Date", minWidth: "120px" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className="px-3.5 py-3 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white whitespace-nowrap"
                      style={{ minWidth: col.minWidth, width: col.minWidth }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
                <tr className="border-b" style={{ borderColor: "var(--ln)" }}>
                  {/* <th className="w-[44px] min-w-[44px] px-2 py-2 text-center" /> */}
                  <th className="px-2 py-2" style={{ minWidth: "110px", width: "110px" }}>{filterInput("id", "Filter ID")}</th>
                  <th className="px-2 py-2" style={{ minWidth: "260px", width: "260px" }}>{filterInput("title", "Filter description")}</th>
                  <th className="px-2 py-2" style={{ minWidth: "210px", width: "210px" }}>{filterInput("category", "Filter category")}</th>
                  <th className="px-2 py-2" style={{ minWidth: "110px", width: "110px" }}>
                    <select value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)} className="w-full min-w-[88px] rounded-md border px-2 py-1.5 text-xs" style={inputStyle}>
                      <option value="All">All</option>
                      {["Critical", "High", "Medium", "Low"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </th>
                  <th className="px-2 py-2" style={{ minWidth: "180px", width: "180px" }}>
                    {!isStatusFilterHidden ? (
                      <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="w-full min-w-[150px] rounded-md border px-2 py-1.5 text-xs" style={inputStyle}>
                        <option value="All">All</option>
                        {availableStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    ) : null}
                  </th>
                  {!hideRaisedBy && (
                    <th className="px-2 py-2" style={{ minWidth: "140px", width: "140px" }}>{filterInput("raisedBy", "Filter employee")}</th>
                  )}
                  {!hideAssignedTo && (
                    <th className="px-2 py-2" style={{ minWidth: "140px", width: "140px" }}>
                      {filterInput("assignedTo", "Filter assignee")}
                    </th>
                  )}
                  <th className="px-2 py-2" style={{ minWidth: "120px", width: "120px" }}>
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={filters.date}
                        onChange={(event) => updateFilter("date", event.target.value)}
                        className="w-full min-w-[110px] rounded-md border px-1.5 py-1 text-xs cursor-pointer"
                        style={inputStyle}
                        title="Filter date"
                      />
                      {filters.date && (
                        <button
                          type="button"
                          onClick={() => updateFilter("date", "")}
                          className="text-xs text-gray-400 hover:text-black dark:hover:text-white px-1 font-bold"
                          title="Clear date filter"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6 + (!hideRaisedBy ? 1 : 0) + (!hideAssignedTo ? 1 : 0)}
                      className="py-12 text-center"
                      style={{ color: "var(--mu)" }}
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Ticket
                          className="w-8 h-8 opacity-40 mx-auto"
                          style={{ color: "var(--pu)" }}
                        />
                        <p className="text-sm font-semibold text-black dark:text-white">
                          No tickets match your active search filters.
                        </p>
                        <p className="text-xs" style={{ color: "var(--mu)" }}>
                          You can edit or clear your filter values in the column filters above.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((ticket) => {
                    const isSelected = selectedRowIds.includes(ticket.id);
                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => setSel(ticket.id)}
                        className={`k cursor-pointer border-b transition-colors ${isSelected
                            ? "bg-purple-50 dark:bg-purple-950/20"
                            : "hover:bg-[#fbfaff] dark:hover:bg-white/5"
                          }`}
                        style={{ borderColor: "var(--ln)" }}
                      >

                        <td className="whitespace-nowrap px-3.5 py-3 font-mono text-xs font-bold" style={{ minWidth: "110px", width: "110px", color: "var(--pu)" }}>{ticket.id}</td>
                        <td className="px-3.5 py-3 text-sm font-semibold text-black dark:text-white" style={{ minWidth: "260px", width: "260px" }}>{ticket.title}</td>
                        <td className="px-3.5 py-3 text-sm text-black dark:text-gray-100" style={{ minWidth: "210px", width: "210px" }}>
                          <div>{ticket.cat || "—"}</div>
                          <div className="text-xs" style={{ color: "var(--mu)" }}>{ticket.sub || "—"}</div>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap" style={{ minWidth: "110px", width: "110px" }}>{getPriorityBadge(ticket.priority)}</td>
                        <td className="px-3.5 py-3 whitespace-nowrap" style={{ minWidth: "180px", width: "180px" }}>{getStatusBadge(ticket.status)}</td>
                        {!hideRaisedBy && (
                          <td className="whitespace-nowrap px-3.5 py-3 text-sm font-normal text-black dark:text-white" style={{ minWidth: "140px", width: "140px" }}>{ticket.byName || getUser(ticket.by)}</td>
                        )}
                        {!hideAssignedTo && (
                          <td className="whitespace-nowrap px-3.5 py-3 text-sm font-normal text-black dark:text-gray-200" style={{ minWidth: "140px", width: "140px" }}>{ticket.assigneeName || (ticket.assignee ? getUser(ticket.assignee) : "Unassigned")}</td>
                        )}
                        <td className="whitespace-nowrap px-3.5 py-3 text-xs" style={{ minWidth: "120px", width: "120px", color: "var(--mu)" }}>{displayDate(ticket)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar matching Mockup .pgr */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t text-xs select-none"
            style={{
              borderColor: "var(--ln)",
              color: "var(--mu)",
              backgroundColor: "var(--sf)",
            }}
          >
            <div className="flex items-center gap-4">
              <span>
                Showing {startCount}–{endCount} of {filteredTickets.length}
              </span>
              <label className="flex items-center gap-1.5">
                <span>Rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-md border text-xs focus:outline-hidden cursor-pointer"
                  style={{
                    backgroundColor: "var(--sf)",
                    borderColor: "var(--ln)",
                    color: "var(--tx)",
                  }}
                >
                  {[5, 10, 20, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validPage === 1 || filteredTickets.length === 0}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="min-w-[32px] h-[32px] px-2 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                style={{
                  borderColor: "var(--ln)",
                  backgroundColor: "var(--sf)",
                  color: "var(--tx)",
                }}
              >
                ‹
              </button>

              {pageNumbers.map((p, idx) =>
                p === "..." ? (
                  <span key={`el-${idx}`} className="px-1 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className="min-w-[32px] h-[32px] px-2.5 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                    style={{
                      borderColor: validPage === p ? "var(--pu)" : "var(--ln)",
                      backgroundColor: validPage === p ? "var(--pu)" : "var(--sf)",
                      color: validPage === p ? "#ffffff" : "var(--tx)",
                    }}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={validPage >= totalPages || totalPages === 0 || filteredTickets.length === 0}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="min-w-[32px] h-[32px] px-2 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                style={{
                  borderColor: "var(--ln)",
                  backgroundColor: "var(--sf)",
                  color: "var(--tx)",
                }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
