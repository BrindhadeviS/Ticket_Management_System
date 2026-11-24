import pool from "../config/db.js";
import { sendMail } from "./mailer.js";
import { buildEmail } from "./buildEmail.js";

// Ids of all active employees with a role, optionally leaving one person out.
export const idsByRole = async (role, exceptId = null) => {
  const { rows } = await pool.query(
    `SELECT employee_id FROM employees
     WHERE role = $1 AND active = true AND employee_id <> COALESCE($2, -1)`,
    [role, exceptId],
  );
  return rows.map((r) => r.employee_id);
};

// Ids of active employees with a specific role and department.
export const idsByRoleAndDept = async (role, dept, exceptId = null) => {
  if (!dept) return idsByRole(role, exceptId);
  const { rows } = await pool.query(
    `SELECT employee_id FROM employees
     WHERE role = $1 AND department = $2 AND active = true AND employee_id <> COALESCE($3, -1)`,
    [role, dept, exceptId],
  );
  return rows.map((r) => r.employee_id);
};

// Ids of active Support Team members matching a ticket's category department mapping.
export const supportIdsForCategory = async (categoryOrTicket, exceptId = null) => {
  const rawCat =
    categoryOrTicket && typeof categoryOrTicket === "object"
      ? categoryOrTicket.category || categoryOrTicket.cat
      : categoryOrTicket;
  const cat = String(rawCat || "").trim();

  // If no category specified or category is "Others", notify all Support Team members
  if (!cat || cat.toLowerCase() === "others") {
    return idsByRole("Support Team", exceptId);
  }

  try {
    // Find departments mapped to this category
    const { rows: mappingRows } = await pool.query(
      `SELECT cdm.department
       FROM category_department_mapping cdm
       JOIN categories c ON c.category_id = cdm.category_id
       WHERE LOWER(TRIM(c.name)) = LOWER($1)
          OR c.category_id::text = $1`,
      [cat],
    );

    const mappedDepts = mappingRows.map((r) => r.department).filter(Boolean);

    // If no mapping configured, fallback to all Support Team
    if (mappedDepts.length === 0) {
      return idsByRole("Support Team", exceptId);
    }

    // Find Support Team members in mapped departments (case-insensitive)
    const { rows } = await pool.query(
      `SELECT employee_id FROM employees
       WHERE role = 'Support Team'
         AND active = true
         AND EXISTS (
           SELECT 1 FROM unnest($1::varchar[]) AS m(dept)
           WHERE LOWER(TRIM(employees.department)) = LOWER(TRIM(m.dept))
         )
         AND employee_id <> COALESCE($2, -1)`,
      [mappedDepts, exceptId],
    );

    // If no active support employees in mapped departments, fallback to all Support Team
    if (rows.length === 0) {
      return idsByRole("Support Team", exceptId);
    }

    return rows.map((r) => r.employee_id);
  } catch (err) {
    console.error("Failed to fetch department-specific support IDs:", err.message);
    return idsByRole("Support Team", exceptId);
  }
};

// Saves an in-app notification for each person, then emails them.
// Never throws: a failed notification must not break the ticket action.
export const notify = async (recipientIds, { ticketId, title, message }) => {
  const ids = [...new Set(recipientIds.filter(Boolean).map(Number))];
  if (!ids.length) return;

  try {
    await pool.query(
      `INSERT INTO notifications (employee_id, ticket_id, title, message)
       SELECT unnest($1::int[]), $2, $3, $4`,
      [ids, ticketId, title, message || ""],
    );
  } catch (err) {
    console.error("Notification save failed:", err.message);
  }

    try {
    const { rows } = await pool.query(
      `SELECT email FROM employees WHERE employee_id = ANY($1::int[]) AND active = true`,
      [ids],
    );

    const { text, html } = buildEmail({ title, message, ticketId });

    // Sent in the background, so the button does not wait for the email
    Promise.all(
      rows.map((r) =>
        sendMail({ to: r.email, subject: title, text, html }).catch(() => null),
      ),
    ).catch(() => null);
  } catch (err) {
    console.error("Notification email failed:", err.message);
  }
};