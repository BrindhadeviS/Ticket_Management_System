import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../../config/db.js";
import { HttpError } from "../../utils/httpError.js";
import { canViewTicket } from "../../utils/ticketAccess.js";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const uploadsRoot = path.join(backendRoot, "uploads");

// Finds the ticket's file, but only if this user is allowed to see the ticket.
export const getAttachmentForUser = async (ticketId, user) => {
  const { rows } = await pool.query(
    `SELECT t.created_by, t.assignee_id, t.status,
            a.original_name, a.file_path, a.mime_type
     FROM tickets t
     LEFT JOIN ticket_attachments a ON a.ticket_id = t.id
     WHERE t.id = $1`,
    [ticketId],
  );

  const row = rows[0];
  if (!row) throw new HttpError(404, "Ticket not found");
  if (!canViewTicket(user, row))
    throw new HttpError(403, "You do not have access to this ticket.");
  if (!row.file_path) throw new HttpError(404, "This ticket has no attachment.");

  const absolute = path.resolve(backendRoot, row.file_path);
  if (!absolute.startsWith(uploadsRoot + path.sep))
    throw new HttpError(403, "Invalid file path.");
  if (!fs.existsSync(absolute))
    throw new HttpError(404, "The file is missing on the server.");

  return { absolute, name: row.original_name };
};