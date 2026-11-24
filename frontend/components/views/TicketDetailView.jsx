"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { ArrowLeftIcon, EditIcon, TrashIcon } from "@/components/Icons";
import { fetchTicketById, ASSET_BASE, downloadAttachment } from "@/lib/api";
import EmptyState from "@/components/EmptyState";
import AttachmentPreview from "@/components/AttachmentPreview";
import {
  FileText,
  Clock,
  Paperclip,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  History,
  Send,
  Download,
  ExternalLink,
  Ticket,
  Trash2,
} from "lucide-react";
import { formatFileSize } from "@/lib/constants";
function to12Hour(hh, mm) {
  const hour = Number(hh) % 24;
  const suffix = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, "0")}:${mm} ${suffix}`;
}

function formatNormalDate(rawDate, includeTime = false) {
  if (!rawDate) return "—";

  // Saved text like "19 Nov, 13:05" becomes "19 Nov, 01:05 pm"
  if (typeof rawDate === "string" && !rawDate.includes("T") && !rawDate.includes("-") && rawDate.includes(" ")) {
    const m = rawDate.match(/^(.*?),?\s*(\d{1,2}):(\d{2})$/);
    return m && includeTime ? `${m[1]}, ${to12Hour(m[2], m[3])}` : rawDate;
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return String(rawDate);
  }
  const datePart = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (includeTime) {
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${datePart}, ${to12Hour(date.getHours(), minutes)}`;
  }
  return datePart;
}

export default function TicketDetailView() {
  const {
    sel,
    tickets,
    poolTickets,
    assignedTickets,
    me,
    getUser,
    setSel,
    editing,
    setEditing,
    saveEdit,
    deleteTicket,
    decide,
    takeTicket,
    releaseTicket,
    workTicket,
    requestClarification,
    submitClarification,
    showToast,
  } = useApp();

  const ticket =
    tickets.find((t) => t.id === sel) ||
    poolTickets.find((t) => t.id === sel) ||
    assignedTickets.find((t) => t.id === sel);

  // Edit fields
  const [editTitle, setEditTitle] = useState(ticket ? ticket.title : "");
  const [editDesc, setEditDesc] = useState(ticket ? ticket.desc : "");
  const [editErrors, setEditErrors] = useState({ title: "", desc: "" });
  const [editNewFile, setEditNewFile] = useState(null);
  const [editRemoveExisting, setEditRemoveExisting] = useState(false);
  const [editFileError, setEditFileError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Approver decision fields
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionError, setDecisionError] = useState("");

  // Support Team pool decision fields
  const [poolReason, setPoolReason] = useState("");
  const [poolError, setPoolError] = useState("");

  // Support Team work fields
  const [workStatus, setWorkStatus] = useState("In Progress");
  const [workResolution, setWorkResolution] = useState(
    ticket ? ticket.resolution || "" : ""
  );
  const [workError, setWorkError] = useState("");

  // Clarification field
  const [clarificationText, setClarificationText] = useState("");
  const [clarificationError, setClarificationError] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [actionLoading, setActionLoading] = useState("");

  // Helper: validates comment text for action buttons
  const validateComment = (text, action) => {
    if (!text?.trim()) {
      return `A comment is required when you ${action}.`;
    }
    if (text.trim().length < 5) {
      return `Please provide a more detailed comment (at least 5 characters) for ${action}.`;
    }
    return null;
  };
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAttachment = async () => {
    if (!attachment || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadAttachment(
        `${ASSET_BASE}/${attachment.attachment_path}`,
        attachment.attachment_name
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const [fullTicket, setFullTicket] = useState(null);

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        const ticketData = await fetchTicketById(sel);
        setFullTicket(ticketData);
        setAttachment(ticketData?.attachment_id ? ticketData : null);
      } catch (error) {
        console.warn("Error fetching ticket details:", error);
        setFullTicket(null);
        setAttachment(null);
      }
    };

    if (sel) {
      setDecisionError("");
      setPoolError("");
      setWorkError("");
      fetchTicketDetails();
    }
  }, [sel, ticket]);

  // Related tickets in the same category / subcategory or by same creator
  const relatedTickets = React.useMemo(() => {
    if (!ticket) return [];

    const allPool = [...tickets, ...poolTickets, ...assignedTickets];
    const seen = new Set();
    const unique = [];
    for (const t of allPool) {
      if (t && t.id && t.id !== ticket.id && !seen.has(t.id)) {
        seen.add(t.id);
        unique.push(t);
      }
    }
    const matches = unique.filter((t) => {
      const sameCat = ticket.cat && t.cat && ticket.cat === t.cat;
      const sameSub = ticket.sub && t.sub && ticket.sub === t.sub;
      const sameCreator = ticket.by && t.by && Number(ticket.by) === Number(t.by);
      return sameCat || sameSub || sameCreator;
    });
    const results = matches.length > 0 ? matches : unique;
    return results.slice(0, 5);
  }, [ticket, tickets, poolTickets, assignedTickets]);

  if (!ticket) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <EmptyState
          icon={FileText}
          title="Ticket not found"
          message="The requested ticket could not be found or may have been deleted."
          action={
            <button
              onClick={() => setSel(null)}
              className="cursor-pointer px-4 py-2 rounded-lg font-bold text-white text-sm"
              style={{ backgroundColor: "var(--pu)" }}
            >
              Back to list
            </button>
          }
        />
      </div>
    );
  }

  const isOwner = Number(ticket.by || ticket.created_by) === Number(me?.employee_id || me?.id);
  const isPending = ticket.status === "Pending Approval";
  const isAdmin = me?.role === "Admin";
  const isApprover = me?.role === "Approver" || me?.role === "Admin";
  const isSupport = me?.role === "Support Team";
  const isEmployee = me?.role === "Employee";

  // Support Team, Admin, Approver created tickets: until the status is Open allow edit/delete by owner
  // Employee created tickets: allow edit/delete while status is Pending Approval
  const isDirectRole = ["Admin", "Approver", "Support Team"].includes(me?.role);
  const canEditOrDelete =
    isOwner &&
    !editing &&
    (ticket.status === "Pending Approval" || (isDirectRole && ticket.status === "Open"));

  // Mockup SB status badge styles
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
    const style = SB[status] || { bg: "#f0edf6", text: "#6d5bb8" };
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {status}
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
      <span className={`text-xs font-bold ${colors[priority] || colors.Medium}`}>
        ● {priority || "Medium"}
      </span>
    );
  };

  const validateEdit = () => {
    const errs = { title: "", desc: "" };
    let isValid = true;
    if (!editTitle.trim()) {
      errs.title = "Short description is required";
      isValid = false;
    } else if (editTitle.trim().length < 5) {
      errs.title = "Enter at least 5 characters";
      isValid = false;
    }

    if (!editDesc.trim()) {
      errs.desc = "Description is required";
      isValid = false;
    } else if (editDesc.trim().length < 10) {
      errs.desc = "Describe the issue in at least 10 characters";
      isValid = false;
    }

    setEditErrors(errs);
    return isValid;
  };

  const handleEditFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    const file = selectedFiles[0];
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(ext)) {
      setEditFileError("Only JPG, PNG or PDF files are allowed");
      e.target.value = "";
      return;
    }

    if (file.size === 0) {
      setEditFileError("This file is empty (0 KB). Please choose a valid file");
      e.target.value = "";
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setEditFileError("File must be 5 MB or smaller");
      e.target.value = "";
      return;
    }

    setEditFileError("");
    setEditNewFile(file);
    setEditRemoveExisting(false);
    e.target.value = "";
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!validateEdit()) return;
    if (editFileError) return;
    setIsSavingEdit(true);
    try {
      const res = await saveEdit(
        ticket.id,
        editTitle,
        editDesc,
        editNewFile,
        editRemoveExisting,
      );
      if (res) {
        if (editNewFile) {
          setAttachment({
            attachment_id: res.attachment_id || "new",
            attachment_name: editNewFile.name,
            attachment_path: res.attachment_path || "",
            file_size: editNewFile.size,
          });
        } else if (editRemoveExisting) {
          setAttachment(null);
        }
        setEditErrors({ title: "", desc: "" });
        setEditNewFile(null);
        setEditRemoveExisting(false);
        setEditFileError("");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleClarificationSubmit = (e) => {
    e.preventDefault();
    if (!clarificationText.trim()) return;
    submitClarification(ticket.id, clarificationText);
    setClarificationText("");
  };

  // Breadcrumbs from category
  const categoriesList = (ticket.cat || "")
    .split(" › ")
    .concat(ticket.sub ? [ticket.sub] : [])
    .concat(ticket.item ? [ticket.item] : [])
    .filter(Boolean);

  const uniqueCrumbs = [...new Set(categoriesList)];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 space-y-2.5 overflow-hidden">
      {/* Main Header Bar: Heading as Ticket Details */}
      <div
        className="flex items-center justify-between gap-3 pb-2 border-b shrink-0"
        style={{ borderColor: "var(--ln)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSel(null);
              setEditing(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
            style={{
              backgroundColor: "var(--sf)",
              borderColor: "var(--ln)",
              color: "var(--tx)",
            }}
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white">
              Ticket Details
            </h1>
            <span
              className="font-mono text-xs sm:text-sm font-bold px-2 py-0.5 rounded-md"
              style={{ backgroundColor: "var(--pu2)", color: "var(--pu)" }}
            >
              {ticket.id}
            </span>
          </div>
        </div>

        {canEditOrDelete && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditTitle(ticket.title);
                setEditDesc(ticket.desc);
                setEditNewFile(null);
                setEditRemoveExisting(false);
                setEditFileError("");
                setEditing(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                backgroundColor: "var(--sf)",
                borderColor: "var(--ln)",
                color: "var(--tx)",
              }}
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              disabled={Boolean(actionLoading)}
              onClick={async () => {
                setActionLoading("delete");
                try {
                  await deleteTicket(ticket.id);
                } finally {
                  setActionLoading("");
                }
              }}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors cursor-pointer hover:bg-red-500/10 disabled:opacity-50"
              style={{
                borderColor: "#f0c9c2",
                color: "var(--rd)",
                backgroundColor: "var(--rdb)",
              }}
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>{actionLoading === "delete" ? "Deleting..." : "Delete"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Details Panel (2/3 width) + Right Actions / History (1/3 width) matching Mockup .g2s */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch flex-1 min-h-0 h-full overflow-hidden">
        {/* Left Column: Ticket Details Panel */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 overflow-hidden">
          <div
            className="rounded-xl border shadow-xs p-4 sm:p-5 flex flex-col flex-1 min-h-0 overflow-y-auto hidden-scroll space-y-3.5"
            style={{
              backgroundColor: "var(--sf)",
              borderColor: "var(--ln)",
            }}
          >
            {/* Title & Status Header inside the box (NO duplicate Ticket ID) */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--ln)" }}>
              <div className="space-y-1.5 min-w-0 flex-1">
                <h2 className="text-xl font-bold text-black dark:text-white leading-snug">
                  {ticket.title}
                </h2>

                {/* Category Breadcrumbs matching Mockup .crumb */}
                {uniqueCrumbs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {uniqueCrumbs.map((c, i) => (
                      <React.Fragment key={c}>
                        {i > 0 && <span className="text-xs text-gray-400">›</span>}
                        <span
                          className="px-2.5 py-0.5 rounded-md text-xs font-semibold"
                          style={{ backgroundColor: "var(--pu2)", color: "var(--pu)" }}
                        >
                          {c}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              <div>{getStatusBadge(ticket.status)}</div>
            </div>

            {/* 4-Box Metadata Grid matching Mockup .meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                className="p-3 rounded-lg border"
                style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)" }}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">
                  Priority
                </div>
                <div>{getPriorityBadge(ticket.priority)}</div>
              </div>

              <div
                className="p-3 rounded-lg border"
                style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)" }}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">
                  Raised By
                </div>
                <div className="text-sm font-normal text-black dark:text-gray-100 truncate">
                  {ticket.byName || getUser(ticket.by)}
                </div>
              </div>

              <div
                className="p-3 rounded-lg border"
                style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)" }}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">
                  Assigned To
                </div>
                <div className="text-sm font-normal text-black dark:text-gray-100 truncate">
                  {ticket.assigneeName || (ticket.assignee ? getUser(ticket.assignee) : "Unassigned")}
                </div>
              </div>

              <div
                className="p-3 rounded-lg border"
                style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)" }}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">
                  Created Date
                </div>
                <div className="text-sm font-semibold text-black dark:text-gray-100 truncate">
                  {formatNormalDate(ticket.ticketDate || ticket.created_at || ticket.createdAt || ticket.created)}
                </div>
              </div>
            </div>

            {/* Description Box with Increased Height matching Mockup .dsc */}
            {editing ? (
              <form onSubmit={handleSaveEdit} noValidate className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                    Short Description <span style={{ color: "var(--rd)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      if (editErrors.title) setEditErrors((p) => ({ ...p, title: "" }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                    style={{
                      backgroundColor: "var(--sf)",
                      borderColor: "var(--ln)",
                    }}
                  />
                  {editErrors.title && (
                    <p className="text-xs text-red-500 font-medium mt-1">
                      {editErrors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                    Description <span style={{ color: "var(--rd)" }}>*</span>
                  </label>
                  <textarea
                    rows={6}
                    value={editDesc}
                    onChange={(e) => {
                      setEditDesc(e.target.value);
                      if (editErrors.desc) setEditErrors((p) => ({ ...p, desc: "" }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden resize-y min-h-[160px] transition-colors"
                    style={{
                      backgroundColor: "var(--sf)",
                      borderColor: "var(--ln)",
                    }}
                  />
                  {editErrors.desc && (
                    <p className="text-xs text-red-500 font-medium mt-1">
                      {editErrors.desc}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                    Attachment
                  </label>

                  {editNewFile ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs text-black dark:text-gray-100 max-w-xs"
                        style={{ borderColor: "var(--ln)", backgroundColor: "var(--bg)" }}
                      >
                        <Paperclip size={13} style={{ color: "var(--pu)" }} />
                        <span className="truncate">{editNewFile.name}</span>
                        <span className="text-xs opacity-70" style={{ color: "var(--mu)" }}>
                          ({formatFileSize(editNewFile.size)})
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditNewFile(null)}
                          className="ml-1 text-red-500 hover:text-red-700 cursor-pointer"
                          title="Remove attachment"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ) : attachment && !editRemoveExisting ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs text-black dark:text-gray-100 max-w-xs"
                        style={{ borderColor: "var(--ln)", backgroundColor: "var(--bg)" }}
                      >
                        <Paperclip size={13} style={{ color: "var(--pu)" }} />
                        <span className="truncate">{attachment.attachment_name}</span>
                        <span className="text-xs opacity-70" style={{ color: "var(--mu)" }}>
                          ({formatFileSize(attachment.file_size)})
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditRemoveExisting(true)}
                          className="ml-1 text-red-500 hover:text-red-700 cursor-pointer"
                          title="Remove attachment"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <label
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ borderColor: "var(--ln)", color: "var(--pu)" }}
                      >
                        <Paperclip size={13} />
                        <span>Replace File (Max 5MB)</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={handleEditFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <label
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ borderColor: "var(--ln)", color: "var(--pu)" }}
                      >
                        <Paperclip size={13} />
                        <span>Choose File (Max 5MB)</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={handleEditFileChange}
                          className="hidden"
                        />
                      </label>
                      {editRemoveExisting && (
                        <button
                          type="button"
                          onClick={() => setEditRemoveExisting(false)}
                          className="text-xs underline cursor-pointer"
                          style={{ color: "var(--mu)" }}
                        >
                          Keep original
                        </button>
                      )}
                    </div>
                  )}

                  {editFileError && (
                    <p className="text-xs text-red-500 font-medium mt-1">
                      {editFileError}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 rounded-lg font-bold text-white text-xs cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "var(--pu)" }}
                  >
                    {isSavingEdit ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => {
                      setEditing(false);
                      setEditErrors({ title: "", desc: "" });
                      setEditNewFile(null);
                      setEditRemoveExisting(false);
                      setEditFileError("");
                    }}
                    className="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"
                    style={{ borderColor: "var(--ln)", color: "var(--tx)" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-black dark:text-white">
                  Description
                </label>
                <div
                  className="rounded-xl border px-3.5 py-2.5 text-sm font-normal text-black dark:text-gray-100 whitespace-pre-wrap leading-relaxed min-h-[44px]"
                  style={{
                    backgroundColor: "#faf9fe",
                    borderColor: "var(--ln)",
                    borderLeft: "4px solid var(--pu)",
                  }}
                >
                  {ticket.desc}
                </div>
              </div>
            )}

            {/* Attachments Section (Directly beneath Description with tight, clean spacing) */}
            {!editing && (
              <div className="pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-black dark:text-white">
                  Attachments
                </label>

                {attachment ? (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border"
                    style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip size={16} style={{ color: "var(--pu)" }} />
                      <span className="text-sm font-bold text-black dark:text-white truncate">
                        {attachment.attachment_name}
                      </span>
                      <span className="text-xs" style={{ color: "var(--mu)" }}>
                        ({formatFileSize(attachment.file_size)})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setIsPreviewOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border hover:bg-black/5 cursor-pointer"
                        style={{ borderColor: "var(--ln)", color: "var(--pu)" }}
                      >
                        <ExternalLink size={13} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadAttachment}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border hover:bg-black/5 disabled:opacity-60 cursor-pointer"
                        style={{ borderColor: "var(--ln)", color: "var(--pu)" }}
                      >
                        <Download size={13} className={isDownloading ? "animate-pulse" : ""} />
                        <span>{isDownloading ? "Downloading..." : "Download"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="px-3 py-2 rounded-lg border text-xs"
                    style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)", color: "var(--mu)" }}
                  >
                    No attachment uploaded for this ticket.
                  </div>
                )}
              </div>
            )}

            {/* Approver & Support Team Decision Notes (Clean, simple under Attachments without confusing colored badges) */}
            {(() => {
              // Priority 1: Check fullTicket (fresh from backend getTicketById) or ticket
              const currentTicket = fullTicket || ticket;

              // Inspect workflow history to accurately identify notes and actors
              const historyList = Array.isArray(currentTicket.history)
                ? currentTicket.history
                : typeof currentTicket.history === "string"
                ? JSON.parse(currentTicket.history || "[]")
                : [];

              // Check for approval entry and note
              const approveEntry = [...historyList].reverse().find((h) => {
                const note = String(h?.note || "");
                return note.toLowerCase().startsWith("approved by") || h?.to === "Open";
              });

              let approverApprovedNote =
                currentTicket.approver_reason ||
                currentTicket.reason ||
                ticket.approver_reason ||
                ticket.reason ||
                "";

              if (!approverApprovedNote && approveEntry) {
                const colonIdx = approveEntry.note?.indexOf(":");
                if (colonIdx !== -1 && colonIdx !== undefined) {
                  approverApprovedNote = approveEntry.note.slice(colonIdx + 1).trim();
                } else if (approveEntry.note && !approveEntry.note.toLowerCase().includes("sent directly")) {
                  approverApprovedNote = approveEntry.note;
                }
              }

              // Check for rejection entry
              const lastRejectEntry = [...historyList].reverse().find((h) => {
                const note = String(h?.note || "").toLowerCase();
                return h?.to === "Rejected" || note.startsWith("rejected by");
              });

              let rejectNote =
                currentTicket.resolution ||
                currentTicket.approver_reason ||
                currentTicket.reason ||
                ticket.resolution ||
                ticket.approver_reason ||
                ticket.reason ||
                "";

              if (!rejectNote && lastRejectEntry) {
                const colonIdx = lastRejectEntry.note?.indexOf(":");
                if (colonIdx !== -1 && colonIdx !== undefined) {
                  rejectNote = lastRejectEntry.note.slice(colonIdx + 1).trim();
                } else if (lastRejectEntry.note) {
                  rejectNote = lastRejectEntry.note;
                }
              }

              // Identify whether rejection was done by Support Team or Approver
              const rejectNoteLower = String(lastRejectEntry?.note || "").toLowerCase();
              const isRejectedBySupport =
                currentTicket.status === "Rejected" &&
                (Boolean(currentTicket.resolution) ||
                  rejectNoteLower.includes("support team") ||
                  rejectNoteLower.includes("(support)") ||
                  (currentTicket.assignee && !rejectNoteLower.includes("approver")));

              if (currentTicket.status === "Rejected") {
                if (isRejectedBySupport) {
                  return (
                    <div
                      className="p-3.5 rounded-xl border text-sm mt-3"
                      style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)" }}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--mu)" }}>
                        Support Team Rejection Note:
                      </div>
                      <div className="text-sm font-normal text-black dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                        {rejectNote || "No rejection reason provided."}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div
                      className="p-3.5 rounded-xl border text-sm mt-3"
                      style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)" }}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--mu)" }}>
                        Approver Rejection Note:
                      </div>
                      <div className="text-sm font-normal text-black dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                        {rejectNote || "No rejection reason provided."}
                      </div>
                    </div>
                  );
                }
              }

              return (
                <>
                  {approverApprovedNote && (
                    <div
                      className="p-3.5 rounded-xl border text-sm mt-3"
                      style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)" }}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--mu)" }}>
                        Approver Note:
                      </div>
                      <div className="text-sm font-normal text-black dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                        {approverApprovedNote}
                      </div>
                    </div>
                  )}

                  {currentTicket.resolution && (
                    <div
                      className="p-3.5 rounded-xl border text-sm mt-3"
                      style={{ backgroundColor: "#faf9fe", borderColor: "var(--ln)" }}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--mu)" }}>
                        Support Team Resolved Note:
                      </div>
                      <div className="text-sm font-normal text-black dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                        {currentTicket.resolution}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Clarification History Section (Display past Q&A, fixed section with max height & scrollbar hidden) */}
            {(() => {
              const list =
                fullTicket?.clarifications && fullTicket.clarifications.length > 0
                  ? fullTicket.clarifications
                  : ticket.clarification
                  ? [
                      {
                        id: "legacy",
                        question: ticket.clarification,
                        asked_by_name: ticket.status === "Pending Approval" ? "Approver" : "Support Engineer",
                        asked_by_role: ticket.status === "Pending Approval" ? "Approver" : "Support Team",
                        asked_at: ticket.ticketDate || ticket.created_at,
                        answer: ticket.status !== "Clarification Needed" ? ticket.clarification_reply || null : null,
                        answered_by_name: isOwner ? "You" : "Owner",
                      },
                    ]
                  : [];

              if (list.length === 0) return null;

              return (
                <div
                  className="p-4 rounded-xl border space-y-3 mt-3"
                  style={{ backgroundColor: "#faf9fe", borderColor: "#e1ccee" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} style={{ color: "#7b3996" }} />
                      <h3 className="text-sm font-bold text-black dark:text-white">
                        Clarification
                      </h3>
                    </div>
                    {ticket.status === "Clarification Needed" && (
                      <span className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-[#f4eafa] text-[#7b3996]">
                        Clarification Requested
                      </span>
                    )}
                  </div>

                  {/* Scrollable container showing past messages with hidden scrollbar */}
                  <div className="max-h-[220px] overflow-y-auto no-scrollbar space-y-3 pr-0.5">
                    {list.map((c, idx) => {
                      const reviewerLabel = c.asked_by_role || c.asked_by_name || "Reviewer";
                      const ownerLabel = isOwner ? "You" : "Owner";

                      return (
                        <div
                          key={c.id || idx}
                          className="rounded-lg p-3 bg-white/70 dark:bg-black/20 border space-y-2"
                          style={{ borderColor: "#ece5f2" }}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-[#7b3996]">
                                {reviewerLabel}
                              </span>
                              {c.asked_at && (
                                <span className="text-[11px]" style={{ color: "var(--mu)" }}>
                                  {formatNormalDate(c.asked_at, true)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-normal text-black dark:text-gray-100 whitespace-pre-wrap">
                              {c.question}
                            </p>
                          </div>

                          {c.answer ? (
                            <div
                              className="pt-2 mt-2 border-t"
                              style={{ borderColor: "#ece5f2" }}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#237a4a]">
                                  {ownerLabel}
                                </span>
                                {c.answered_at && (
                                  <span className="text-[11px]" style={{ color: "var(--mu)" }}>
                                    {formatNormalDate(c.answered_at, true)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-normal text-black dark:text-gray-100 whitespace-pre-wrap">
                                {c.answer}
                              </p>
                            </div>
                          ) : (
                            <div className="pt-1 text-xs italic" style={{ color: "var(--mu)" }}>
                              Awaiting response from {ownerLabel}...
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Action Box: Placed under Attachments */}
            {/* 1. Clarification Response (Displayed for ticket creator of any role when clarification is requested) */}
            {isOwner && ticket.status === "Clarification Needed" && (
              <div
                className="rounded-xl border shadow-xs p-4 sm:p-5 space-y-3 mt-3"
                style={{ backgroundColor: "var(--sf)", borderColor: "#e1ccee" }}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} style={{ color: "#7b3996" }} />
                  <h3 className="text-sm font-bold text-black dark:text-white">
                    Respond to Clarification
                  </h3>
                </div>
                <textarea
                  rows={2}
                  value={clarificationText}
                  onChange={(e) => {
                    setClarificationText(e.target.value);
                    if (clarificationError) setClarificationError("");
                  }}
                  placeholder="Enter your response and details here..."
                  className="w-full px-3.5 py-2 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                  style={{
                    backgroundColor: "var(--sf)",
                    borderColor: "var(--ln)",
                  }}
                />
                {clarificationError && (
                  <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">
                    {clarificationError}
                  </p>
                )}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={Boolean(actionLoading)}
                    onClick={async () => {
                      if (!clarificationText.trim()) {
                        setClarificationError("Please enter your response before submitting.");
                        return;
                      }
                      setClarificationError("");
                      setActionLoading("respond-clarification");
                      try {
                        await submitClarification(ticket.id, clarificationText);
                        setClarificationText("");
                      } finally {
                        setActionLoading("");
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-bold text-xs text-white cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "var(--pu)" }}
                  >
                    {actionLoading === "respond-clarification" ? "Submitting..." : "Submit Response"}
                  </button>
                </div>
              </div>
            )}

            {/* 2. Approver Decision Action Card (Approver only on tickets assigned to them, only when Pending Approval) */}
            {isApprover && !isOwner && !isAdmin && ticket.status === "Pending Approval" && (Number(ticket.approver_id || ticket.approver) === Number(me?.employee_id || me?.id)) && (
                <div
                  className="rounded-xl border shadow-xs p-5 space-y-3 mt-4"
                  style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
                >
                  <h3 className="text-sm font-bold text-black dark:text-white">
                    Approver Decision
                  </h3>
                  <div>
                    <textarea
                      rows={2}
                      value={decisionReason}
                      onChange={(e) => {
                        setDecisionReason(e.target.value);
                        if (decisionError) setDecisionError("");
                      }}
                      placeholder="Add a comment. Required for Clarification and Reject."
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                      style={{
                        backgroundColor: "var(--sf)",
                        borderColor: "var(--ln)",
                      }}
                    />
                    {decisionError && (
                      <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">
                        {decisionError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={Boolean(actionLoading)}
                      onClick={async () => {
                        if (!decisionReason.trim() || decisionReason.trim().length < 5) {
                          setDecisionError("Please enter the clarification note (at least 5 characters).");
                          return;
                        }
                        setDecisionError("");
                        setActionLoading("clarification");
                        try {
                          await requestClarification(ticket.id, decisionReason);
                          setDecisionReason("");
                        } finally {
                          setActionLoading("");
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg font-bold text-xs text-[#7b3996] bg-[#f4eafa] border border-[#e1ccee] hover:bg-[#ebdcf5] cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === "clarification" ? "Submitting..." : "Clarification"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading)}
                      onClick={async () => {
                        const err = validateComment(decisionReason, "approve this ticket");
                        if (err) {
                          setDecisionError(err);
                          return;
                        }
                        setDecisionError("");
                        setActionLoading("approve");
                        try {
                          await decide(ticket.id, true, decisionReason); // true = approve
                          setDecisionReason("");
                        } finally {
                          setActionLoading("");
                        }
                      }}
                      className="px-4 py-1.5 rounded-lg font-bold text-xs text-white bg-[#237a4a] hover:bg-[#1f6d34] cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {actionLoading === "approve" ? "Approving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading)}
                      onClick={async () => {
                        if (!decisionReason.trim() || decisionReason.trim().length < 5) {
                          setDecisionError("Please enter a reason (at least 5 characters) to reject.");
                          return;
                        }
                        setDecisionError("");
                        setActionLoading("reject");
                        try {
                          await decide(ticket.id, false, decisionReason);
                          setDecisionReason("");
                        } finally {
                          setActionLoading("");
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg font-bold text-xs text-[#a33c32] bg-[#fff0ed] border border-[#f0c9c2] hover:bg-[#fde2dd] cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === "reject" ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              )}

            {/* 3. Support Team Claim Action Card (Unassigned Pool Tickets) */}
            {isSupport && ticket.status === "Open" && !ticket.assignee && (
              <div
                className="rounded-xl border shadow-xs p-5 space-y-3 mt-4"
                style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
              >
                <h3 className="text-sm font-bold text-black dark:text-white">
                  Ticket Pool Action
                </h3>
                <p className="text-xs" style={{ color: "var(--mu)" }}>
                  This ticket is unassigned. Take ownership to begin working on it.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={Boolean(actionLoading)}
                    onClick={async () => {
                      setActionLoading("take");
                      try {
                        await takeTicket(ticket.id);
                      } finally {
                        setActionLoading("");
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg font-bold text-xs text-white cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "var(--pu)" }}
                  >
                    {actionLoading === "take" ? "Taking..." : "Take Ticket"}
                  </button>
                </div>
              </div>
            )}

            {/* 4. Support Team Work Action Card (In Progress / Assigned Tickets, only when not awaiting clarification) */}
            {isSupport &&
              (Number(ticket.assignee) === Number(me?.employee_id || me?.id) || !ticket.assignee) &&
              (ticket.status === "In Progress" || ticket.status === "Pending") && (
                <div
                  className="rounded-xl border shadow-xs p-5 space-y-3 mt-1"
                  style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
                >
                  <h3 className="text-sm font-bold text-black dark:text-white">
                    Support Action
                  </h3>
                  <div>
                    <textarea
                      rows={1}
                      value={workResolution}
                      onChange={(e) => {
                        setWorkResolution(e.target.value);
                        if (workError) setWorkError("");
                      }}
                      placeholder="Add a comment. Required for Clarification, Reject and Resolve."
                      className="w-full px-3 py-2 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                      style={{
                        backgroundColor: "var(--sf)",
                        borderColor: "var(--ln)",
                      }}
                    />
                    {workError && (
                      <p className="text-xs text-red-500 dark:text-red-400 font-medium mt-1">
                        {workError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={Boolean(actionLoading)}
                      onClick={async () => {
                        if (!workResolution.trim()) {
                          setWorkError("Add a comment to request clarification.");
                          return;
                        }
                        setWorkError("");
                        setActionLoading("support-clarification");
                        try {
                          await requestClarification(ticket.id, workResolution);
                          setWorkResolution("");
                        } finally {
                          setActionLoading("");
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg font-bold text-xs text-[#7b3996] bg-[#f4eafa] border border-[#e1ccee] hover:bg-[#ebdcf5] cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === "support-clarification" ? "Submitting..." : "Clarification"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading)}
                      onClick={async () => {
                        setActionLoading("release");
                        try {
                          await releaseTicket(ticket.id);
                        } finally {
                          setActionLoading("");
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-black/5 cursor-pointer disabled:opacity-50"
                      style={{ borderColor: "var(--ln)", color: "var(--tx)" }}
                    >
                      {actionLoading === "release" ? "Releasing..." : "Release to Pool"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading)}
                      onClick={async () => {
                        if (!workResolution.trim() || workResolution.trim().length < 5) {
                          setWorkError("Please enter a reason (at least 5 characters) to reject.");
                          return;
                        }
                        setWorkError("");
                        setActionLoading("support-reject");
                        try {
                          await decide(ticket.id, false, workResolution);
                        } finally {
                          setActionLoading("");
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg font-bold text-xs text-[#a33c32] bg-[#fff0ed] border border-[#f0c9c2] hover:bg-[#fde2dd] cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === "support-reject" ? "Rejecting..." : "Reject"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(actionLoading)}
                      onClick={async () => {
                        if (!workResolution.trim()) {
                          setWorkError("Please enter resolution details to resolve.");
                          return;
                        }
                        setWorkError("");
                        setActionLoading("resolve");
                        try {
                          await workTicket(ticket.id, "Resolved", workResolution);
                        } finally {
                          setActionLoading("");
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg font-bold text-xs text-white bg-[#237a4a] hover:bg-[#1f6d34] cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {actionLoading === "resolve" ? "Resolving..." : "Resolve"}
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Right Column: Workflow History + Related Tickets */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-0 gap-3.5 overflow-hidden">
          {/* 1. Workflow History Card */}
          <div
            className="rounded-xl border shadow-xs p-3.5 sm:p-4 flex flex-col flex-1 min-h-0 overflow-hidden"
            style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
          >
            <div className="flex items-center gap-2 pb-2 border-b mb-2 shrink-0" style={{ borderColor: "var(--ln)" }}>
              <History size={16} style={{ color: "var(--pu)" }} />
              <h2 className="text-sm font-bold text-black dark:text-white">Workflow History</h2>
            </div>

            {ticket.history && ticket.history.length > 0 ? (
              <div className="flex-1 overflow-y-auto hidden-scroll pr-1 min-h-0">
                <ol className="history-timeline ">
                  {ticket.history.map((h, i) => (
                    <li key={i} className="history-item">
                      <span className="history-dot" aria-hidden="true" />
                      <div className="leading-snug min-w-0">
                        <b className="block text-xs sm:text-sm font-bold text-black dark:text-white truncate">
                          {h.note}
                        </b>
                        <p className="text-[11px] sm:text-xs mt-0.5 font-normal" style={{ color: "var(--mu)" }}>
                          {h.byName || getUser(h.by)} · {formatNormalDate(h.t, true)}
                          {h.from && h.to && h.from !== h.to && (
                            <span className="ml-1 text-[11px] font-semibold text-gray-500">
                              ({h.from} → {h.to})
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-0">
                <p className="text-xs italic" style={{ color: "var(--mu)" }}>No history recorded yet.</p>
              </div>
            )}
          </div>
          {/* 2. Related Tickets Card (Bottom half: exactly 50% height) */}
          <div
            className="rounded-xl border shadow-xs p-3.5 sm:p-4 flex flex-col flex-1 min-h-0 overflow-hidden"
            style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
          >
            <div className="flex items-center justify-between pb-2 border-b mb-1 shrink-0" style={{ borderColor: "var(--ln)" }}>
              <div className="flex items-center gap-2">
                <Ticket size={16} style={{ color: "var(--pu)" }} />
                <h2 className="text-sm font-bold text-black dark:text-white">
                  Related Tickets
                </h2>
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--mu)" }}>
                {relatedTickets.length} found
              </span>
            </div>

            {relatedTickets.length > 0 ? (
              <div className="flex-1 divide-y overflow-y-auto hidden-scroll pr-1 min-h-0" style={{ borderColor: "var(--ln)" }}>
                {relatedTickets.map((rt) => (
                  <div
                    key={rt.id}
                    onClick={() => setSel(rt.id)}
                    className="py-2 flex items-center justify-between gap-2.5 cursor-pointer rounded-lg px-1.5 -mx-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold whitespace-nowrap shrink-0" style={{ color: "var(--pu)" }}>
                          {rt.id}
                        </span>
                        <span className="text-xs font-semibold text-black dark:text-white truncate block min-w-0">
                          {rt.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: "var(--mu)" }}>
                        <span className="truncate">{rt.cat || "General"}</span>
                        <span>•</span>
                        <span className="whitespace-nowrap shrink-0">{formatNormalDate(rt.ticketDate || rt.created_at || rt.createdAt || rt.created)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 scale-90 origin-right">
                      {getStatusBadge(rt.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-0">
                <p className="text-xs italic" style={{ color: "var(--mu)" }}>
                  No related tickets found.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      {attachment && (
        <AttachmentPreview
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          fileName={attachment.attachment_name}
          fileUrl={`${ASSET_BASE}/${attachment.attachment_path}`}
          fileSize={formatFileSize(attachment.file_size)}
        />
      )}
    </div>
  );
}
