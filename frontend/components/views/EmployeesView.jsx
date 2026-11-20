"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { ROLES } from "@/lib/constants";
import { EyeIcon, EyeOffIcon, SearchIcon, EditIcon } from "@/components/Icons";
import EmptyState from "@/components/EmptyState";
import { Users, UserPlus, X } from "lucide-react";
import PasswordCheckList from "@/components/PasswordCheckList";
import { getPasswordError } from "@/lib/passwordRules";

export default function EmployeesView() {
  const {
    users,
    tickets,
    me,
    tmp,
    setTmp,
    resets,
    resetPw,
    addUser,
    updateUser,
    toggleUser,
    getUser,
    showToast,
  } = useApp();

  // Create Employee Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("");
  const [role, setRole] = useState("Employee");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createErrors, setCreateErrors] = useState({ name: "", email: "", dept: "", pw: "" });

  // Edit Employee Modal State
  const [editEmployee, setEditEmployee] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editRole, setEditRole] = useState("Employee");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editErrors, setEditErrors] = useState({ name: "", email: "", dept: "" });

  // Table filter & pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const departmentsList = [
    "Engineering",
    "Finance",
    "IT Infrastructure",
    "IT Operations",
    "HR",
  ];

  // Helper for 2-letter initials
  const getInitials = (n) => {
    if (!n) return "EM";
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  // Helper to compute ticket count per employee
  const getTicketCount = (u) => {
    if (u.ticket_count !== undefined && u.ticket_count !== null) {
      return Number(u.ticket_count);
    }
    return (tickets || []).filter(
      (t) =>
        Number(t.by) === Number(u.id) ||
        Number(t.created_by) === Number(u.id) ||
        (t.byName && t.byName.toLowerCase() === (u.name || "").toLowerCase())
    ).length;
  };

  // Open edit modal and populate fields
  const openEditModal = (emp) => {
    setEditEmployee(emp);
    setEditName(emp.name || "");
    setEditEmail(emp.email || "");
    setEditDept(emp.dept || "");
    setEditRole(emp.role || "Employee");
    setEditErrors({ name: "", email: "", dept: "" });
  };

  const resetCreateForm = () => {
    setName("");
    setEmail("");
    setDept("");
    setRole("Employee");
    setPw("");
    setShowPw(false);
    setCreateErrors({ name: "", email: "", dept: "", pw: "" });
  };

  const closeCreateModal = () => {
    if (createSubmitting) return; // do not close while saving
    resetCreateForm();
    setShowCreateModal(false);
  };

  const closeEditModal = () => {
    setEditEmployee(null);
    setEditName("");
    setEditEmail("");
    setEditDept("");
    setEditRole("Employee");
    setEditSubmitting(false);
    setEditErrors({ name: "", email: "", dept: "" });
  };

  const validateEdit = () => {
    const errs = { name: "", email: "", dept: "" };
    let isValid = true;
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const targetId = String(editEmployee?.employee_id || editEmployee?.id);

    if (!trimmedName) {
      errs.name = "Full name is required";
      isValid = false;
    } else if (!/^[A-Za-z .'-]+$/.test(trimmedName)) {
      errs.name = "Use letters, spaces, dots, or hyphens only.";
      isValid = false;
    }

    if (!trimmedEmail) {
      errs.email = "Email is required";
      isValid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address (e.g. name@ladera.com)";
      isValid = false;
    } else if (
      users.some(
        (u) =>
          String(u.id || u.employee_id) !== targetId &&
          u.email &&
          u.email.toLowerCase() === trimmedEmail
      )
    ) {
      errs.email = "An employee with this email already exists.";
      isValid = false;
    }

    if (!editDept) {
      errs.dept = "Department is required";
      isValid = false;
    }

    setEditErrors(errs);
    return isValid;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editEmployee) return;
    if (!validateEdit()) return;

    setEditSubmitting(true);
    const targetId = editEmployee.employee_id || editEmployee.id;
    const success = await updateUser(targetId, {
      name: editName.trim(),
      email: editEmail.trim(),
      dept: editDept,
      department: editDept,
      role: editRole,
    });
    setEditSubmitting(false);

    if (success) {
      closeEditModal();
    }
  };

  const validateCreate = () => {
    const errs = { name: "", email: "", dept: "", pw: "" };
    let isValid = true;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!trimmedName) {
      errs.name = "Full name is required";
      isValid = false;
    } else if (!/^[A-Za-z .'-]+$/.test(trimmedName)) {
      errs.name = "Use letters, spaces, dots, or hyphens only.";
      isValid = false;
    }

    if (!trimmedEmail) {
      errs.email = "Email is required";
      isValid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address (e.g. name@ladera.com)";
      isValid = false;
    } else if (users.some((u) => u.email && u.email.toLowerCase() === trimmedEmail)) {
      errs.email = "An employee with this email already exists.";
      isValid = false;
    }

    if (!dept) {
      errs.dept = "Department is required";
      isValid = false;
    }

    if (pw) {
      const strengthError = getPasswordError(pw);
      if (strengthError) {
        errs.pw = strengthError;
        isValid = false;
      }
    }

    setCreateErrors(errs);
    return isValid;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateCreate()) return;

    const finalPw = pw.trim() || "Temp@" + (1000 + Math.floor(Math.random() * 9000));

    setCreateSubmitting(true);
    const success = await addUser({
      name: name.trim(),
      email: email.trim(),
      dept,
      role,
      pw: finalPw,
    });
    setCreateSubmitting(false);

    if (success) {
      setName("");
      setEmail("");
      setDept("");
      setRole("Employee");
      setPw("");
      setCreateErrors({ name: "", email: "", dept: "", pw: "" });
      setShowCreateModal(false);
    }
  };

  const handleResetPassword = async (userId) => {
    // Navigate / scroll to top immediately across main container, window, and anchor
    if (typeof window !== "undefined") {
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.getElementById("top-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    await resetPw(userId);

    // Ensure view is scrolled to top to show temporary password banner
    if (typeof window !== "undefined") {
      setTimeout(() => {
        document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.getElementById("top-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  // Filter employees
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.dept && u.dept.toLowerCase().includes(term)) ||
      u.role.toLowerCase().includes(term) ||
      (u.active ? "active" : "inactive deactivated").includes(term);

    const matchesDept =
      deptFilter === "All" ||
      (u.dept && u.dept.toLowerCase() === deptFilter.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;

    return matchesSearch && matchesDept && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const validPage = Math.min(Math.max(1, page), totalPages);

  const paginatedUsers = filteredUsers.slice(
    (validPage - 1) * pageSize,
    validPage * pageSize
  );

  const startCount = filteredUsers.length === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endCount = Math.min(validPage * pageSize, filteredUsers.length);

  let pageNumbers = [];
  if (filteredUsers.length === 0) {
    pageNumbers = [1];
  } else if (totalPages <= 7) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (validPage <= 4) {
      pageNumbers = [1, 2, 3, 4, 5, "...", totalPages];
    } else if (validPage >= totalPages - 3) {
      pageNumbers = [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    } else {
      pageNumbers = [1, "...", validPage - 1, validPage, validPage + 1, "...", totalPages];
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Scroll anchor at the very top of the page */}
      <div id="top-banner" className="-mt-6 pt-6" />

      {/* Temporary Password Notification Banner at the top of the page */}
      {tmp && (
        <div
          className="p-4 sm:p-5 rounded-xl border shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: "var(--ac2)",
            borderColor: "var(--ac)",
          }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-bold mb-1 text-black dark:text-white flex items-center gap-2">
              <span className="text-lg">🔑</span>
              <span>Temporary password for <strong className="underline decoration-indigo-400">{tmp.name}</strong></span>
            </h2>
            <p className="text-sm text-black dark:text-gray-200">
              Share this temporary password with them:{" "}
              <span
                className="font-mono font-bold px-2.5 py-1 rounded bg-white dark:bg-black/50 text-base border select-all"
                style={{ color: "var(--ac)", borderColor: "var(--bd)" }}
              >
                {tmp.pw}
              </span>
              . They will be required to change it at their next sign in.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(tmp.pw);
                  showToast("Temporary password copied to clipboard!");
                }
              }}
              className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{
                backgroundColor: "var(--sf)",
                borderColor: "var(--bd)",
                color: "var(--tx)",
              }}
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setTmp(null)}
              className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{
                backgroundColor: "var(--sf)",
                borderColor: "var(--bd)",
                color: "var(--tx)",
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Header with Title and + Add Employee Button */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4"
        style={{ borderColor: "var(--bd)" }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            Employees
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--mu)" }}>
            Manage accounts and roles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-white text-sm shadow-xs transition-opacity hover:opacity-90 cursor-pointer self-start sm:self-auto"
          style={{ backgroundColor: "var(--pu)" }}
        >
          <UserPlus size={16} />
          <span>+ Add Employee</span>
        </button>
      </div>

      {/* Password Reset Requests Queue */}
      {resets.length > 0 && (
        <div
          className="rounded-2xl border shadow-xs p-6"
          style={{
            backgroundColor: "var(--sf)",
            borderColor: "var(--bd)",
          }}
        >
          <h2 className="text-base font-bold mb-3 flex items-center gap-2 text-black dark:text-white">
            <span>Password reset requests</span>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {resets.length}
            </span>
          </h2>

          <div className="divide-y" style={{ borderColor: "var(--bd)" }}>
            {resets.map((r) => (
              <div
                key={r.uid}
                className="py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <span className="font-semibold text-sm text-black dark:text-white">
                    {getUser(r.uid)}
                  </span>
                  <span className="text-xs ml-2" style={{ color: "var(--mu)" }}>
                    requested {r.t}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleResetPassword(r.uid)}
                  disabled={!users.find((u) => Number(u.id) === Number(r.uid))?.active}
                  className="px-3.5 py-1.5 rounded-lg font-bold text-xs text-white shadow-xs hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: "var(--ac)" }}
                >
                  Reset password
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employees Directory Table Card (Exact Mockup Layout) */}
      <div
        className="rounded-2xl border overflow-hidden shadow-xs w-full"
        style={{
          backgroundColor: "var(--sf)",
          borderColor: "var(--bd)",
        }}
      >
        {/* Card Header & Filter Bar */}
        <div
          className="p-4 sm:p-5 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
          style={{ borderColor: "var(--bd)" }}
        >
          <h2 className="text-base font-bold text-black dark:text-white whitespace-nowrap">
            Employee Directory ({filteredUsers.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email or department"
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs font-normal text-black dark:text-gray-100 border focus:outline-hidden"
                style={{
                  backgroundColor: "var(--sf)",
                  borderColor: "var(--bd)",
                }}
              />
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 rounded-lg text-xs font-normal text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer"
              style={{
                backgroundColor: "var(--sf)",
                borderColor: "var(--bd)",
              }}
            >
              <option value="All">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 rounded-lg text-xs font-normal text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer"
              style={{
                backgroundColor: "var(--sf)",
                borderColor: "var(--bd)",
              }}
            >
              <option value="All">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mockup-Matched Table Structure (Compact without horizontal scrollbar) */}
        {users.length === 0 && !searchTerm && deptFilter === "All" && roleFilter === "All" ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="No employees found"
              message="No employees registered yet."
              compact
            />
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto hidden-scroll">
              <table className="w-full min-w-[960px] table-fixed border-collapse">
                <thead>
                  <tr
                    className="border-b bg-black/[0.02] dark:bg-white/[0.02]"
                    style={{ borderColor: "var(--bd)" }}
                  >
                    <th className="w-[22%] py-2.5 pl-3 pr-1 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white whitespace-nowrap">
                      EMPLOYEE
                    </th>
                    <th className="w-[5%] py-2.5 px-0.5 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white whitespace-nowrap">
                      ID
                    </th>
                    <th className="w-[13%] py-2.5 px-1 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white whitespace-nowrap">
                      DEPARTMENT
                    </th>
                    <th className="w-[11%] py-2.5 px-1 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white whitespace-nowrap">
                      ROLE
                    </th>
                    <th className="w-[8%] py-2.5 px-3 text-center text-xs font-bold uppercase tracking-wider text-black dark:text-white whitespace-nowrap">
                      TICKETS
                    </th>
                    <th className="w-[10%] py-2.5 px-3 text-left text-xs font-bold uppercase tracking-wider text-black dark:text-white whitespace-nowrap">
                      STATUS
                    </th>
                    <th className="w-[29%] py-2.5  px-3 text-center text-xs font-bold uppercase tracking-wider text-black dark:text-white whitespace-nowrap">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--bd)" }}>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center"
                        style={{ color: "var(--mu)" }}
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users
                            className="w-8 h-8 opacity-40 mx-auto"
                            style={{ color: "var(--pu)" }}
                          />
                          <p className="text-sm font-semibold text-black dark:text-white">
                            No employee records matched your filter criteria.
                          </p>
                          <p className="text-xs" style={{ color: "var(--mu)" }}>
                            You can edit your search or change the department and role filters above.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, idx) => {
                      const displayId = u.employee_id || u.id || (validPage - 1) * pageSize + idx + 1;
                      const ticketCount = getTicketCount(u);

                      return (
                        <tr
                          key={u.id}
                          className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ borderColor: "var(--bd)" }}
                        >
                          {/* EMPLOYEE column: Circle Avatar + Name + Email */}
                          <td className="py-2 pl-3 pr-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs select-none"
                                style={{ backgroundColor: "var(--pu)" }}
                              >
                                {getInitials(u.name)}
                              </div>
                              <div className="min-w-0 leading-tight">
                                <span className="block text-sm font-semibold truncate text-black dark:text-white">
                                  {u.name}
                                </span>
                                <small
                                  className="block text-xs truncate"
                                  style={{ color: "var(--mu)" }}
                                >
                                  {u.email}
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* ID column */}
                          <td className="py-2 px-0.5 text-sm font-normal text-black dark:text-gray-200">
                            {displayId}
                          </td>

                          {/* DEPARTMENT column */}
                          <td className="py-2 px-1 text-sm font-normal truncate text-black dark:text-gray-200">
                            {u.dept || "—"}
                          </td>

                          {/* ROLE column */}
                          <td className="py-2 px-1 text-sm font-normal truncate text-black dark:text-gray-200">
                            {u.role}
                          </td>

                          {/* TICKETS column */}
                          <td className="py-2 px-0.5 text-sm font-normal text-center text-black dark:text-gray-200">
                            {ticketCount}
                          </td>

                          {/* STATUS column */}
                          <td className="py-2 px-1 text-xs">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${u.active
                                ? "bg-[#e8f6ed] text-[#237a4a] dark:bg-[#1a3d2a] dark:text-[#56d38e]"
                                : "bg-[#f0edf6] text-[#777] dark:bg-gray-800 dark:text-gray-400"
                                }`}
                            >
                              {u.active ? "Active" : "Inactive"}
                            </span>
                          </td>

                          {/* ACTIONS column */}
                          <td className="py-2 pl-1 pr-3 text-center">
                            <div className="inline-flex items-center justify-end gap-1">
                              {/* Edit ✎ Icon Button */}
                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                className="p-1 rounded-md border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                title="Edit employee"
                                style={{
                                  borderColor: "var(--bd)",
                                  color: "var(--tx)",
                                  backgroundColor: "var(--sf)",
                                }}
                              >
                                <EditIcon className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Password Button */}
                              {String(u.id) !== String(me?.id) && String(u.employee_id || u.id) !== String(me?.employee_id || me?.id) && (
                                <button
                                  type="button"
                                  onClick={() => handleResetPassword(u.id)}
                                  className="px-1.5 py-0.5 rounded-md border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors whitespace-nowrap"
                                  style={{
                                    borderColor: "var(--bd)",
                                    color: "var(--tx)",
                                    backgroundColor: "var(--sf)",
                                  }}
                                >
                                  Reset Password
                                </button>
                              )}

                              {/* Deactivate / Activate Button */}
                              {u.role !== "Admin" && (
                                <button
                                  type="button"
                                  onClick={() => toggleUser(u.id)}
                                  className="px-1.5 py-0.5 rounded-md border text-xs font-semibold cursor-pointer transition-colors hover:opacity-90 whitespace-nowrap"
                                  style={{
                                    backgroundColor: u.active ? "#fff0ed" : "#237a4a",
                                    color: u.active ? "#a33c32" : "#ffffff",
                                    borderColor: u.active ? "#f0c9c2" : "#237a4a",
                                  }}
                                >
                                  {u.active ? "Deactivate" : "Activate"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t text-xs select-none"
              style={{
                borderColor: "var(--bd)",
                color: "var(--mu)",
                backgroundColor: "var(--sf)",
              }}
            >
              <div className="flex items-center gap-4">
                <span>
                  Showing {startCount}–{endCount} of {filteredUsers.length}
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
                      borderColor: "var(--bd)",
                      color: "var(--tx)",
                    }}
                  >
                    {[10, 25, 50].map((size) => (
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
                  disabled={validPage === 1 || filteredUsers.length === 0}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="min-w-[32px] h-[32px] px-2 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  style={{
                    borderColor: "var(--bd)",
                    backgroundColor: "var(--sf)",
                    color: "var(--tx)",
                  }}
                >
                  ‹
                </button>

                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`emp-el-${idx}`} className="px-1 text-gray-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className="min-w-[32px] h-[32px] px-2.5 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                      style={{
                        borderColor: validPage === p ? "var(--pu)" : "var(--bd)",
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
                  disabled={validPage >= totalPages || totalPages === 0 || filteredUsers.length === 0}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="min-w-[32px] h-[32px] px-2 rounded-md border text-xs font-semibold flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  style={{
                    borderColor: "var(--bd)",
                    backgroundColor: "var(--sf)",
                    color: "var(--tx)",
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Employee Modal Popup (matching provided mockup reference) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border shadow-xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: "var(--sf)",
              borderColor: "var(--bd)",
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--bd)" }}>
              <h2 className="text-xl font-bold text-black dark:text-white">
                Add Employee
              </h2>
              <button
                type="button"
                onClick={closeCreateModal}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} noValidate className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                  Full name <span style={{ color: "var(--wr)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value.replace(/[^A-Za-z .'-]/g, ""));
                    if (createErrors.name) setCreateErrors((p) => ({ ...p, name: "" }));
                  }}
                  placeholder="Employee name"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                  style={{
                    backgroundColor: "var(--sf)",
                    borderColor: "var(--bd)",
                  }}
                />
                {createErrors.name && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                    {createErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                  Email <span style={{ color: "var(--wr)" }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (createErrors.email) setCreateErrors((p) => ({ ...p, email: "" }));
                  }}
                  placeholder="name@ladera.com"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                  style={{
                    backgroundColor: "var(--sf)",
                    borderColor: "var(--bd)",
                  }}
                />
                {createErrors.email && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                    {createErrors.email}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                    Department <span style={{ color: "var(--wr)" }}>*</span>
                  </label>
                  <select
                    value={dept}
                    onChange={(e) => {
                      setDept(e.target.value);
                      if (createErrors.dept) setCreateErrors((p) => ({ ...p, dept: "" }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer transition-colors"
                    style={{
                      backgroundColor: "var(--sf)",
                      borderColor: "var(--bd)",
                    }}
                  >
                    <option value="">Select department</option>
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {createErrors.dept && (
                    <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                      {createErrors.dept}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                    Role <span style={{ color: "var(--wr)" }}>*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer"
                    style={{
                      backgroundColor: "var(--sf)",
                      borderColor: "var(--bd)",
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                  Temporary Password <span className="text-gray-400 font-normal">(optional, auto-generated if empty)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={pw}
                    onChange={(e) => {
                      setPw(e.target.value);
                      if (createErrors.pw) setCreateErrors((p) => ({ ...p, pw: "" }));
                    }}
                    placeholder="Min 8 characters, or leave empty to auto-generate"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                    style={{
                      backgroundColor: "var(--sf)",
                      borderColor: "var(--bd)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordCheckList password={pw} />
                {createErrors.pw && (
                  <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                    {createErrors.pw}
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-500 ">
                A temporary password is created automatically. The employee must change it at first sign in.
              </p>

              <div className="flex items-center justify-end gap-3 ">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded-lg border text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-lg font-bold text-white text-sm shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--pu)" }}
                >
                  {createSubmitting ? "Creating..." : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div >
      )
      }

      {/* Edit Employee Modal Popup */}
      {
        editEmployee && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeEditModal();
            }}
          >
            <div
              className="w-full max-w-lg rounded-2xl border shadow-xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
              style={{
                backgroundColor: "var(--sf)",
                borderColor: "var(--bd)",
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--bd)" }}>
                <h2 className="text-xl font-bold text-black dark:text-white">
                  Edit Employee
                </h2>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                    Full name <span style={{ color: "var(--wr)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value.replace(/[^A-Za-z .'-]/g, ""));
                      if (editErrors.name) setEditErrors((p) => ({ ...p, name: "" }));
                    }}
                    placeholder="Employee name"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                    style={{
                      backgroundColor: "var(--sf)",
                      borderColor: "var(--bd)",
                    }}
                  />
                  {editErrors.name && (
                    <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                      {editErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                    Email <span style={{ color: "var(--wr)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => {
                      setEditEmail(e.target.value);
                      if (editErrors.email) setEditErrors((p) => ({ ...p, email: "" }));
                    }}
                    placeholder="name@ladera.com"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden transition-colors"
                    style={{
                      backgroundColor: "var(--sf)",
                      borderColor: "var(--bd)",
                    }}
                  />
                  {editErrors.email && (
                    <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                      {editErrors.email}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                      Department <span style={{ color: "var(--wr)" }}>*</span>
                    </label>
                    <select
                      value={editDept}
                      onChange={(e) => {
                        setEditDept(e.target.value);
                        if (editErrors.dept) setEditErrors((p) => ({ ...p, dept: "" }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer transition-colors"
                      style={{
                        backgroundColor: "var(--sf)",
                        borderColor: "var(--bd)",
                      }}
                    >
                      <option value="">Select department</option>
                      {departmentsList.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    {editErrors.dept && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--rd)" }}>
                        {editErrors.dept}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
                      Role <span style={{ color: "var(--wr)" }}>*</span>
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      disabled={editEmployee.id === me?.id}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm font-normal text-black dark:text-gray-100 border focus:outline-hidden cursor-pointer disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--sf)",
                        borderColor: "var(--bd)",
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 rounded-lg border text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    style={{
                      borderColor: "var(--bd)",
                      color: "var(--tx)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2 rounded-lg font-bold text-white text-sm shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: "var(--pu)" }}
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
}
