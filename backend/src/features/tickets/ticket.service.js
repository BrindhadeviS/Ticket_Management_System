import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../../config/db.js";
import { notify, idsByRole, supportIdsForCategory } from "../../utils/notify.js";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

export const getAllTickets = async (role, employeeId, options = {}) => {
  const { page, limit } = options;
  let query;
  let countQuery;
  let values = [];
  let countValues = [];

  const baseSelect = `
    SELECT t.*, e.department AS "byDept", e.department AS creator_dept
    FROM tickets t
    LEFT JOIN employees e ON t.created_by = e.employee_id
  `;

  const baseCount = `
    SELECT COUNT(*) AS total
    FROM tickets t
  `;

  if (role === "Admin") {
    query = `${baseSelect} ORDER BY t.created_at DESC`;
    countQuery = `${baseCount}`;
  } else if (role === "Approver") {
    query = `${baseSelect} WHERE (t.approver_id = $1 OR t.created_by = $1 OR e.manager_id = $1) ORDER BY t.created_at DESC`;
    countQuery = `${baseCount} LEFT JOIN employees e ON t.created_by = e.employee_id WHERE (t.approver_id = $1 OR t.created_by = $1 OR e.manager_id = $1)`;
    values = [employeeId];
    countValues = [employeeId];
  } else if (role === "Employee") {
    query = `${baseSelect} WHERE t.created_by = $1 ORDER BY t.created_at DESC`;
    countQuery = `${baseCount} WHERE t.created_by = $1`;
    values = [employeeId];
    countValues = [employeeId];
  } else if (role === "Support Team") {
    // Fetch support member's department
    let supportDept = null;
    try {
      const empRes = await pool.query(`SELECT department FROM employees WHERE employee_id = $1`, [employeeId]);
      supportDept = empRes.rows[0]?.department || null;
    } catch (_) {}

    // Support team members see:
    // 1. Tickets assigned to them or created by them
    // 2. Tickets that are not pending approval where:
    //    - category is 'Others' (visible to all support engineers)
    //    - OR category is mapped to the support engineer's department in category_department_mapping
    query = `
      ${baseSelect}
      WHERE (
        t.assignee_id = $1
        OR t.created_by = $1
        OR (
          t.status != 'Pending Approval'
          AND (
            t.category = 'Others'
            OR (
              $2::varchar IS NOT NULL
              AND t.category IN (
                SELECT c.name
                FROM category_department_mapping cdm
                JOIN categories c ON c.category_id = cdm.category_id
                WHERE LOWER(TRIM(cdm.department)) = LOWER(TRIM($2))
              )
            )
          )
        )
      )
      ORDER BY t.created_at DESC
    `;
    countQuery = `
      ${baseCount}
      WHERE (
        t.assignee_id = $1
        OR t.created_by = $1
        OR (
          t.status != 'Pending Approval'
          AND (
            t.category = 'Others'
            OR (
              $2::varchar IS NOT NULL
              AND t.category IN (
                SELECT c.name
                FROM category_department_mapping cdm
                JOIN categories c ON c.category_id = cdm.category_id
                WHERE LOWER(TRIM(cdm.department)) = LOWER(TRIM($2))
              )
            )
          )
        )
      )
    `;
    values = [employeeId, supportDept];
    countValues = [employeeId, supportDept];
  } else {
    return [];
  }

  // If page and limit provided, return paginated results with total count
  if (page && limit) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const countResult = await pool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    const paginatedQuery = `${query} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const paginatedValues = [...values, limitNum, offset];

    const result = await pool.query(paginatedQuery, paginatedValues);
    return {
      tickets: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  const result = await pool.query(query, values);
  return result.rows;
};

export const getTicketPool = async (employeeId = null) => {
  let supportDept = null;
  if (employeeId) {
    try {
      const empRes = await pool.query(`SELECT department, role FROM employees WHERE employee_id = $1`, [employeeId]);
      if (empRes.rows[0]?.role === "Support Team") {
        supportDept = empRes.rows[0]?.department || null;
      }
    } catch (_) {}
  }

  let query = `
    SELECT t.*, e.department AS "byDept", e.department AS creator_dept
    FROM tickets t
    LEFT JOIN employees e ON t.created_by = e.employee_id
    WHERE t.status = 'Open'
    AND t.assignee_id IS NULL
  `;
  const values = [];

  if (supportDept) {
    query += `
      AND (
        t.category = 'Others'
        OR t.category IN (
          SELECT c.name
          FROM category_department_mapping cdm
          JOIN categories c ON c.category_id = cdm.category_id
          WHERE LOWER(TRIM(cdm.department)) = LOWER(TRIM($1))
        )
      )
    `;
    values.push(supportDept);
  }

  query += ` ORDER BY t.created_at DESC`;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getAssignedTickets = async (employeeId) => {
  const result = await pool.query(
    `SELECT t.*, e.department AS "byDept", e.department AS creator_dept
     FROM tickets t
     LEFT JOIN employees e ON t.created_by = e.employee_id
     WHERE t.assignee_id = $1
     ORDER BY t.created_at DESC`,
    [employeeId],
  );

  return result.rows;
};

export const createTicket = async (ticketData, file = null, user = null) => {
  let id = ticketData.id;

  // If an ID is provided, verify it does not already exist in the database
  if (id) {
    try {
      const checkRes = await pool.query(`SELECT 1 FROM tickets WHERE id = $1`, [id]);
      if (checkRes.rows.length > 0) {
        id = null; // Collision with existing ticket, auto-generate fresh unique ID
      }
    } catch (_) {
      id = null;
    }
  }

  // Generate ID if missing or colliding
  if (!id) {
    try {
      const maxRes = await pool.query(`
        SELECT COALESCE(
          MAX(NULLIF(regexp_replace(id, '^TKT-', ''), '')::bigint),
          1000
        ) AS max_id
        FROM tickets
        WHERE id LIKE 'TKT-%'
      `);
      const nextId = Number(maxRes.rows[0]?.max_id || 1000) + 1;
      id = `TKT-${nextId}`;

      // Synchronize database sequence if it exists
      try {
        await pool.query(`SELECT setval('ticket_seq', $1, true)`, [nextId]);
      } catch (_) {}
    } catch {
      try {
        const nextRes = await pool.query(`SELECT nextval('ticket_seq') AS next_id`);
        id = `TKT-${nextRes.rows[0].next_id}`;
      } catch {
        id = `TKT-${Date.now()}`;
      }
    }
  }

  const rawBy = ticketData.created_by || ticketData.by || user?.employeeId || null;
  const createdBy = rawBy && !Number.isNaN(Number(rawBy)) ? Number(rawBy) : (user?.employeeId || null);

  let creatorRole = user?.role || null;
  let creatorName = ticketData.created_by_name || ticketData.byName || user?.name || null;
  let creatorEmail = ticketData.created_by_email || ticketData.byEmail || user?.email || null;

  if (createdBy && (!creatorName || !creatorEmail || !creatorRole)) {
    const creatorResult = await pool.query(
      `SELECT name, email, role FROM employees WHERE employee_id = $1`,
      [createdBy]
    );
    if (creatorResult.rows[0]) {
      creatorName = creatorName || creatorResult.rows[0].name;
      creatorEmail = creatorEmail || creatorResult.rows[0].email;
      creatorRole = creatorRole || creatorResult.rows[0].role;
    }
  }

  // Admin / Approver / Support Team created tickets skip approval and go directly to Support Team pool as "Open"
  const isDirect = ["Admin", "Approver", "Support Team"].includes(creatorRole);
  const defaultStatus = isDirect ? "Open" : "Pending Approval";
  const status = ticketData.status || defaultStatus;

  const title = String(ticketData.title || "").trim();
  const desc = String(ticketData.description || ticketData.desc || "").trim();
  const cat = ticketData.category || ticketData.cat || "";
  const sub = ticketData.sub_category || ticketData.sub || "";
  const item = ticketData.item || "";
  const clarification = ticketData.clarification || "";
  const priority = ticketData.priority || "Medium";

  // Sanitize date for PostgreSQL DATE column
  let ticketDate = null;
  const rawDate = ticketData.ticket_date || ticketData.ticketDate;
  if (rawDate && typeof rawDate === "string" && rawDate.trim() !== "") {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      ticketDate = parsed.toISOString().slice(0, 10);
    }
  } else if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    ticketDate = rawDate.toISOString().slice(0, 10);
  }

  const rawApproverId = ticketData.approver_id || ticketData.approver;
  let approverId = rawApproverId && !Number.isNaN(Number(rawApproverId)) ? Number(rawApproverId) : null;
  let approverName = ticketData.approver_name || ticketData.approverName || null;
  const approverReason = ticketData.approver_reason || ticketData.reason || "";

  // Always resolve the creator's current manager directly from the database for non-direct tickets
  if (!isDirect && createdBy) {
    try {
      const mgrResult = await pool.query(
        `SELECT e.manager_id, m.name AS manager_name
         FROM employees e
         LEFT JOIN employees m ON m.employee_id = e.manager_id
         WHERE e.employee_id = $1`,
        [createdBy]
      );
      if (mgrResult.rows.length > 0 && mgrResult.rows[0].manager_id) {
        approverId = mgrResult.rows[0].manager_id;
        approverName = mgrResult.rows[0].manager_name;
      }
    } catch (e) {
      console.warn("Could not auto-fetch manager for ticket creator:", e);
    }
  }

  const rawAssigneeId = ticketData.assignee_id || ticketData.assignee;
  const assigneeId = rawAssigneeId && !Number.isNaN(Number(rawAssigneeId)) ? Number(rawAssigneeId) : null;
  const resolution = ticketData.resolution || "";

  const stamp = () =>
    new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });

  let history = Array.isArray(ticketData.history) && ticketData.history.length > 0
    ? ticketData.history
    : [
        {
          by: createdBy,
          byName: creatorName,
          from: "—",
          to: status,
          note: isDirect ? "Sent directly to Support Team" : "Ticket created",
          t: stamp(),
        },
      ];

  const query = `
    INSERT INTO tickets (
      id, title, description, category, sub_category, item, clarification,
      priority, status, created_by, created_by_name, created_by_email,
      ticket_date, approver_id, approver_name, approver_reason,
      assignee_id, assignee_name, resolution, history
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    )
    RETURNING * `;

  const values = [
    id,
    title,
    desc,
    cat,
    sub,
    item,
    clarification,
    priority,
    status,
    createdBy,
    creatorName,
    creatorEmail,
    ticketDate,
    approverId,
    ticketData.approver_name || null,
    approverReason,
    assigneeId,
    ticketData.assignee_name || null,
    resolution,
    JSON.stringify(history),
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(query, values);

    let attachmentRow = null;
    if (file) {
      const attachRes = await client.query(
        `INSERT INTO ticket_attachments (
          ticket_id,
          original_name,
          stored_name,
          file_path,
          mime_type,
          file_size
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          id,
          file.originalname,
          file.filename,
          `uploads/tickets/${file.filename}`,
          file.mimetype,
          file.size,
        ],
      );
      attachmentRow = attachRes.rows[0];
    }

    await client.query("COMMIT");

    const createdTicket = result.rows[0];
    if (attachmentRow) {
      createdTicket.attachment_id = attachmentRow.attachment_id;
      createdTicket.attachment_name = attachmentRow.original_name;
      createdTicket.attachment_path = attachmentRow.file_path;
      createdTicket.attachment_mime_type = attachmentRow.mime_type;
      createdTicket.attachment_file_size = attachmentRow.file_size;
    }

    // Persist notification in DB for approvers or support team
    try {
      if (status === "Pending Approval") {
        const targetApprovers = approverId ? [Number(approverId)] : await idsByRole("Approver");
        await notify(targetApprovers, {
          ticketId: id,
          title: `Approval pending · ${id}`,
          message: `${title} (${creatorName})`,
        });
      } else if (status === "Open") {
        const supportTeam = await supportIdsForCategory(cat || createdTicket.category, createdBy);
        await notify(supportTeam, {
          ticketId: id,
          title: `New ticket in pool · ${id}`,
          message: `${title} (${creatorName})`,
        });
      }
    } catch (notifErr) {
      console.error("Failed to send initial ticket notification:", notifErr.message);
    }

    return createdTicket;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Ticket Creation Error]", err);
    throw err;
  } finally {
    client.release();
  }
};

export const getTicketById = async (id) => {
  const result = await pool.query(
    `SELECT
      t.*,
      a.attachment_id,
      a.original_name AS attachment_name,
      a.file_path AS attachment_path,
      a.mime_type AS attachment_mime_type,
      a.file_size AS attachment_file_size
    FROM tickets t
    LEFT JOIN ticket_attachments a
      ON a.ticket_id = t.id
    WHERE t.id = $1`,
    [id]
  );

  const ticket = result.rows[0];
  if (!ticket) return null;

  try {
    const clarRes = await pool.query(
      `SELECT * FROM ticket_clarifications WHERE ticket_id = $1 ORDER BY asked_at ASC`,
      [id]
    );
    ticket.clarifications = clarRes.rows;
  } catch (_) {
    ticket.clarifications = [];
  }

  return ticket;
};

export const updateTicket = async (id, updates, file = null, removeAttachment = false) => {
  const current = await getTicketById(id);
  if (!current) return null;

  const title = updates.title !== undefined ? updates.title : current.title;
  const desc =
    updates.description !== undefined
      ? updates.description
      : updates.desc !== undefined
        ? updates.desc
        : current.description;
  const status = updates.status !== undefined ? updates.status : current.status;
  const approverId =
    updates.approver_id !== undefined
      ? updates.approver_id
      : updates.approver !== undefined
        ? updates.approver
        : current.approver_id;
  const approverReason =
    updates.approver_reason !== undefined
      ? updates.approver_reason
      : updates.reason !== undefined
        ? updates.reason
        : current.approver_reason;
  const assigneeId =
    updates.assignee_id !== undefined
      ? updates.assignee_id
      : updates.assignee !== undefined
        ? updates.assignee
        : current.assignee_id;
  const resolution =
    updates.resolution !== undefined ? updates.resolution : current.resolution;
  const clarification =
    updates.clarification !== undefined ? updates.clarification : current.clarification;
  const history =
    updates.history !== undefined ? updates.history : current.history;

  const approverResult = approverId
    ? await pool.query(`SELECT name FROM employees WHERE employee_id = $1`, [approverId])
    : { rows: [] };
  const assigneeResult = assigneeId
    ? await pool.query(`SELECT name FROM employees WHERE employee_id = $1`, [assigneeId])
    : { rows: [] };

  const approverName =
    updates.approver_name || approverResult.rows[0]?.name || current.approver_name || null;
  const assigneeName =
    updates.assignee_name || assigneeResult.rows[0]?.name || current.assignee_name || null;

  const query = `
    UPDATE tickets
    SET title = $1,
        description = $2,
        status = $3,
        approver_id = $4,
        approver_name = $5,
        approver_reason = $6,
        assignee_id = $7,
        assignee_name = $8,
        resolution = $9,
        clarification = $10,
        history = $11
    WHERE id = $12
    RETURNING *
  `;

  const values = [
    title,
    desc,
    status,
    approverId,
    approverName,
    approverReason,
    assigneeId,
    assigneeName,
    resolution,
    clarification,
    JSON.stringify(history),
    id,
  ];

  await pool.query(query, values);

  // Enforce single attachment: delete previous attachment if replacing or removing
  if (file || removeAttachment) {
    const removed = await pool.query(
      "DELETE FROM ticket_attachments WHERE ticket_id = $1 RETURNING file_path",
      [id],
    );
    removed.rows.forEach((r) => {
      try {
        fs.unlink(path.resolve(backendRoot, r.file_path), () => {});
      } catch (_) {}
    });
  }

  if (file) {
    await pool.query(
      `INSERT INTO ticket_attachments
         (ticket_id, original_name, stored_name, file_path, mime_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, file.originalname, file.filename, `uploads/tickets/${file.filename}`, file.mimetype, file.size],
    );
  }

  return await getTicketById(id);
};

export const deleteTicket = async (id) => {
  const result = await pool.query(
    `DELETE FROM tickets WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
