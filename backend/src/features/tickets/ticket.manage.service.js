import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../../config/db.js";
import { HttpError } from "../../utils/httpError.js";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const stamp = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

const dropFile = (filePath) =>
  fs.unlink(path.resolve(backendRoot, filePath), () => {});

// Locks the ticket and checks the user owns it and it is still pending.
const withOwnPendingTicket = async (ticketId, user, run) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT * FROM tickets WHERE id = $1 FOR UPDATE",
      [ticketId],
    );
    const ticket = rows[0];
    if (!ticket) throw new HttpError(404, "Ticket not found");
    if (Number(ticket.created_by) !== Number(user.employeeId))
      throw new HttpError(
        403,
        "Only the person who raised this ticket can change it.",
      );
    const isDirectRole = ["Admin", "Approver", "Support Team"].includes(
      user.role,
    );
    const isAllowedStatus =
      ticket.status === "Pending Approval" ||
      (isDirectRole && ticket.status === "Open");
    if (!isAllowedStatus)
      throw new HttpError(
        409,
        "A ticket can only be changed while it is pending approval or open.",
      );

    const result = await run(client, ticket);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const getWithAttachment = async (id) => {
  const { rows } = await pool.query(
    `SELECT t.*,
            a.attachment_id,
            a.original_name AS attachment_name,
            a.file_path AS attachment_path,
            a.mime_type AS attachment_mime_type,
            a.file_size AS attachment_file_size
     FROM tickets t
     LEFT JOIN ticket_attachments a ON a.ticket_id = t.id
     WHERE t.id = $1`,
    [id],
  );
  return rows[0];
};

// Edit the short description, description, priority and the single attachment.
// Category, sub category and item are locked and never changed here.
export const updateDetails = async (id, user, body, file, removeAttachment) => {
  const { oldFiles } = await withOwnPendingTicket(
    id,
    user,
    async (c, ticket) => {
      const title = String(body.title ?? "").trim();
      const description = String(body.description ?? "").trim();
      const priority = body.priority || ticket.priority;

      if (!title || !description)
        throw new HttpError(
          400,
          "Short description and description are required.",
        );
      if (!PRIORITIES.includes(priority))
        throw new HttpError(
          400,
          "Priority must be Low, Medium, High or Critical.",
        );

      const entry = {
        by: user.employeeId,
        from: ticket.status,
        to: ticket.status,
        note: "Ticket details edited",
        t: stamp(),
      };

      await c.query(
        `UPDATE tickets
       SET title = $1,
           description = $2,
           priority = $3,
           history = COALESCE(history, '[]'::jsonb) || $4::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
        [title, description, priority, JSON.stringify([entry]), ticket.id],
      );

      // One attachment only: a new file replaces the old one, or it can be removed.
      let oldFiles = [];
      if (file || removeAttachment) {
        const removed = await c.query(
          "DELETE FROM ticket_attachments WHERE ticket_id = $1 RETURNING file_path",
          [ticket.id],
        );
        oldFiles = removed.rows.map((r) => r.file_path);
      }
      if (file) {
        await c.query(
          `INSERT INTO ticket_attachments
           (ticket_id, original_name, stored_name, file_path, mime_type, file_size)
         VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            ticket.id,
            file.originalname,
            file.filename,
            `uploads/tickets/${file.filename}`,
            file.mimetype,
            file.size,
          ],
        );
      }
      return { oldFiles };
    },
  );

  // Delete old files from disk only after the database change is saved.
  oldFiles.forEach(dropFile);
  return getWithAttachment(id);
};

// The owner may delete a ticket only while it is pending approval.
export const deleteOwnTicket = async (id, user) => {
  const { files } = await withOwnPendingTicket(id, user, async (c, ticket) => {
    const found = await c.query(
      "SELECT file_path FROM ticket_attachments WHERE ticket_id = $1",
      [ticket.id],
    );
    await c.query("DELETE FROM notifications WHERE ticket_id = $1", [
      ticket.id,
    ]);
    await c.query("DELETE FROM tickets WHERE id = $1", [ticket.id]);
    return { files: found.rows.map((r) => r.file_path) };
  });

  files.forEach(dropFile);
  return { id };
};
