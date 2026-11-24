"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  CATEGORIES,
  ROLES,
  API_BASE,
  ROLE_NAV,
  formatNotifTime,
  formatTimestamp,
  getInitials,
} from "@/lib/constants";
import {
  loginToBackend,
  fetchMeFromBackend,
  logoutFromBackend,
  createEmployeeInBackend,
  fetchEmployeesFromBackend,
  fetchTicketsFromBackend,
  fetchTicketPoolFromBackend,
  fetchAssignedTicketsFromBackend,
  createTicketInBackend,
  updateTicketInBackend,
  deleteTicketInBackend,
  sendEmailViaBackend,
  changePasswordInBackend,
  resetEmployeePasswordInBackend,
  updateEmployeeInBackend,
  setEmployeeActiveInBackend,
  deleteEmployeeInBackend,
  approveTicketInBackend,
  rejectTicketInBackend,
  requestClarificationInBackend,
  respondClarificationInBackend,
  takeTicketInBackend,
  releaseTicketInBackend,
  resolveTicketInBackend,
  fetchNotificationsFromBackend,
  markNotificationAsReadInBackend,
  markAllNotificationsAsReadInBackend,
  fetchCategoriesFromBackend,
  fetchDepartmentsFromBackend,
} from "@/lib/api";
import { getPasswordError } from "@/lib/passwordRules";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [poolTickets, setPoolTickets] = useState([]);
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [emails, setEmails] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [resets, setResets] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [me, setMe] = useState(null);
  const [view, setView] = useState("dash");
  const [sel, setSel] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    cat: "",
    sub: "",
    item: "",
    title: "",
    desc: "",
    pr: "Medium",
  });
  const [err, setErr] = useState("");
  const [forgot, setForgot] = useState(false);
  const [sent, setSent] = useState(false);
  const [tmp, setTmp] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [theme, setTheme] = useState("light");

  // Load user session from backend on client mount (purely from backend cookie)
  useEffect(() => {
    setMounted(true);
    // Clear out any obsolete legacy localStorage keys once
    try {
      localStorage.removeItem("tms_token");
      localStorage.removeItem("tms_me");
      localStorage.removeItem("tms_view");
      localStorage.removeItem("tms_theme");
    } catch (_) {}

    let isCancelled = false;

    const hydrateSession = async () => {
      try {
        const currentUser = await fetchMeFromBackend();
        if (currentUser && !isCancelled) {
          const normalized = {
            ...currentUser,
            id: currentUser.employee_id || currentUser.id,
            employee_id: currentUser.employee_id || currentUser.id,
            must: currentUser.must_change_password,
          };
          setMe(normalized);
          const defaultNav = ROLE_NAV[normalized.role]
            ? ROLE_NAV[normalized.role][0].key
            : "dash";
          setView(defaultNav);
          await syncWithBackend(normalized);
        }
      } catch (e) {
        // Not authenticated
        if (!isCancelled) setMe(null);
      }
    };

    hydrateSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Auto-refresh data without reloading the page
  useEffect(() => {
    if (!mounted || !me) return;

    let running = false;

    const refresh = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        await syncWithBackend(me);
      } finally {
        running = false;
      }
    };

    // Refresh every 10 seconds
    const timer = setInterval(refresh, 10000);

    // Refresh when you come back to this tab or window
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [mounted, me?.id]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const showToast = (message, onConfirm = null) => {
    setToast({
      visible: true,
      message,
      onConfirm: onConfirm
        ? () => {
            onConfirm();
            setToast((prev) => ({ ...prev, visible: false }));
          }
        : null,
      onCancel: () => {
        setToast((prev) => ({ ...prev, visible: false }));
      },
    });

    if (!onConfirm) {
      setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 4000);
    }
  };
  const getUser = (id) => {
    if (id === null || id === undefined || id === "") return "—";
    const u = users.find(
      (x) =>
        String(x.id) === String(id) || String(x.employee_id) === String(id),
    );
    if (u) return u.name;

    // Keep displaying names on historical tickets after an employee account is deleted.
    for (const ticket of [...tickets, ...poolTickets, ...assignedTickets]) {
      if (String(ticket.by) === String(id) && ticket.byName)
        return ticket.byName;
      if (String(ticket.approver) === String(id) && ticket.approverName)
        return ticket.approverName;
      if (String(ticket.assignee) === String(id) && ticket.assigneeName)
        return ticket.assigneeName;
      const comment = (ticket.comments || []).find(
        (item) =>
          String(item.by) === String(id) && (item.byName || item.by_name),
      );
      if (comment) return comment.byName || comment.by_name;
      const historyItem = (ticket.history || []).find(
        (item) =>
          String(item.by) === String(id) && (item.byName || item.by_name),
      );
      if (historyItem) return historyItem.byName || historyItem.by_name;
    }
    return "—";
  };
  const mail = async (toId, subject) => {
    const t = formatTimestamp();
    const tidMatch = subject.match(/TKT-\d+/);
    const tid = tidMatch ? tidMatch[0] : null;

    const recipient = users.find(
      (u) => u.id === toId || u.employee_id === toId,
    );

    const recipientEmail = recipient?.email || "user@ladera.com";

    setNotifs((prev) => [
      { to: toId, text: subject, tid, t, read: false },
      ...prev,
    ]);

    const result = await sendEmailViaBackend({
      to: recipientEmail,
      subject,
      text: `${subject}\n\nTime: ${t}\nRecipient: ${recipient?.name || "User"}`,
    });

    if (result?.success && !result.mocked) {
      showToast(`Email sent to ${recipient?.name || "User"}: ${subject}`);
    } else {
      showToast(`Email could not be sent to ${recipient?.name || "User"}.`);
    }

    return result;
  };

  const syncWithBackend = async (loggedInUser) => {
    // Fetch fresh user profile in real-time without reloading
    try {
      const freshUser = await fetchMeFromBackend();
      if (freshUser) {
        const normalized = {
          ...freshUser,
          id: freshUser.employee_id || freshUser.id,
          employee_id: freshUser.employee_id || freshUser.id,
          must: freshUser.must_change_password,
        };
        setMe(normalized);
      }
    } catch (err) {
      if (err.message?.includes("401") || err.message?.includes("deactivated")) {
        setMe(null);
        return;
      }
    }

    // Fetch employees (Admin only)
    try {
      const backendEmployees =
        loggedInUser?.role === "Admin"
          ? await fetchEmployeesFromBackend()
          : null;
      if (Array.isArray(backendEmployees)) {
        setUsers((prev) =>
          backendEmployees.map((emp) => {
            const existingUser = prev.find(
              (u) => u.email.toLowerCase() === emp.email.toLowerCase(),
            );

            return {
              id: emp.employee_id,
              employee_id: emp.employee_id,
              name: emp.name,
              email: emp.email,
              dept: emp.department || "",
              department: emp.department || "",
              role: emp.role,
              active: emp.active,
              manager_id: emp.manager_id,
              manager_name: emp.manager_name,
              pw: existingUser?.pw || "",
            };
          }),
        );
      }
    } catch (err) {
      console.warn("Employee sync skipped:", err);
    }

    // Fetch categories with department mapping
    try {
      const cats = await fetchCategoriesFromBackend();
      if (Array.isArray(cats) && cats.length > 0) {
        setCategoryList(cats);
      }
    } catch (err) {
      console.warn("Category sync skipped:", err);
    }

    // Fetch departments directly from database
    try {
      const depts = await fetchDepartmentsFromBackend();
      if (Array.isArray(depts) && depts.length > 0) {
        setDepartments(depts.map((d) => (typeof d === "string" ? d : d.name)).filter(Boolean));
      }
    } catch (err) {
      console.warn("Department sync skipped:", err);
    }

    // Fetch tickets for the logged-in user
    try {
      const backendTickets = await fetchTicketsFromBackend();

      if (Array.isArray(backendTickets)) {
        const normalized = backendTickets.map((bt) => ({
          id: bt.id,
          title: bt.title,
          desc: bt.description,
          cat: bt.category,
          sub: bt.sub_category,
          item: bt.item,
          clarification: bt.clarification || "",
          priority: bt.priority,
          status: bt.status,
          by: bt.created_by,
          byName: bt.created_by_name || "",
          byEmail: bt.created_by_email || "",
          byDept: bt.byDept || bt.creator_dept || bt.department || "",
          creator_dept: bt.creator_dept || bt.byDept || bt.department || "",
          department: bt.department || bt.creator_dept || bt.byDept || "",
          approverName: bt.approver_name || "",
          assigneeName: bt.assignee_name || "",
          ticketDate: bt.ticket_date || "",
          createdAt: bt.created_at,
          created: new Date(bt.created_at).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          approver: bt.approver_id,
          approver_id: bt.approver_id,
          approver_name: bt.approver_name || "",
          reason: bt.approver_reason || "",
          approver_reason: bt.approver_reason || "",
          assignee: bt.assignee_id,
          assignee_id: bt.assignee_id,
          assignee_name: bt.assignee_name || "",
          resolution: bt.resolution || "",
          comments: Array.isArray(bt.comments) ? bt.comments : [],
          history: Array.isArray(bt.history) ? bt.history : [],
        }));

        setTickets(normalized);

        // Fetch Support Team ticket pool
        if (loggedInUser?.role === "Support Team") {
          const poolData = await fetchTicketPoolFromBackend();
          console.log("Support Team ticket pool:", poolData);

          if (Array.isArray(poolData)) {
            setPoolTickets(
              poolData.map((bt) => ({
                id: bt.id,
                title: bt.title,
                desc: bt.description,
                cat: bt.category,
                sub: bt.sub_category,
                item: bt.item,
                clarification: bt.clarification || "",
                priority: bt.priority,
                status: bt.status,
                by: bt.created_by,
                byName: bt.created_by_name || "",
                byEmail: bt.created_by_email || "",
                approverName: bt.approver_name || "",
                assigneeName: bt.assignee_name || "",
                ticketDate: bt.ticket_date || "",
                createdAt: bt.created_at,
                created: new Date(bt.created_at).toLocaleString("en-IN"),
                approver: bt.approver_id,
                approver_id: bt.approver_id,
                approver_name: bt.approver_name || "",
                reason: bt.approver_reason || "",
                approver_reason: bt.approver_reason || "",
                assignee: bt.assignee_id,
                assignee_id: bt.assignee_id,
                assignee_name: bt.assignee_name || "",
                resolution: bt.resolution || "",
                comments: Array.isArray(bt.comments) ? bt.comments : [],
                history: Array.isArray(bt.history) ? bt.history : [],
              })),
            );
          }

          const assignedData = await fetchAssignedTicketsFromBackend();
          console.log("Support Team assigned tickets:", assignedData);

          if (Array.isArray(assignedData)) {
            setAssignedTickets(
              assignedData.map((bt) => ({
                id: bt.id,
                title: bt.title,
                desc: bt.description,
                cat: bt.category,
                sub: bt.sub_category,
                item: bt.item,
                clarification: bt.clarification || "",
                priority: bt.priority,
                status: bt.status,
                by: bt.created_by,
                byName: bt.created_by_name || "",
                byEmail: bt.created_by_email || "",
                approverName: bt.approver_name || "",
                assigneeName: bt.assignee_name || "",
                ticketDate: bt.ticket_date || "",
                createdAt: bt.created_at,
                created: new Date(bt.created_at).toLocaleString("en-IN"),
                approver: bt.approver_id,
                approver_id: bt.approver_id,
                approver_name: bt.approver_name || "",
                reason: bt.approver_reason || "",
                approver_reason: bt.approver_reason || "",
                assignee: bt.assignee_id,
                assignee_id: bt.assignee_id,
                assignee_name: bt.assignee_name || "",
                resolution: bt.resolution || "",
                comments: Array.isArray(bt.comments) ? bt.comments : [],
                history: Array.isArray(bt.history) ? bt.history : [],
              })),
            );
          }
        }
        console.log("Normalized tickets:", normalized);
        console.log(
          "Ticket owner IDs:",
          normalized.map((t) => ({
            ticketId: t.id,
            ownerId: t.by,
            ownerType: typeof t.by,
          })),
        );
      }
    } catch (err) {
      console.warn("Ticket sync failed:", err);
    }

    // Fetch notifications from backend
    try {
      const backendNotifs = await fetchNotificationsFromBackend();
      if (Array.isArray(backendNotifs)) {
        const currentUserId = Number(
          loggedInUser?.employee_id || loggedInUser?.id,
        );
        setNotifs(
          backendNotifs.map((n) => ({
            id: n.notification_id,
            to: currentUserId,
            tid: n.ticket_id,
            title: n.title,
            message: n.message || "",
            text: n.title + (n.message ? " · " + n.message : ""),
            read: !!n.is_read,
            t: formatNotifTime(n.created_at),
          })),
        );
      }
    } catch (err) {
      console.warn("Notification sync failed:", err);
    }
  };

  const login = async (email, password) => {
    try {
      const result = await loginToBackend(email, password);

      const user = result.data.user;

      const normalizedUser = {
        ...user,
        id: user.employee_id,
        employee_id: user.employee_id,
        must: user.must_change_password,
        manager_id: user.manager_id,
        manager_name: user.manager_name,
      };

      setMe(normalizedUser);

      await syncWithBackend(normalizedUser);

      setErr("");

      if (user.must_change_password) {
        setView("changePassword");
      } else {
        const defaultNav = ROLE_NAV[user.role]
          ? ROLE_NAV[user.role][0].key
          : "dash";

        setView(defaultNav);
      }

      setSel(null);

      return true;
    } catch (error) {
      console.warn("Login error:", error);
      setErr(error.message || "Unable to connect to the server.");
      return false;
    }
  };

  const logout = async () => {
    await logoutFromBackend().catch(() => {});
    setMe(null);
    setSel(null);
    setForgot(false);
    setSent(false);
    setErr("");
  };

  const requestReset = (email) => {
    const trimmedEmail = email.trim().toLowerCase();
    const u = users.find(
      (x) => x.email.toLowerCase() === trimmedEmail && x.active,
    );

    if (u && !resets.some((r) => r.uid === u.id)) {
      const t = formatTimestamp();
      setResets((prev) => [...prev, { uid: u.id, t }]);

      // Notify all active Admins
      users
        .filter((a) => a.role === "Admin" && a.active)
        .forEach((admin) => {
          const subject = "Password reset requested by " + u.name;
          setNotifs((prev) => [
            { to: admin.id, text: subject, tid: null, t, read: false },
            ...prev,
          ]);
          setEmails((prev) => [
            { to: admin.name, addr: admin.email, subject, t },
            ...prev,
          ]);
        });
    }

    setSent(true);
  };

  const resetPw = async (id) => {
    const userObj = users.find(
      (x) =>
        String(x.id) === String(id) || String(x.employee_id) === String(id),
    );

    if (!userObj) {
      showToast("Employee not found.");
      return false;
    }

    // Prevent password reset for deactivated employees
    if (
      userObj.active === false ||
      userObj.active === "false" ||
      userObj.active === 0
    ) {
      showToast("Cannot reset password for a deactivated employee.");
      return false;
    }

    const tempPassword = "Temp@" + (1000 + Math.floor(Math.random() * 9000));

    // Set temp password banner immediately for frontend visibility
    setTmp({
      name: userObj.name,
      pw: tempPassword,
    });

    // Navigate to top immediately
    if (typeof window !== "undefined") {
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setUsers((prev) =>
      prev.map((u) =>
        String(u.id) === String(id) || String(u.employee_id) === String(id)
          ? { ...u, pw: tempPassword, must: true }
          : u,
      ),
    );

    setResets((prev) =>
      prev.filter(
        (r) =>
          String(r.uid) !== String(id) && String(r.uid) !== String(userObj.id),
      ),
    );

    showToast(`Temporary password generated for ${userObj.name}`);

    try {
      await resetEmployeePasswordInBackend(
        userObj.employee_id || userObj.id || id,
        tempPassword,
      );
      mail(id, "Your password was reset by an admin");
    } catch (error) {
      console.warn("Password reset backend error:", error);
    }

    return true;
  };

  const changePw = async (passwordA, passwordB) => {
    const passwordError = getPasswordError(passwordA);
    if (passwordError) {
      setErr(passwordError);
      return false;
    }
    if (passwordA !== passwordB) {
      setErr("Both password fields must match.");
      return false;
    }
    if (passwordA === me.pw) {
      setErr("Choose a password different from your temporary password.");
      return false;
    }
    try {
      await changePasswordInBackend(passwordA);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === me.employee_id ? { ...u, pw: passwordA, must: false } : u,
        ),
      );

      setMe((prev) => ({
        ...prev,
        pw: passwordA,
        must: false,
      }));

      setErr("");
      showToast("Password updated.");
      return true;
    } catch (error) {
      console.warn("Password update error:", error);
      setErr(error.message || "Unable to update password.");
      return false;
    }
  };

  const addUser = async ({ name, email, dept, role, pw, manager_id }) => {
    const trimmedEmail = email.trim().toLowerCase();

    const pwError = getPasswordError(pw);
    if (pwError) {
      showToast(pwError);
      return false;
    }

    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      showToast("An employee with this email already exists.");
      return false;
    }

    try {
      const result = await createEmployeeInBackend({
        name: name.trim(),
        email: trimmedEmail,
        department: dept ? dept.trim() : "",
        password: pw,
        role,
        manager_id,
      });

      const employee = result.data;

      const newUser = {
        id: employee.employee_id,
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        dept: employee.department || "",
        department: employee.department || "",
        role: employee.role,
        active: employee.active,
        manager_id: employee.manager_id,
        manager_name: employee.manager_name,
      };

      setUsers((prev) => [...prev, newUser]);

      showToast(`"${employee.name}" has been successfully added as a user.`);
      return true;
    } catch (error) {
      console.warn("Employee creation error:", error);
      showToast(error.message || "Unable to create employee.");
      return false;
    }
  };

  const deleteUser = async (id) => {
    const user = users.find((u) => String(u.id) === String(id));

    if (!user) return false;

    try {
      await deleteEmployeeInBackend(id);

      const preserveTicketHistory = (ticket) => ({
        ...ticket,
        byName:
          String(ticket.by) === String(id)
            ? ticket.byName || user.name
            : ticket.byName,
        byEmail:
          String(ticket.by) === String(id)
            ? ticket.byEmail || user.email
            : ticket.byEmail,
        approverName:
          String(ticket.approver) === String(id)
            ? ticket.approverName || user.name
            : ticket.approverName,
        assigneeName:
          String(ticket.assignee) === String(id)
            ? ticket.assigneeName || user.name
            : ticket.assigneeName,
        comments: (ticket.comments || []).map((item) =>
          String(item.by) === String(id)
            ? { ...item, byName: item.byName || user.name }
            : item,
        ),
        history: (ticket.history || []).map((item) =>
          String(item.by) === String(id)
            ? { ...item, byName: item.byName || user.name }
            : item,
        ),
      });

      setUsers((prev) => prev.filter((u) => String(u.id) !== String(id)));
      setTickets((prev) => prev.map(preserveTicketHistory));
      setPoolTickets((prev) => prev.map(preserveTicketHistory));
      setAssignedTickets((prev) => prev.map(preserveTicketHistory));

      showToast(
        `${user.name} deleted successfully. Existing ticket details were preserved.`,
      );
      return true;
    } catch (error) {
      console.warn("Employee deletion error:", error);
      showToast(error.message || "Unable to delete employee.");
      return false;
    }
  };

  const toggleUser = async (id) => {
    const user = users.find(
      (u) =>
        String(u.id) === String(id) || String(u.employee_id) === String(id),
    );

    if (!user) return false;

    const targetId = user.employee_id || user.id;
    const newActiveStatus = !user.active;

    try {
      await setEmployeeActiveInBackend(targetId, newActiveStatus);

      setUsers((prev) =>
        prev.map((u) =>
          String(u.id) === String(id) ||
          String(u.employee_id) === String(targetId)
            ? { ...u, active: newActiveStatus }
            : u,
        ),
      );

      showToast(
        `${user.name} ${newActiveStatus ? "activated" : "deactivated"} successfully.`,
      );
      return true;
    } catch (error) {
      console.warn("Employee status update error:", error);
      showToast(error.message || "Unable to update employee status.");
      return false;
    }
  };

  const updateUser = async (id, data) => {
    try {
      const res = await updateEmployeeInBackend(id, {
        name: data.name,
        email: data.email,
        department: data.department || data.dept,
        role: data.role,
        manager_id: data.manager_id,
      });

      const updated = res.data || res;

      setUsers((prev) =>
        prev.map((u) =>
          String(u.id) === String(id)
            ? {
                ...u,
                name: updated.name || data.name,
                email: updated.email || data.email,
                dept: updated.department || data.department || data.dept,
                department: updated.department || data.department || data.dept,
                role: updated.role || data.role,
                manager_id: updated.manager_id !== undefined ? updated.manager_id : data.manager_id,
                manager_name: updated.manager_name,
              }
            : u,
        ),
      );

      // If updating the currently logged-in user, also update me state
      if (Number(id) === Number(me?.id || me?.employee_id)) {
        setMe((prev) => ({
          ...prev,
          name: updated.name || data.name,
          email: updated.email || data.email,
          dept: updated.department || data.department || data.dept,
          department: updated.department || data.department || data.dept,
          role: updated.role || data.role,
          manager_id: updated.manager_id !== undefined ? updated.manager_id : data.manager_id,
          manager_name: updated.manager_name !== undefined ? updated.manager_name : prev?.manager_name,
        }));
      }

      showToast(`"${updated.name || data.name}" details updated successfully.`);
      return true;
    } catch (error) {
      console.warn("Employee update error:", error);
      showToast(error.message || "Unable to update employee.");
      return false;
    }
  };

  const updateDraft = (keyOrObj, value) => {
    setDraft((prev) => {
      if (typeof keyOrObj === "object" && keyOrObj !== null) {
        return { ...prev, ...keyOrObj };
      }
      const next = { ...prev, [keyOrObj]: value };
      if (keyOrObj === "cat") {
        next.catId = undefined;
        next.sub = "";
        next.subId = undefined;
        next.item = "";
        next.itemId = undefined;
      }
      if (keyOrObj === "sub") {
        next.subId = undefined;
        next.item = "";
        next.itemId = undefined;
      }
      return next;
    });
  };

  const submitTicket = async (attachment = null, ticketDate) => {
    if (
      !draft.cat ||
      !draft.sub ||
      !draft.item ||
      !draft.title.trim() ||
      !draft.desc.trim()
    ) {
      showToast("Fill in all required fields.");
      return false;
    }

    const nextNumber = tickets.length
      ? Math.max(
          ...tickets.map((t) => parseInt(t.id.replace(/\D/g, ""), 10) || 1000),
        ) + 1
      : 1001;
    const tId = `TKT-${nextNumber}`;
    const t = formatTimestamp();

    const creatorId = me.employee_id || me.id;
    const isDirectToSupport =
      me.role === "Admin" ||
      me.role === "Approver" ||
      me.role === "Support Team";
    const initialStatus = isDirectToSupport ? "Open" : "Pending Approval";

    const newTicket = {
      id: tId,
      title: draft.title.trim(),
      desc: draft.desc.trim(),
      cat: draft.cat,
      sub: draft.sub,
      item: draft.item,
      priority: draft.pr || "Medium",
      status: initialStatus,
      by: creatorId,
      byName: me.name,
      byEmail: me.email,
      created_by: creatorId,
      created_by_name: me.name,
      created_by_email: me.email,
      created: t,
      createdAt: new Date().toISOString(),
      ticketDate: ticketDate,
      ticket_date: ticketDate,
      approver: isDirectToSupport ? null : (me.manager_id || null),
      approver_id: isDirectToSupport ? null : (me.manager_id || null),
      approver_name: isDirectToSupport ? null : (me.manager_name || null),
      reason: "",
      approver_reason: "",
      assignee: null,
      assignee_id: null,
      resolution: "",
      comments: [],
      history: [
        {
          by: creatorId,
          from: "—",
          to: initialStatus,
          note: isDirectToSupport
            ? "Ticket created directly into support pool"
            : "Ticket created",
          t,
        },
      ],
    };

    try {
      // Sync creation to backend PostgreSQL
      const savedTicket = await createTicketInBackend(newTicket, attachment);
      const finalizedTicket = {
        ...newTicket,
        ...(savedTicket || {}),
        id: savedTicket?.id || newTicket.id,
        byName: savedTicket?.created_by_name || me.name,
        byEmail: savedTicket?.created_by_email || me.email,
        attachment_id: savedTicket?.attachment_id || null,
        attachment_name:
          savedTicket?.attachment_name || attachment?.name || null,
        attachment_path: savedTicket?.attachment_path || null,
      };

      setTickets((prev) => [
        finalizedTicket,
        ...prev.filter((t) => t.id !== finalizedTicket.id),
      ]);

      if (isDirectToSupport) {
        // Resolve target categories & mapped departments for correct support team routing
        const selectedCat = (draft.cat || "").trim().toLowerCase();
        let targetCats = categoryList;
        if (!targetCats || targetCats.length === 0) {
          try {
            targetCats = await fetchCategoriesFromBackend();
          } catch (_) {
            targetCats = [];
          }
        }

        const matchedCategory = targetCats.find(
          (c) =>
            (c.name || "").trim().toLowerCase() === selectedCat ||
            String(c.category_id) === String(draft.catId || draft.cat)
        );
        const mappedDepts = Array.isArray(matchedCategory?.departments)
          ? matchedCategory.departments.map((d) => (d || "").trim().toLowerCase()).filter(Boolean)
          : [];

        // Filter active Support Team members whose department matches the category
        const targetSupportUsers = users.filter((u) => {
          if (u.role !== "Support Team" || !u.active || Number(u.id) === Number(creatorId)) return false;
          if (!selectedCat || selectedCat === "others" || mappedDepts.length === 0) return true;
          const userDept = (u.department || u.dept || "").trim().toLowerCase();
          return mappedDepts.includes(userDept);
        });

        const recipients = targetSupportUsers.length > 0
          ? targetSupportUsers
          : users.filter(
              (u) =>
                u.role === "Support Team" &&
                u.active &&
                Number(u.id) !== Number(creatorId)
            );

        // Add to local pool only if the current user is a support team member matching the category department
        if (me?.role === "Support Team") {
          const myDept = (me.department || me.dept || "").trim().toLowerCase();
          const matchesMyDept =
            !selectedCat ||
            selectedCat === "others" ||
            mappedDepts.length === 0 ||
            mappedDepts.includes(myDept);
          if (matchesMyDept) {
            setPoolTickets((prev) => [finalizedTicket, ...prev]);
          }
        }

        recipients.forEach((st) =>
          mail(st.id, `${finalizedTicket.id} added to support pool`),
        );
      } else {
        // Send notifications specifically to the employee's assigned manager / approver
        const assignedApproverId = me.manager_id;
        const targetApprovers = assignedApproverId
          ? users.filter(
              (u) =>
                (Number(u.id) === Number(assignedApproverId) ||
                  Number(u.employee_id) === Number(assignedApproverId)) &&
                u.active,
            )
          : users.filter(
              (u) =>
                u.role === "Approver" &&
                u.active &&
                Number(u.id) !== Number(creatorId),
            );

        targetApprovers.forEach((a) =>
          mail(a.id, `${finalizedTicket.id} needs your approval`),
        );
      }

      setDraft({
        cat: "",
        sub: "",
        item: "",
        title: "",
        desc: "",
        pr: "Medium",
      });
      setView(me?.role === "Employee" ? "dash" : "mine");
      setSel(finalizedTicket.id);
      showToast(`${finalizedTicket.id} created successfully.`);
      syncWithBackend(me).catch(() => {});
      return true;
    } catch (error) {
      console.warn("Ticket submission error:", error);
      showToast(error.message || "Failed to create ticket.");
      return false;
    }
  };

  const saveEdit = async (
    id,
    newTitle,
    newDesc,
    newFile = null,
    removeAttachment = false,
  ) => {
    const t = formatTimestamp();
    const currentUserId = me.employee_id || me.id;

    try {
      const backendTicket = await updateTicketInBackend(
        id,
        {
          title: newTitle,
          desc: newDesc,
          description: newDesc,
        },
        newFile,
        removeAttachment,
      );

      const applyUpdate = (tk) => {
        if (tk.id !== id) return tk;
        return {
          ...tk,
          title: newTitle,
          desc: newDesc,
          description: newDesc,
          attachment_id:
            backendTicket?.attachment_id ??
            (removeAttachment && !newFile ? null : tk.attachment_id),
          attachment_name:
            backendTicket?.attachment_name ??
            (newFile
              ? newFile.name
              : removeAttachment
                ? null
                : tk.attachment_name),
          attachment_path:
            backendTicket?.attachment_path ??
            (removeAttachment && !newFile ? null : tk.attachment_path),
          attachment_file_size:
            backendTicket?.attachment_file_size ??
            (newFile
              ? newFile.size
              : removeAttachment
                ? null
                : tk.attachment_file_size),
          attachment_mime_type:
            backendTicket?.attachment_mime_type ??
            (newFile
              ? newFile.type
              : removeAttachment
                ? null
                : tk.attachment_mime_type),
          history: backendTicket?.history || [
            ...(tk.history || []),
            {
              by: currentUserId,
              from: tk.status,
              to: tk.status,
              note: "Ticket details edited",
              t,
            },
          ],
        };
      };

      setTickets((prev) => prev.map(applyUpdate));
      setPoolTickets((prev) => prev.map(applyUpdate));
      setAssignedTickets((prev) => prev.map(applyUpdate));
      setEditing(false);
      showToast("Ticket updated.");
      return backendTicket || true;
    } catch (error) {
      console.error("Save edit error:", error);
      showToast(error.message || "Failed to update ticket.");
      return false;
    }
  };

  const deleteTicket = (id) => {
    showToast(`Are you sure you want to delete ticket ${id}?`, async () => {
      try {
        await deleteTicketInBackend(id);
        setTickets((prev) => prev.filter((t) => t.id !== id));
        setPoolTickets((prev) => prev.filter((t) => t.id !== id));
        setNotifs((prev) => prev.filter((n) => n.tid !== id));
        setSel(null);
        showToast(`${id} deleted.`);
      } catch (err) {
        showToast(err.message || "Unable to delete ticket.");
      }
    });
  };

  const decide = async (id, ok, reason) => {
    if (!ok && !reason.trim()) {
      showToast("Enter a reason to reject.");
      return false;
    }

    const targetTicket =
      tickets.find((tk) => tk.id === id) ||
      poolTickets.find((tk) => tk.id === id) ||
      assignedTickets.find((tk) => tk.id === id);

    if (!targetTicket) {
      showToast("Ticket not found.");
      return false;
    }

    const currentUserId = me.employee_id || me.id;
    const t = formatTimestamp();
    const newStatus = ok ? "Open" : "Rejected";

    const note = ok
      ? `Approved by ${getUser(currentUserId)}`
      : `Rejected by ${getUser(currentUserId)}: ${reason.trim()}`;

    try {
      let backendTicket = null;
      if (ok) {
        backendTicket = await approveTicketInBackend(id, reason.trim());
      } else {
        backendTicket = await rejectTicketInBackend(id, reason.trim());
      }

      const updatedTicket = {
        ...targetTicket,
        approver: currentUserId,
        approver_id: currentUserId,
        approverName: me.name,
        reason: reason.trim(),
        approver_reason: reason.trim(),
        clarification: ok ? "" : targetTicket.clarification,
        status: newStatus,
        history: backendTicket?.history || [
          ...(targetTicket.history || []),
          {
            by: currentUserId,
            byName: me.name,
            from: targetTicket.status,
            to: newStatus,
            note,
            t,
          },
        ],
      };

      setTickets((prev) =>
        prev.map((tk) => (tk.id === id ? updatedTicket : tk)),
      );

      if (ok) {
        setPoolTickets((prev) => [
          updatedTicket,
          ...prev.filter((tk) => tk.id !== id),
        ]);
      }

      showToast(`Decision saved: ${ok ? "Approved" : "Rejected"}`);
      await syncWithBackend(me);
      return true;
    } catch (error) {
      console.warn("Approval decision error:", error);
      showToast(error.message || "Unable to save decision. Please try again.");
      return false;
    }
  };

  const requestClarification = async (id, question) => {
    if (!question || !question.trim()) {
      showToast("Enter the clarification question.");
      return false;
    }

    const targetTicket =
      tickets.find((tk) => tk.id === id) ||
      assignedTickets.find((tk) => tk.id === id);

    if (!targetTicket) {
      showToast("Ticket not found.");
      return false;
    }

    const currentUserId = me.employee_id || me.id;
    const t = formatTimestamp();
    const note = `Clarification requested by ${getUser(currentUserId)}: ${question.trim()}`;

    try {
      const backendTicket = await requestClarificationInBackend(
        id,
        question.trim(),
      );

      const updatedTicket = {
        ...targetTicket,
        status: "Clarification Needed",
        clarification: question.trim(),
        history: backendTicket?.history || [
          ...(targetTicket.history || []),
          {
            by: currentUserId,
            byName: me.name,
            from: targetTicket.status,
            to: "Clarification Needed",
            note,
            t,
          },
        ],
      };

      setTickets((prev) =>
        prev.map((tk) => (tk.id === id ? updatedTicket : tk)),
      );
      setAssignedTickets((prev) =>
        prev.map((tk) => (tk.id === id ? updatedTicket : tk)),
      );

      showToast("Clarification requested from submitter.");
      await syncWithBackend(me);
      return true;
    } catch (error) {
      console.warn("Request clarification error:", error);
      showToast(error.message || "Unable to request clarification.");
      return false;
    }
  };

  const submitClarification = async (id, text) => {
    if (!text || !text.trim()) {
      showToast("Enter your clarification response.");
      return false;
    }

    const targetTicket = tickets.find((tk) => tk.id === id);
    if (!targetTicket) {
      showToast("Ticket not found.");
      return false;
    }

    const currentUserId = me?.employee_id || me?.id;
    const t = formatTimestamp();
    const nextStatus = "Pending Approval";
    const note = `Clarification response: ${text.trim()}`;

    try {
      const backendTicket = await respondClarificationInBackend(
        id,
        text.trim(),
      );

      const updatedTicket = {
        ...targetTicket,
        status: backendTicket?.status || "Pending Approval",
        assignee: null,
        assignee_id: null,
        assigneeName: null,
        assignee_name: null,
        clarification: text.trim(),
        history: backendTicket?.history || [
          ...(targetTicket.history || []),
          {
            by: currentUserId,
            byName: me.name,
            from: targetTicket.status,
            to: "Pending Approval",
            note,
            t,
          },
        ],
      };

      setTickets((prev) =>
        prev.map((item) => (item.id === id ? updatedTicket : item)),
      );
      setAssignedTickets((prev) => prev.filter((item) => item.id !== id));

      const isDirectRole = ["Admin", "Approver", "Support Team"].includes(
        me?.role,
      );

      if (isDirectRole) {
        showToast("Response submitted. Moved to Support Team for review.");
      } else {
        showToast("Response submitted. Returned to Approver for review.");
      }

      await syncWithBackend(me);
      return true;
    } catch (error) {
      console.warn("Submit clarification response error:", error);
      showToast(error.message || "Unable to submit clarification response.");
      return false;
    }
  };

  const addComment = (id, text) => {
    return submitClarification(id, text);
  };

  const takeTicket = async (id) => {
    const tk =
      poolTickets.find((x) => x.id === id) || tickets.find((x) => x.id === id);

    if (!tk) {
      showToast("Ticket not found in the pool.");
      return;
    }

    if (
      tk.assignee &&
      Number(tk.assignee) !== Number(me.employee_id || me.id)
    ) {
      showToast(`Already taken by ${getUser(tk.assignee)}`);
      return;
    }

    const currentUserId = me.employee_id || me.id;
    const t = formatTimestamp();
    const note = `Taken by ${getUser(currentUserId)}`;

    try {
      const backendTicket = await takeTicketInBackend(id);
      const newStatus = backendTicket?.status || "In Progress";

      const updatedTicket = {
        ...tk,
        assignee: currentUserId,
        assignee_id: currentUserId,
        assigneeName: me.name,
        status: newStatus,
        history: backendTicket?.history || [
          ...(tk.history || []),
          {
            by: currentUserId,
            byName: me.name,
            from: tk.status,
            to: newStatus,
            note,
            t,
          },
        ],
      };

      setPoolTickets((prev) => prev.filter((item) => item.id !== id));
      setAssignedTickets((prev) => [
        updatedTicket,
        ...prev.filter((item) => item.id !== id),
      ]);
      setTickets((prev) => [
        updatedTicket,
        ...prev.filter((item) => item.id !== id),
      ]);

      showToast(`You have claimed ownership of ${id}.`);
    } catch (error) {
      console.warn("Take ownership error:", error);
      showToast(error.message || "Unable to take ownership. Please try again.");
    }
  };

  const releaseTicket = async (id) => {
    const tk =
      assignedTickets.find((x) => x.id === id) ||
      tickets.find((x) => x.id === id);

    if (!tk) {
      showToast("Ticket not found.");
      return;
    }

    const currentUserId = me.employee_id || me.id;
    const t = formatTimestamp();
    const note = `Released to pool by ${getUser(currentUserId)}`;

    try {
      const backendTicket = await releaseTicketInBackend(id);

      const updatedTicket = {
        ...tk,
        assignee: null,
        assignee_id: null,
        assigneeName: null,
        status: "Open",
        history: backendTicket?.history || [
          ...(tk.history || []),
          {
            by: currentUserId,
            byName: me.name,
            from: tk.status,
            to: "Open",
            note,
            t,
          },
        ],
      };

      setAssignedTickets((prev) => prev.filter((item) => item.id !== id));
      setPoolTickets((prev) => [
        updatedTicket,
        ...prev.filter((item) => item.id !== id),
      ]);
      setTickets((prev) =>
        prev.map((item) => (item.id === id ? updatedTicket : item)),
      );

      showToast(`${id} released back to ticket pool.`);
    } catch (error) {
      console.warn("Release ticket error:", error);
      showToast(error.message || "Unable to release ticket. Please try again.");
    }
  };

  const workTicket = async (id, newStatus, resolutionText) => {
    if (newStatus === "Resolved" && !resolutionText.trim()) {
      showToast("Add resolution details to resolve.");
      return false;
    }

    const tk =
      tickets.find((x) => x.id === id) ||
      assignedTickets.find((x) => x.id === id);
    if (!tk) return false;

    const currentUserId = me.employee_id || me.id;
    const t = formatTimestamp();
    const note =
      newStatus === "Resolved"
        ? `Resolved: ${resolutionText.trim()}`
        : "Status updated";

    try {
      let backendTicket = null;
      if (newStatus === "Resolved") {
        backendTicket = await resolveTicketInBackend(id, resolutionText.trim());
      } else {
        backendTicket = await updateTicketInBackend(id, {
          status: newStatus,
          resolution: resolutionText.trim() || tk.resolution,
        });
      }

      const updatedTicket = {
        ...tk,
        status: newStatus,
        resolution: resolutionText.trim() || tk.resolution,
        history: backendTicket?.history || [
          ...(tk.history || []),
          {
            by: currentUserId,
            byName: me.name,
            from: tk.status,
            to: newStatus,
            note,
            t,
          },
        ],
      };

      setTickets((prev) =>
        prev.map((item) => (item.id === id ? updatedTicket : item)),
      );
      setAssignedTickets((prev) =>
        prev.map((item) => (item.id === id ? updatedTicket : item)),
      );

      showToast(`Ticket updated to ${newStatus}`);
      return true;
    } catch (error) {
      console.warn("Work update error:", error);
      showToast(error.message || "Unable to save ticket update.");
      return false;
    }
  };

  const markAllRead = async () => {
    const currentUserId = Number(me?.employee_id || me?.id);
    setNotifs((prev) =>
      prev.map((n) =>
        Number(n.to) === currentUserId ? { ...n, read: true } : n,
      ),
    );
    showToast("All notifications marked as read.");
    await markAllNotificationsAsReadInBackend();
  };

  const openNotification = async (index) => {
    const n = notifs[index];
    if (!n) return;

    setNotifs((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, read: true } : item)),
    );

    if (n.id) {
      await markNotificationAsReadInBackend(n.id);
    }

    if (n.tid && tickets.some((t) => t.id === n.tid)) {
      setSel(n.tid);
    }
  };

  const refreshDepartments = async () => {
    try {
      const depts = await fetchDepartmentsFromBackend();
      if (Array.isArray(depts)) {
        const names = depts.map((d) => (typeof d === "string" ? d : d.name)).filter(Boolean);
        setDepartments(names);
        return names;
      }
    } catch (_) {}
    return [];
  };

  return (
    <AppContext.Provider
      value={{
        users,
        tickets,
        poolTickets,
        assignedTickets,
        emails,
        notifs,
        resets,
        categoryList,
        departments,
        refreshDepartments,
        me,
        view,
        sel,
        editing,
        draft,
        err,
        forgot,
        sent,
        tmp,
        toast,
        theme,
        mounted,
        setView,
        setSel,
        setEditing,
        setDraft,
        setErr,
        setForgot,
        setSent,
        setTmp,
        getUser,
        mail,
        login,
        logout,
        requestReset,
        resetPw,
        changePw,
        addUser,
        deleteUser,
        updateUser,
        toggleUser,
        updateDraft,
        submitTicket,
        saveEdit,
        deleteTicket,
        decide,
        takeTicket,
        releaseTicket,
        workTicket,
        requestClarification,
        addComment,
        submitClarification,
        syncWithBackend,
        markAllRead,
        openNotification,
        showToast,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
