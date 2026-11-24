"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatFileSize } from "@/lib/constants";
import { useHierarchy } from "@/hooks/useHierarchy";
import { Trash2, Paperclip, Send } from "lucide-react";

export default function NewTicketView() {
  const { draft, updateDraft, submitTicket, me, setDraft, setView, showToast } = useApp();
  const [attachments, setAttachments] = useState([]);
  const [ticketDate, setTicketDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { categories, subCategories, items, loading } = useHierarchy();

  const filteredSubCategories = draft.catId ? subCategories.filter(sc => sc.category_id === draft.catId) : [];
  const filteredItems = draft.subId ? items.filter(it => it.sub_category_id === draft.subId) : [];

  // -------------------------------------------------
  // Validation
  // -------------------------------------------------
  const validate = () => {
    const errs = {};
    if (!draft.cat) errs.cat = "Select a category";
    if (!draft.sub) errs.sub = "Select a sub category";
    if (!draft.item) errs.item = "Select an item";
    if (!draft.title || !draft.title.trim())
      errs.title = "Short description is required";
    else if (draft.title.trim().length < 5)
      errs.title = "Enter at least 5 characters";
    if (!draft.desc || !draft.desc.trim())
      errs.desc = "Description is required";
    else if (draft.desc.trim().length < 10)
      errs.desc = "Describe the issue in at least 10 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // -------------------------------------------------
  // Submit handler
  // -------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const success = await submitTicket(attachments[0] || null, ticketDate);
    setSubmitting(false);

    if (success) {
      setAttachments([]);
      setErrors({});
    }
  };

  const handleCancel = () => {
    setDraft({
      cat: "",
      catId: undefined,
      sub: "",
      subId: undefined,
      item: "",
      itemId: undefined,
      title: "",
      desc: "",
      pr: "Medium",
    });
    setAttachments([]);
    setErrors({});
    setView("dash");
  };

  // -------------------------------------------------
  // File input handler (single attachment, 5 MB limit)
  // -------------------------------------------------
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"];

    const invalidFiles = selectedFiles.filter((file) => {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      return !allowedTypes.includes(file.type) || !allowedExtensions.includes(ext);
    });

    if (invalidFiles.length > 0) {
      setErrors((prev) => ({
        ...prev,
        file: "Only JPG, PNG or PDF files are allowed",
      }));
      e.target.value = "";
      return;
    }

    const oversized = selectedFiles.filter(
      (file) => file.size > 5 * 1024 * 1024
    );
    if (oversized.length > 0) {
      setErrors((prev) => ({
        ...prev,
        file: "File must be 5 MB or smaller",
      }));
      e.target.value = "";
      return;
    }

    const emptyFiles = selectedFiles.filter((file) => file.size === 0);
    if (emptyFiles.length > 0) {
      setErrors((prev) => ({
        ...prev,
        file: "This file is empty (0 KB). Please choose a valid file",
      }));
      e.target.value = "";
      return;
    }

    setErrors((prev) => ({ ...prev, file: null }));
    setAttachments([selectedFiles[0]]);
    e.target.value = "";
  };

  const isEmployee = me?.role === "Employee";

  // Role-based workflow steps matching Mockup Image 2
  const workflowSteps = isEmployee
    ? [
      {
        num: 1,
        title: "You submit",
        desc: "Fill in the form and send it.",
      },
      {
        num: 2,
        title: "Approver reviews",
        desc: "Your manager reviews and approves the request.",
      },
      {
        num: 3,
        title: "Support Team works",
        desc: "Once approved, an engineer takes the ticket.",
      },
      {
        num: 4,
        title: "Resolved",
        desc: "An email is sent when it is closed.",
      },
    ]
    : [
      {
        num: 1,
        title: "You submit",
        desc: "Fill in the form and send it.",
      },
      {
        num: 2,
        title: "Direct to Support Team",
        desc: "No approval step for your role.",
      },
      {
        num: 3,
        title: "Support Team works",
        desc: "An engineer takes the ticket.",
      },
      {
        num: 4,
        title: "Resolved",
        desc: "An email is sent when it is closed.",
      },
    ];

  // -------------------------------------------------
  // UI – Modern 2-column layout (Form + What happens next)
  // -------------------------------------------------
  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      {/* Header */}
      <div
        className="pb-2.5 border-b flex flex-wrap items-center justify-between gap-2"
        style={{ borderColor: "var(--ln)" }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            New Ticket
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--mu)" }}>
            {isEmployee
              ? "Your ticket goes to an Approver first, then to the Support Team."
              : `Tickets created by ${me?.role || "Staff"} go directly to the Support Team.`}
          </p>
        </div>
      </div>

      {/* Main Grid: Form (8 cols) + What happens next (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
        {/* Left Form Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-8 rounded-2xl border shadow-xs p-5 sm:p-6 flex flex-col justify-between"
          style={{
            backgroundColor: "var(--sf)",
            borderColor: "var(--ln)",
          }}
        >
          <div className="space-y-5 sm:space-y-6">
            {/* Row 1: Raised By, Ticket Date, Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                  Raised By
                </label>
                <input
                  type="text"
                  value={me?.name || ""}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg text-sm text-black dark:text-gray-200 border bg-black/[0.02] dark:bg-white/[0.04] cursor-default"
                  style={{ borderColor: "var(--ln)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                  Ticket Date
                </label>
                <input
                  type="text"
                  value={ticketDate}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg text-sm text-black dark:text-gray-200 border bg-black/[0.02] dark:bg-white/[0.04] cursor-default focus:outline-hidden"
                  style={{ borderColor: "var(--ln)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                  Priority <span style={{ color: "var(--rd)" }}>*</span>
                </label>
                <select
                  value={draft.pr || "Medium"}
                  onChange={(e) => updateDraft("pr", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer"
                  style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Row 2: Category, Sub Category, Item */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                  Category <span style={{ color: "var(--rd)" }}>*</span>
                </label>
                <select
                  value={draft.catId || ""}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const cat = categories.find((c) => c.category_id === selectedId);
                    updateDraft({
                      cat: cat?.name || "",
                      catId: selectedId || undefined,
                      sub: "",
                      subId: undefined,
                      item: "",
                      itemId: undefined,
                    });
                    if (errors.cat) setErrors((p) => ({ ...p, cat: null }));
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer transition-colors"
                  style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.cat && (
                  <p className="mt-1 text-xs" style={{ color: "var(--rd)" }}>
                    {errors.cat}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                  Sub Category <span style={{ color: "var(--rd)" }}>*</span>
                </label>
                <select
                  disabled={!draft.catId}
                  value={draft.subId || ""}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const sub = subCategories.find((sc) => sc.sub_category_id === selectedId);
                    updateDraft({
                      sub: sub?.name || "",
                      subId: selectedId || undefined,
                      item: "",
                      itemId: undefined,
                    });
                    if (errors.sub) setErrors((p) => ({ ...p, sub: null }));
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
                >
                  <option value="">-- Select Sub Category --</option>
                  {filteredSubCategories.map((sc) => (
                    <option key={sc.sub_category_id} value={sc.sub_category_id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
                {errors.sub && (
                  <p className="mt-1 text-xs" style={{ color: "var(--rd)" }}>
                    {errors.sub}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                  Item <span style={{ color: "var(--rd)" }}>*</span>
                </label>
                <select
                  disabled={!draft.subId}
                  value={draft.itemId || ""}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const it = items.find((i) => i.item_id === selectedId);
                    updateDraft({
                      item: it?.name || "",
                      itemId: selectedId || undefined,
                    });
                    if (errors.item) setErrors((p) => ({ ...p, item: null }));
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
                >
                  <option value="">-- Select Item --</option>
                  {filteredItems.map((it) => (
                    <option key={it.item_id} value={it.item_id}>
                      {it.name}
                    </option>
                  ))}
                </select>
                {errors.item && (
                  <p className="mt-1 text-xs" style={{ color: "var(--rd)" }}>
                    {errors.item}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Short Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                Short Description <span style={{ color: "var(--rd)" }}>*</span>
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => {
                  updateDraft("title", e.target.value);
                  if (errors.title) setErrors((p) => ({ ...p, title: null }));
                }}
                placeholder="One-line summary (e.g. VPN access gateway dropouts)"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
              />
              {errors.title && (
                <p className="mt-1 text-xs" style={{ color: "var(--rd)" }}>
                  {errors.title}
                </p>
              )}
            </div>

            {/* Row 4: Detailed Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                Description <span style={{ color: "var(--rd)" }}>*</span>
              </label>
              <textarea
                rows={3}
                value={draft.desc}
                onChange={(e) => {
                  updateDraft("desc", e.target.value);
                  if (errors.desc) setErrors((p) => ({ ...p, desc: null }));
                }}
                placeholder="Explain the issue, error message and business impact..."
                className="w-full px-3.5 py-2.5 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden resize-none transition-colors"
                style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
              />
              {errors.desc && (
                <p className="mt-1 text-xs" style={{ color: "var(--rd)" }}>
                  {errors.desc}
                </p>
              )}
            </div>

            {/* Row 5: Attachment (Moved above the line) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                Attachment
              </label>
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  {attachments.length > 0 ? (
                    <div
                      className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs text-black dark:text-gray-100 max-w-sm"
                      style={{ borderColor: "var(--ln)", backgroundColor: "var(--bg)" }}
                    >
                      <Paperclip size={14} style={{ color: "var(--pu)" }} />
                      <span className="truncate font-medium">{attachments[0].name}</span>
                      <span className="text-xs opacity-70" style={{ color: "var(--mu)" }}>
                        ({formatFileSize(attachments[0].size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachments([])}
                        className="ml-1 text-red-500 hover:text-red-700 cursor-pointer"
                        title="Remove attachment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <label
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition"
                      style={{ borderColor: "var(--ln)", color: "var(--pu)", backgroundColor: "var(--sf)" }}
                    >
                      <Paperclip size={14} />
                      <span>Choose File (Max 5MB)</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {errors.file && (
                  <p className="text-xs mt-1" style={{ color: "var(--rd)" }}>
                    {errors.file}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions Footer (Below the line) */}
          <div
            className="pt-4 mt-6 border-t flex items-center justify-end gap-3"
            style={{ borderColor: "var(--ln)" }}
          >
            <button
              type="button"
              onClick={() => handleCancel()}
              className="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
              style={{ borderColor: "var(--ln)", color: "var(--tx)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
              style={{ backgroundColor: "var(--pu)" }}
            >
              <Send size={13} />
              <span>{submitting ? "Submitting…" : "Submit Ticket"}</span>
            </button>
          </div>
        </form>

        {/* Right Column: "What happens next" Card matching Mockup Image 2 */}
        <div
          className="lg:col-span-4 rounded-2xl border shadow-xs p-5 sm:p-6 flex flex-col justify-between"
          style={{
            backgroundColor: "var(--sf)",
            borderColor: "var(--ln)",
          }}
        >
          <div>
            <h2 className="text-lg font-bold tracking-tight text-black dark:text-white mb-5">
              What happens next
            </h2>

            <div className="space-y-4 sm:space-y-5">
              {workflowSteps.map((step) => (
                <div key={step.num} className="flex items-start gap-3.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs select-none"
                    style={{ backgroundColor: "#5d4ea8" }}
                  >
                    {step.num}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <b className="text-sm font-bold text-black dark:text-white block">
                      {step.title}
                    </b>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Helpful Tip Box at bottom of right card */}
          <div
            className="mt-6 rounded-xl p-3.5 border text-xs leading-relaxed"
            style={{
              backgroundColor: "var(--bg)",
              borderColor: "var(--ln)",
              color: "var(--mu)",
            }}
          >
            <span className="font-semibold text-black dark:text-white block mb-1">
              💡 Tip for faster resolution
            </span>
            Attaching a screenshot or error details helps our support team diagnose and resolve your issue much quicker.
          </div>
        </div>
      </div>
    </div>
  );
}
