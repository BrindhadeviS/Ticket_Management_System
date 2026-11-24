"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useHierarchy } from "@/hooks/useHierarchy";
import { API_BASE } from "@/lib/api";
import {
  Building2,
  FolderTree,
  Folder,
  FileText,
  Plus,
  Check,
  CheckCircle2,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";

export default function MasterDataView() {
  const { showToast, refreshDepartments } = useApp();
  const { categories, subCategories, items, loading: hierarchyLoading, refreshHierarchy } = useHierarchy();

  // Selected Entity Type to Add/Edit
  // "department" | "category" | "subCategory" | "item"
  const [activeType, setActiveType] = useState("department");

  // Departments State
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);

  // Form States
  const [name, setName] = useState("");
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Right Panel Tree Search / Filter
  const [catalogSearch, setCatalogSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});

  // Fetch departments from backend
  const fetchDepartments = async () => {
    try {
      setDeptLoading(true);
      const res = await fetch(`${API_BASE}/departments`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        setDepartments(Array.isArray(json?.data) ? json.data : []);
      }
    } catch (err) {
      console.error("Failed to load departments:", err);
    } finally {
      setDeptLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Reset form errors and input when switching types
  const handleTypeChange = (type) => {
    setActiveType(type);
    setName("");
    setSelectedDepts([]);
    setSelectedCatId("");
    setSelectedSubId("");
    setErrors({});
  };

  const toggleDeptSelection = (deptName) => {
    setSelectedDepts((prev) =>
      prev.includes(deptName)
        ? prev.filter((d) => d !== deptName)
        : [...prev, deptName]
    );
    if (errors.depts) {
      setErrors((prev) => ({ ...prev, depts: "" }));
    }
  };

  // Validation
  const validate = () => {
    const errs = {};
    const trimmed = name.trim();

    if (!trimmed) {
      errs.name = "Name is required.";
    } else if (trimmed.length < 2) {
      errs.name = "Must be at least 2 characters.";
    } else if (trimmed.length > 100) {
      errs.name = "Cannot exceed 100 characters.";
    }

    if (activeType === "department") {
      const exists = departments.some(
        (d) => d.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) errs.name = `Department "${trimmed}" already exists.`;
    } else if (activeType === "category") {
      const exists = categories.some(
        (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) errs.name = `Category "${trimmed}" already exists.`;
      if (selectedDepts.length === 0) {
        errs.depts = "Select at least one department for routing.";
      }
    } else if (activeType === "subCategory") {
      if (!selectedCatId) {
        errs.catId = "Please select a parent category.";
      } else {
        const exists = subCategories.some(
          (sc) =>
            Number(sc.category_id) === Number(selectedCatId) &&
            sc.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) errs.name = `Sub-category "${trimmed}" already exists under this category.`;
      }
    } else if (activeType === "item") {
      if (!selectedSubId) {
        errs.subId = "Please select a sub-category.";
      } else {
        const exists = items.some(
          (it) =>
            Number(it.sub_category_id) === Number(selectedSubId) &&
            it.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) errs.name = `Item "${trimmed}" already exists under this sub-category.`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const trimmed = name.trim();

    try {
      let endpoint = "";
      let payload = {};

      if (activeType === "department") {
        endpoint = `${API_BASE}/departments`;
        payload = { name: trimmed };
      } else if (activeType === "category") {
        endpoint = `${API_BASE}/categories`;
        payload = { name: trimmed, departments: selectedDepts };
      } else if (activeType === "subCategory") {
        endpoint = `${API_BASE}/subcategories`;
        payload = { name: trimmed, category_id: Number(selectedCatId) };
      } else if (activeType === "item") {
        endpoint = `${API_BASE}/items`;
        payload = { name: trimmed, sub_category_id: Number(selectedSubId) };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to create record.");
      }

      // Success feedback
      const typeLabel =
        activeType === "department"
          ? "Department"
          : activeType === "category"
          ? "Category"
          : activeType === "subCategory"
          ? "Sub Category"
          : "Item";

      showToast(`${typeLabel} "${trimmed}" created successfully.`);

      // Reset form
      setName("");
      setSelectedDepts([]);
      if (activeType !== "subCategory") setSelectedCatId("");
      if (activeType !== "item") setSelectedSubId("");

      // Refresh data
      if (activeType === "department") {
        await fetchDepartments();
        if (typeof refreshDepartments === "function") {
          await refreshDepartments();
        }
      } else {
        await refreshHierarchy();
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, api: err.message }));
      showToast(err.message || "Error creating entry.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle tree expansion
  const toggleCategoryExpand = (catId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Filtered Hierarchy for right preview
  const filteredCategories = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((cat) => {
      const matchCat = cat.name.toLowerCase().includes(q);
      const catSubs = subCategories.filter((sc) => sc.category_id === cat.category_id);
      const matchSubs = catSubs.some((sc) => {
        const subMatch = sc.name.toLowerCase().includes(q);
        const subItems = items.filter((it) => it.sub_category_id === sc.sub_category_id);
        const itemMatch = subItems.some((it) => it.name.toLowerCase().includes(q));
        return subMatch || itemMatch;
      });
      const matchDepts = (cat.departments || []).some((d) => d.toLowerCase().includes(q));
      return matchCat || matchSubs || matchDepts;
    });
  }, [categories, subCategories, items, catalogSearch]);

  const typeConfig = [
    { key: "department", label: "Department", icon: Building2, desc: "Add an organizational department (e.g. IT Operations, HR, Finance)" },
    { key: "category", label: "Category", icon: FolderTree, desc: "Add a main ticket category and map to responsible departments" },
    { key: "subCategory", label: "Sub Category", icon: Folder, desc: "Add a sub-category under an existing category" },
    { key: "item", label: "Item", icon: FileText, desc: "Add a specific item under an existing sub-category" },
  ];

  return (
    <div className="w-full flex flex-col space-y-4 pb-10">
      {/* Header matching NewTicketView */}
      <div
        className="pb-2.5 border-b flex flex-wrap items-center justify-between gap-2"
        style={{ borderColor: "var(--ln)" }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
            Master Data
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--mu)" }}>
            Configure organization departments, categories, sub-categories, and items.
          </p>
        </div>
      </div>

      {/* Main Grid: Form Card (8 cols) + Hierarchy Preview Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Form Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-7 rounded-2xl border shadow-xs p-5 sm:p-6 flex flex-col "
          style={{
            backgroundColor: "var(--sf)",
            borderColor: "var(--ln)",
          }}
        >
          <div className="space-y-6">
            {/* Step 1: Entity Type Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2.5">
                What do you want to add? <span style={{ color: "var(--rd)" }}>*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {typeConfig.map((cfg) => {
                  const Icon = cfg.icon;
                  const isSelected = activeType === cfg.key;
                  return (
                    <button
                      key={cfg.key}
                      type="button"
                      onClick={() => handleTypeChange(cfg.key)}
                      className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "shadow-xs"
                          : "hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100"
                      }`}
                      style={{
                        borderColor: isSelected ? "var(--pu)" : "var(--ln)",
                        backgroundColor: isSelected ? "var(--pu2, rgba(109, 91, 184, 0.12))" : "var(--bg)",
                        color: isSelected ? "var(--pu)" : "var(--tx)",
                      }}
                    >
                      <Icon size={18} className="mb-1.5" />
                      <span className="text-xs font-bold">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--mu)" }}>
                {typeConfig.find((c) => c.key === activeType)?.desc}
              </p>
            </div>

            {/* Error Banner */}
            {errors.api && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                {errors.api}
              </div>
            )}

            {/* Step 2: Dynamic Form Fields */}
            <div className="space-y-5 pt-3 border-t" style={{ borderColor: "var(--ln)" }}>
              {/* Type: DEPARTMENT */}
              {activeType === "department" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                    Department Name <span style={{ color: "var(--rd)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                    }}
                    placeholder="e.g. IT Operations, Facilities, HR, Legal..."
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                    style={{
                      backgroundColor: "var(--bg)",
                      borderColor: errors.name ? "var(--rd)" : "var(--ln)",
                    }}
                  />
                  {errors.name && (
                    <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                      {errors.name}
                    </p>
                  )}
                  <p className="text-xs mt-2" style={{ color: "var(--mu)" }}>
                    Departments represent internal support groups responsible for handling ticket categories.
                  </p>
                </div>
              )}

              {/* Type: CATEGORY */}
              {activeType === "category" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                      Category Name <span style={{ color: "var(--rd)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                      }}
                      placeholder="e.g. Cloud Infrastructure, Security, Billing..."
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                      style={{
                        backgroundColor: "var(--bg)",
                        borderColor: errors.name ? "var(--rd)" : "var(--ln)",
                      }}
                    />
                    {errors.name && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                        Mapped Departments <span style={{ color: "var(--rd)" }}>*</span>
                      </label>
                      <span className="text-[11px]" style={{ color: "var(--mu)" }}>
                        Select which department(s) handle this category
                      </span>
                    </div>

                    {deptLoading ? (
                      <p className="text-xs py-2" style={{ color: "var(--mu)" }}>Loading departments...</p>
                    ) : departments.length === 0 ? (
                      <p className="text-xs py-2 text-amber-500">
                        No departments found. Please add a department first!
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border bg-black/[0.02] dark:bg-white/[0.02]" style={{ borderColor: "var(--ln)" }}>
                        {departments.map((d) => {
                          const isChecked = selectedDepts.includes(d.name);
                          return (
                            <button
                              key={d.department_id || d.name}
                              type="button"
                              onClick={() => toggleDeptSelection(d.name)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold text-left transition-all cursor-pointer ${
                                isChecked
                                  ? "shadow-2xs text-white"
                                  : "text-black dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5"
                              }`}
                              style={{
                                borderColor: isChecked ? "var(--pu)" : "var(--ln)",
                                backgroundColor: isChecked ? "var(--pu)" : "var(--sf)",
                              }}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border ${
                                  isChecked ? "bg-white text-purple-800 border-white" : "border-neutral-400"
                                }`}
                              >
                                {isChecked && <Check size={10} strokeWidth={3} />}
                              </div>
                              <span className="truncate">{d.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {errors.depts && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {errors.depts}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Type: SUB CATEGORY */}
              {activeType === "subCategory" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                      Parent Category <span style={{ color: "var(--rd)" }}>*</span>
                    </label>
                    <select
                      value={selectedCatId}
                      onChange={(e) => {
                        setSelectedCatId(e.target.value);
                        if (errors.catId) setErrors((p) => ({ ...p, catId: "" }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden transition-colors cursor-pointer"
                      style={{
                        backgroundColor: "var(--bg)",
                        borderColor: errors.catId ? "var(--rd)" : "var(--ln)",
                      }}
                    >
                      <option value="">-- Select Parent Category --</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {errors.catId && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {errors.catId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                      Sub Category Name <span style={{ color: "var(--rd)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                      }}
                      placeholder="e.g. Laptops & Desktops, Network VPN, Email Access..."
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                      style={{
                        backgroundColor: "var(--bg)",
                        borderColor: errors.name ? "var(--rd)" : "var(--ln)",
                      }}
                    />
                    {errors.name && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {errors.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Type: ITEM */}
              {activeType === "item" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                      Sub Category <span style={{ color: "var(--rd)" }}>*</span>
                    </label>
                    <select
                      value={selectedSubId}
                      onChange={(e) => {
                        setSelectedSubId(e.target.value);
                        if (errors.subId) setErrors((p) => ({ ...p, subId: "" }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden transition-colors cursor-pointer"
                      style={{
                        backgroundColor: "var(--bg)",
                        borderColor: errors.subId ? "var(--rd)" : "var(--ln)",
                      }}
                    >
                      <option value="">-- Select Sub Category --</option>
                      {subCategories.map((sc) => {
                        const parentCat = categories.find((c) => c.category_id === sc.category_id);
                        return (
                          <option key={sc.sub_category_id} value={sc.sub_category_id}>
                            {sc.name} {parentCat ? `(${parentCat.name})` : ""}
                          </option>
                        );
                      })}
                    </select>
                    {errors.subId && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {errors.subId}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "var(--mu)" }}>
                      Items are attached directly to a sub-category.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                      Item Name <span style={{ color: "var(--rd)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                      }}
                      placeholder="e.g. Keyboard Replacement, Password Reset, VPN Certificate..."
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                      style={{
                        backgroundColor: "var(--bg)",
                        borderColor: errors.name ? "var(--rd)" : "var(--ln)",
                      }}
                    />
                    {errors.name && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {errors.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div
            className="pt-4 mt-5 border-t flex items-center justify-end gap-3"
            style={{ borderColor: "var(--ln)" }}
          >
            <button
              type="button"
              onClick={() => {
                setName("");
                setSelectedDepts([]);
                setSelectedCatId("");
                setSelectedSubId("");
                setErrors({});
              }}
              className="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
              style={{ borderColor: "var(--ln)", color: "var(--tx)" }}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
              style={{ backgroundColor: "var(--pu)" }}
            >
              <Plus size={14} />
              <span>
                {submitting
                  ? "Adding..."
                  : `Add ${
                      activeType === "department"
                        ? "Department"
                        : activeType === "category"
                        ? "Category"
                        : activeType === "subCategory"
                        ? "Sub Category"
                        : "Item"
                    }`}
              </span>
            </button>
          </div>
        </form>

        {/* Right Preview Card matching "What happens next" right column */}
        <div
          className="lg:col-span-5 rounded-2xl border shadow-xs p-5 sm:p-6 flex flex-col"
          style={{
            backgroundColor: "var(--sf)",
            borderColor: "var(--ln)",
          }}
        >
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                <Layers size={16} style={{ color: "var(--pu)" }} />
                <span>Existing Catalog</span>
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5" style={{ color: "var(--mu)" }}>
                {categories.length} Categories
              </span>
            </div>

            {/* Search Filter for Catalog Preview */}
            <div className="relative mb-3">
              <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search catalog & departments..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border focus:outline-hidden transition-colors"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--ln)",
                  color: "var(--tx)",
                }}
              />
            </div>

            {/* Departments summary badges */}
            <div className="mb-3.5 pb-3 border-b" style={{ borderColor: "var(--ln)" }}>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--mu)" }}>
                Active Departments ({departments.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {departments.map((d) => (
                  <span
                    key={d.department_id || d.name}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: "var(--bg)",
                      borderColor: "var(--ln)",
                      color: "var(--tx)",
                    }}
                  >
                    <Building2 size={10} style={{ color: "var(--pu)" }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Tree Explorer */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[200px]">
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--mu)" }}>
                Category Structure
              </span>

              {hierarchyLoading ? (
                <p className="text-xs py-3 text-center" style={{ color: "var(--mu)" }}>Loading catalog...</p>
              ) : filteredCategories.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: "var(--mu)" }}>No matching categories found.</p>
              ) : (
                filteredCategories.map((cat) => {
                  const isExpanded = expandedCategories[cat.category_id] ?? true;
                  const catSubs = subCategories.filter((sc) => sc.category_id === cat.category_id);
                  const mappedDepts = cat.departments || [];

                  return (
                    <div
                      key={cat.category_id}
                      className="rounded-lg border p-2 transition-colors"
                      style={{
                        backgroundColor: "var(--bg)",
                        borderColor: "var(--ln)",
                      }}
                    >
                      {/* Category row */}
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand(cat.category_id)}
                        className="w-full flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isExpanded ? <ChevronDown size={14} className="text-neutral-400 shrink-0" /> : <ChevronRight size={14} className="text-neutral-400 shrink-0" />}
                          <FolderTree size={14} style={{ color: "var(--pu)" }} className="shrink-0" />
                          <span className="text-xs font-bold text-black dark:text-white truncate">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 shrink-0 font-medium ml-2">
                          {catSubs.length} subs
                        </span>
                      </button>

                      {/* Mapped departments pill */}
                      {mappedDepts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
                          {mappedDepts.map((d) => (
                            <span
                              key={d}
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Sub-categories */}
                      {isExpanded && catSubs.length > 0 && (
                        <div className="mt-2 ml-4 pl-2 border-l space-y-1.5" style={{ borderColor: "var(--ln)" }}>
                          {catSubs.map((sc) => {
                            const scItems = items.filter((it) => it.sub_category_id === sc.sub_category_id);
                            return (
                              <div key={sc.sub_category_id} className="text-xs">
                                <div className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300 font-medium">
                                  <Folder size={11} className="text-neutral-400 shrink-0" />
                                  <span className="truncate">{sc.name}</span>
                                  <span className="text-[10px] text-neutral-400">({scItems.length})</span>
                                </div>

                                {/* Items */}
                                {scItems.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1 ml-3.5">
                                    {scItems.map((it) => (
                                      <span
                                        key={it.item_id}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-300"
                                      >
                                        {it.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Info Tip */}
          <div
            className="mt-4 rounded-xl p-3 border text-xs leading-relaxed"
            style={{
              backgroundColor: "var(--bg)",
              borderColor: "var(--ln)",
              color: "var(--mu)",
            }}
          >
            <span className="font-semibold text-black dark:text-white block mb-0.5 flex items-center gap-1">
              <Sparkles size={12} style={{ color: "var(--pu)" }} />
              Routing Connection
            </span>
            Tickets raised under each category automatically route to the Support Team engineers of the mapped department(s).
          </div>
        </div>
      </div>
    </div>
  );
}
