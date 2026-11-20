import pool from "../../config/db.js";

export const listForUser = async (employeeId) => {
  const { rows } = await pool.query(
    `SELECT notification_id, ticket_id, title, message, is_read, created_at
     FROM notifications
     WHERE employee_id = $1
     ORDER BY created_at DESC, notification_id DESC
     LIMIT 100`,
    [employeeId],
  );
  return rows;
};

export const markRead = async (notificationId, employeeId) => {
  const { rowCount } = await pool.query(
    `UPDATE notifications SET is_read = true
     WHERE notification_id = $1 AND employee_id = $2`,
    [notificationId, employeeId],
  );
  return rowCount > 0;
};

export const markAllRead = async (employeeId) => {
  await pool.query(
    `UPDATE notifications SET is_read = true
     WHERE employee_id = $1 AND is_read = false`,
    [employeeId],
  );
};