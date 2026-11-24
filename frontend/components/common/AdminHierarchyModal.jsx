"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Loader2, Check } from "lucide-react";
import { API_BASE } from "@/lib/api";

const DEPARTMENTS_FALLBACK = [
  "Engineering",
  "IT Infrastructure",
  "IT Operations",
  "HR",
  "Finance",
];

export default function AdminHierarchyModal({
  isOpen,
  type = "category", // "category" | "subCategory" | "item"
  parentName = "",
  parentId = null,
  existingNames = [],
  onClose,
  onSuccess,
}) {
  const [name, setName] = useState("");
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deptList, setDeptList] = useState(DEPARTMENTS_FALLBACK);

  // Fetch departments dynamically from backend
  useEffect(() => {
    if (!isOpen || type !== "category") return;
    fetch(`${API_BASE}/departments`)
      .then((r) => r.json())
      .then((data) => {
        const names = Array.isArray(data)
          ? data.map((d) => d.name).filter(Boolean)
          : [];
        if (names.length > 0) setDeptList(names);
      })
      .catch(() => {
        // keep fallback list
      });
  }, [isOpen, type]);

  if (!isOpen) return null;

  const toggleDept = (dept) => {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const typeLabels = {
    category: "Category",
    subCategory: "Sub Category",
    item: "Item",
  };

  const endpointMap = {
    category: `${API_BASE}/categories`,
    subCategory: `${API_BASE}/subcategories`,
    item: `${API_BASE}/items`,
  };

  const validateInput = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return `Please enter a ${typeLabels[type]} name.`;
    }
    if (trimmed.length < 2) {
      return `${typeLabels[type]} name must be at least 2 characters long.`;
    }
    if (trimmed.length > 100) {
      return `${typeLabels[type]} name cannot exceed 100 characters.`;
    }
    if (type !== "category" && !parentId) {
      return `Please select a parent ${type === "subCategory" ? "Category" : "Sub Category"} first.`;
    }
    if (type === "category" && selectedDepts.length === 0) {
      return "Please select at least one responsible department for this category.";
    }
    if (Array.isArray(existingNames)) {
      const isDuplicate = existingNames.some(
        (existing) => existing?.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        return `A ${typeLabels[type].toLowerCase()} named "${trimmed}" already exists here.`;
      }
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateInput(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const headers = {
        "Content-Type": "application/json",
      };

      const payload =
        type === "category"
          ? { name: name.trim(), active: true, departments: selectedDepts }
          : type === "subCategory"
          ? { name: name.trim(), category_id: parentId, active: true }
          : { name: name.trim(), sub_category_id: parentId, active: true };

      const res = await fetch(endpointMap[type], {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Failed to create ${typeLabels[type]}`);
      }

      setName("");
      setSelectedDepts([]);
      setError("");
      onSuccess?.(data.data);
      onClose();
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl border shadow-xl p-6 relative animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: "var(--sf)",
          borderColor: "var(--ln)",
          color: "var(--tx)",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <h3 className="text-lg font-bold tracking-tight text-black dark:text-white">
            Add New {typeLabels[type]}
          </h3>
          {parentName && (
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
              Under: <span className="font-semibold text-black dark:text-white">{parentName}</span>
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
              {typeLabels[type]} Name <span style={{ color: "var(--rd)" }}>*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder={`Enter ${typeLabels[type].toLowerCase()} name...`}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
              style={{ backgroundColor: "var(--sf)", borderColor: "var(--ln)" }}
            />
            {error && (
              <p className="mt-1.5 text-xs font-medium" style={{ color: "var(--rd)" }}>
                {error}
              </p>
            )}
          </div>

          {/* Department Selection (Only when creating a Category) */}
          {type === "category" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                Responsible Department(s) <span style={{ color: "var(--rd)" }}>*</span>
                <span className="block text-[11px] normal-case font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                  Select which support department(s) can view & resolve this category:
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {deptList.map((dept) => {
                  const isChecked = selectedDepts.includes(dept);
                  return (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => {
                        toggleDept(dept);
                        if (error) setError("");
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all text-left ${
                        isChecked
                          ? "border-purple-500 bg-purple-500/10 font-semibold text-purple-700 dark:text-purple-300"
                          : "border-gray-200 dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors border shrink-0 ${
                          isChecked
                            ? "bg-purple-600 border-purple-600 text-white"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        }`}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{dept}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: "var(--ln)" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
              style={{ borderColor: "var(--ln)", color: "var(--tx)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
              style={{ backgroundColor: "var(--pu)" }}
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Creating…</span>
                </>
              ) : (
                <>
                  <Plus size={13} />
                  <span>Create {typeLabels[type]}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
