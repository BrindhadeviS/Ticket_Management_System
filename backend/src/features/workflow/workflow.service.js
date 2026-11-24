import pool from "../../config/db.js";
import { notify, idsByRole, supportIdsForCategory } from "../../utils/notify.js";

class WorkflowError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Same style as the app's history entries, e.g. "13 Nov, 15:25"
const stamp = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

// Locks the ticket row so two people can't act on it at the same moment.
const withTicket = async (ticketId, run) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT * FROM tickets WHERE id = $1 FOR UPDATE",
      [ticketId],
    );
    if (!rows[0]) throw new WorkflowError(404, "Ticket not found");
    const result = await run(client, rows[0]);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const nameOf = async (client, employeeId) => {
  const { rows } = await client.query(
    "SELECT name FROM employees WHERE employee_id = $1",
    [employeeId],
  );
  return rows[0]?.name || "User";
};

// fields: { column: value } set by our own code (never from the request).
const applyUpdate = async (client, ticket, fields, entry) => {
  const cols = Object.keys(fields);
  const sets = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => fields[c]);
  values.push(JSON.stringify([entry]), ticket.id);

  const { rows } = await client.query(
    `UPDATE tickets
     SET ${sets.join(", ")},
         history = CASE 
           WHEN history IS NOT NULL AND jsonb_typeof(history) = 'array' 
           THEN history || $${cols.length + 1}::jsonb
           ELSE $${cols.length + 1}::jsonb
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $${cols.length + 2}
     RETURNING *`,
    values,
  );
  return rows[0];
};

const clean = (text) => (typeof text === "string" ? text.trim() : "");

export const approveTicket = async (id, user, reason = "") => {
  const why = clean(reason);
  const { ticket, name } = await withTicket(id, async (c, tk) => {
    const currentStatus = (tk.status || "").trim();
    if (currentStatus === "Resolved" || currentStatus === "Rejected") {
      throw new WorkflowError(409, "This ticket is already closed.");
    }

    if (user.role === "Approver" && tk.approver_id && Number(tk.approver_id) !== Number(user.employeeId)) {
      throw new WorkflowError(403, "You are not authorized to approve this ticket. Only the assigned approver can approve it.");
    }

    const name = await nameOf(c, user.employeeId);
    const noteText = why ? `Approved by ${name}: ${why}` : `Approved by ${name}`;
    const ticket = await applyUpdate(
      c,
      tk,
      { status: "Open", approver_id: user.employeeId, approver_name: name, approver_reason: why, clarification: "", assignee_id: null, assignee_name: null },
      { by: user.employeeId, byName: name, from: tk.status, to: "Open", note: noteText, t: stamp() },
    );
    return { ticket, name };
  });

  await notify([ticket.created_by], {
    ticketId: id,
    title: `Ticket approved · ${id}`,
    message: `Approved by ${name}. It is now in the ticket pool.`,
  });
  await notify(await supportIdsForCategory(ticket.category), {
    ticketId: id,
    title: `New ticket in pool · ${id}`,
    message: ticket.title,
  });
  return ticket;
};

export const rejectTicket = async (id, user, reason) => {
  const why = clean(reason);
  if (!why) throw new WorkflowError(400, "Enter a reason to reject.");

  const { ticket, name } = await withTicket(id, async (c, tk) => {
    if (tk.status === "Resolved" || tk.status === "Rejected")
      throw new WorkflowError(409, "This ticket is already closed.");

    const isApprover = user.role === "Approver";
    const isSupport = user.role === "Support Team";
    const isAdmin = user.role === "Admin";

    if (!isApprover && !isSupport && !isAdmin)
      throw new WorkflowError(403, "You are not authorized to reject this ticket.");

    if (isApprover && tk.status !== "Pending Approval" && !(tk.status === "Clarification Needed" && !tk.assignee_id))
      throw new WorkflowError(409, "This ticket is not awaiting approval.");

    if (isApprover && tk.approver_id && Number(tk.approver_id) !== Number(user.employeeId) && !isAdmin)
      throw new WorkflowError(403, "You are not authorized to reject this ticket. Only the designated approver can reject it.");

    if (isSupport && tk.status !== "Open" && tk.status !== "In Progress" && tk.status !== "Pending" && Number(tk.assignee_id) !== Number(user.employeeId) && !isAdmin)
      throw new WorkflowError(403, "Only the assigned engineer can reject this ticket.");

    if (Number(tk.created_by) === Number(user.employeeId) && !isAdmin)
      throw new WorkflowError(403, "You cannot reject your own ticket.");

    const name = await nameOf(c, user.employeeId);
    const updates = { status: "Rejected" };
    if (isSupport) {
      updates.resolution = why;
    } else {
      updates.approver_reason = why;
    }

    if (isApprover || !tk.approver_id) {
      updates.approver_id = user.employeeId;
      updates.approver_name = name;
    }

    const ticket = await applyUpdate(
      c,
      tk,
      updates,
      { by: user.employeeId, byName: name, from: tk.status, to: "Rejected", note: `Rejected by ${name} (${user.role}): ${why}`, t: stamp() },
    );
    return { ticket, name };
  });

  await notify([ticket.created_by], {
    ticketId: id,
    title: `Ticket rejected · ${id}`,
    message: `Rejected by ${name}: ${why}`,
  });
  return ticket;
};

export const requestClarification = async (id, user, text) => {
  const why = clean(text);
  if (!why) throw new WorkflowError(400, "Enter the clarification you need.");

  const { ticket, name } = await withTicket(id, async (c, tk) => {
    if (tk.status === "Resolved" || tk.status === "Rejected")
      throw new WorkflowError(409, "This ticket is closed.");

    const isApprover = user.role === "Approver";
    const isSupport = user.role === "Support Team";
    const isAdmin = user.role === "Admin";

    if (isApprover && tk.status !== "Pending Approval" && !isAdmin)
      throw new WorkflowError(409, "You can only request clarification while awaiting approval.");

    if (isApprover && tk.approver_id && Number(tk.approver_id) !== Number(user.employeeId) && !isAdmin)
      throw new WorkflowError(403, "You are not authorized to request clarification on this ticket. Only the designated approver can do so.");

    if (isSupport && tk.status !== "In Progress" && tk.status !== "Pending" && !isAdmin)
      throw new WorkflowError(409, "You can only request clarification for tickets in progress.");

    if (isSupport && Number(tk.assignee_id) !== Number(user.employeeId) && !isAdmin)
      throw new WorkflowError(403, "Only the assigned engineer can request clarification.");

    if (Number(tk.created_by) === Number(user.employeeId) && !isAdmin)
      throw new WorkflowError(403, "You cannot request clarification on your own ticket.");

    const name = await nameOf(c, user.employeeId);

    // Record question in ticket_clarifications table
    try {
      await c.query(
        `INSERT INTO ticket_clarifications (ticket_id, question, asked_by, asked_by_name, asked_by_role)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, why, user.employeeId, name, user.role]
      );
    } catch (tblErr) {
      console.warn("Could not insert into ticket_clarifications:", tblErr.message);
    }

    const ticket = await applyUpdate(
      c,
      tk,
      { status: "Clarification Needed", clarification: why },
      { by: user.employeeId, byName: name, from: tk.status, to: "Clarification Needed", note: `Clarification requested by ${name} (${user.role}): ${why}`, t: stamp() },
    );
    return { ticket, name };
  });

  await notify([ticket.created_by], {
    ticketId: id,
    title: `Clarification requested · ${id}`,
    message: `${name}: ${why}`,
  });
  return ticket;
};

export const respondClarification = async (id, user, text) => {
  const reply = clean(text);
  if (!reply) throw new WorkflowError(400, "Enter your response.");

  const { ticket, name, nextStatus, isDirect } = await withTicket(id, async (c, tk) => {
    const isOwner = Number(tk.created_by) === Number(user.employeeId);
    const isAdmin = user.role === "Admin";

    if (!isOwner && !isAdmin)
      throw new WorkflowError(403, "Only the submitter can respond to the clarification request.");

    if (tk.status !== "Clarification Needed")
      throw new WorkflowError(409, "This ticket is not currently awaiting clarification.");

    // Tickets created by Admin, Approver, or Support Team skip approval and go directly to Support ("Open")
    const creatorRes = await c.query("SELECT role FROM employees WHERE employee_id = $1", [tk.created_by]);
    const creatorRole = creatorRes.rows[0]?.role;
    const isDirect = ["Admin", "Approver", "Support Team"].includes(creatorRole);

    const nextStatus = isDirect ? "Open" : "Pending Approval";
    const name = await nameOf(c, user.employeeId);

    // Update unanswered clarification in ticket_clarifications table
    try {
      const openClar = await c.query(
        `SELECT id FROM ticket_clarifications WHERE ticket_id = $1 AND answer IS NULL ORDER BY asked_at DESC LIMIT 1`,
        [id]
      );
      if (openClar.rows.length > 0) {
        await c.query(
          `UPDATE ticket_clarifications
           SET answer = $1, answered_by = $2, answered_by_name = $3, answered_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [reply, user.employeeId, name, openClar.rows[0].id]
        );
      } else {
        await c.query(
          `INSERT INTO ticket_clarifications (ticket_id, question, asked_by_name, answer, answered_by, answered_by_name, answered_at)
           VALUES ($1, $2, 'Reviewer', $3, $4, $5, CURRENT_TIMESTAMP)`,
          [id, tk.clarification || "Clarification requested", reply, user.employeeId, name]
        );
      }
    } catch (tblErr) {
      console.warn("Could not update ticket_clarifications:", tblErr.message);
    }

    const ticket = await applyUpdate(
      c,
      tk,
      { status: nextStatus, clarification: reply, assignee_id: null, assignee_name: null },
      { by: user.employeeId, byName: name, from: "Clarification Needed", to: nextStatus, note: `Clarification response from ${name}: ${reply}`, t: stamp() },
    );
    return { ticket, name, nextStatus, isDirect };
  });

  if (isDirect) {
    // Notify Support Team that clarification has been answered and ticket is in pool
    const supportIds = await supportIdsForCategory(ticket.category);
    await notify(supportIds, {
      ticketId: id,
      title: `Clarification answered · ${id}`,
      message: `${name} replied: ${reply}. Ticket is ready in the support pool.`,
    });
  } else {
    // Notify Approvers to review the response
    const approverIds = ticket.approver_id ? [ticket.approver_id] : await idsByRole("Approver");
    await notify(approverIds, {
      ticketId: id,
      title: `Clarification answered · ${id}`,
      message: `${name} replied: ${reply}. Review and approve the ticket.`,
    });
  }

  return ticket;
};

export const takeTicket = async (id, user) => {
  const { ticket, name } = await withTicket(id, async (c, tk) => {
    if (tk.status !== "Open" || tk.assignee_id)
      throw new WorkflowError(409, "This ticket is no longer available in the pool.");

    const name = await nameOf(c, user.employeeId);
    const ticket = await applyUpdate(
      c,
      tk,
      { status: "In Progress", assignee_id: user.employeeId, assignee_name: name },
      { by: user.employeeId, byName: name, from: tk.status, to: "In Progress", note: `Taken by ${name}`, t: stamp() },
    );
    return { ticket, name };
  });

  await notify([ticket.created_by], {
    ticketId: id,
    title: `Ticket assigned · ${id}`,
    message: `${name} took your ticket.`,
  });
  return ticket;
};

export const releaseTicket = async (id, user) => {
  const { ticket, name } = await withTicket(id, async (c, tk) => {
    const isAssignee = Number(tk.assignee_id) === Number(user.employeeId);
    const isAdmin = user.role === "Admin";
    if (!isAssignee && !isAdmin)
      throw new WorkflowError(403, "Only the engineer who took this ticket can release it.");
    if (tk.status !== "In Progress" && tk.status !== "Pending")
      throw new WorkflowError(409, "Only tickets in progress can be released.");

    const name = await nameOf(c, user.employeeId);
    const ticket = await applyUpdate(
      c,
      tk,
      { status: "Open", assignee_id: null, assignee_name: null },
      { by: user.employeeId, byName: name, from: tk.status, to: "Open", note: `Released to pool by ${name}`, t: stamp() },
    );
    return { ticket, name };
  });

  await notify(await supportIdsForCategory(ticket.category, user.employeeId), {
    ticketId: id,
    title: `Ticket released · ${id}`,
    message: `Returned to the pool by ${name}.`,
  });
  return ticket;
};

export const resolveTicket = async (id, user, resolution) => {
  const text = clean(resolution);
  if (!text) throw new WorkflowError(400, "Add resolution details to resolve.");

  const { ticket, name } = await withTicket(id, async (c, tk) => {
    const isAssignee = Number(tk.assignee_id) === Number(user.employeeId);
    const isAdmin = user.role === "Admin";
    if (!isAssignee && !isAdmin)
      throw new WorkflowError(403, "Only the engineer who took this ticket can resolve it.");
    if (tk.status !== "In Progress" && tk.status !== "Pending")
      throw new WorkflowError(409, "Only tickets in progress can be resolved.");

    const name = await nameOf(c, user.employeeId);
    const ticket = await applyUpdate(
      c,
      tk,
      { status: "Resolved", resolution: text },
      { by: user.employeeId, byName: name, from: tk.status, to: "Resolved", note: `Resolved by ${name}: ${text}`, t: stamp() },
    );
    return { ticket, name };
  });

  await notify([ticket.created_by], {
    ticketId: id,
    title: `Ticket resolved · ${id}`,
    message: `Your request was completed: ${text}`,
  });
  return ticket;
};

export const addClarification = async (id, user, text) => {
  return requestClarification(id, user, text);
};
