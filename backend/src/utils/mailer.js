import nodemailer from 'nodemailer';

let transporter = null;


const getTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;

  if (!host || !user || !pass || user.includes("example.com")) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  console.log(`[Mailer] Configured SMTP transporter for ${host}:${port}`);

  return transporter;
};

export const sendMail = async ({ to, subject, text, html }) => {
  try {
    const fromAddress = process.env.SMTP_FROM || '"Ticket Management System" <no-reply@ladera.com>';
    const mailer = await getTransporter();

    if (!mailer) {
      console.log(`[Mailer Mock Delivery] To: ${to} | Subject: ${subject}`);
      return { success: true, mocked: true };
    }

    const info = await mailer.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || subject,
      html: html || `<div style="font-family: sans-serif; padding: 20px; color: #231d3a;">
        <h2 style="color: #6d5bb8; margin-top: 0;">Ticket Management System</h2>
        <p style="font-size: 15px;">${subject}</p>
        <p style="color: #6b6585; font-size: 12px; margin-top: 24px; border-top: 1px solid #e0dbf0; padding-top: 12px;">
          This is an automated notification from Ladera Ticket Management System.
        </p>
      </div>`
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Mailer Preview URL]: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null
    };
  } catch (error) {
    console.error(`[Mailer Error] Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};
