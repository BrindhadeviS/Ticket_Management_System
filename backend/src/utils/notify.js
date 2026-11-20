import pool from "../config/db.js";
import { sendMail } from "./mailer.js";

// Ids of all active employees with a role, optionally leaving one person out.
export const idsByRole = async (role, exceptId = null) => {
  const { rows } = await pool.query(
    `SELECT employee_id FROM employees
     WHERE role = $1 AND active = true AND employee_id <> COALESCE($2, -1)`,
    [role, exceptId],
  );
  return rows.map((r) => r.employee_id);
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