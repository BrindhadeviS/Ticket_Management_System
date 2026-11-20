const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const buildEmail = ({ title, message, ticketId }) => {
  const portalUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  const text = [
    title,
    message || "",
    ticketId ? `Ticket: ${ticketId}` : "",
    `Open the portal: ${portalUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2fb;padding:24px 0;font-family:Segoe UI,Arial,sans-serif;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0dbf0;border-radius:8px;">
        <tr>
          <td style="background:#6d5bb8;padding:16px 24px;border-radius:8px 8px 0 0;color:#ffffff;font-size:16px;font-weight:bold;">
            Ladera Ticket Management
          </td>
        </tr>
        <tr>
          <td style="padding:24px;color:#231d3a;">
            <p style="margin:0 0 12px;font-size:18px;font-weight:bold;">${safeTitle}</p>
            ${
              safeMessage
                ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#3a3358;">${safeMessage}</p>`
                : ""
            }
            ${
              ticketId
                ? `<p style="margin:0 0 20px;font-size:13px;color:#6b6585;">Ticket ID: <b style="color:#231d3a;">${escapeHtml(ticketId)}</b></p>`
                : ""
            }
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#6d5bb8" style="border-radius:6px;">
                  <a href="${portalUrl}" style="display:inline-block;padding:10px 20px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">Open ticket portal</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 24px;border-top:1px solid #e0dbf0;color:#8a85a0;font-size:12px;">
            This is an automated message from Ladera Ticket Management System. Please do not reply.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  return { text, html };
};