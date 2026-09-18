import nodemailer from 'nodemailer';

let transporter;
let transporterConfigured = false;

function getTransporter() {
  if (transporterConfigured) return transporter;
  transporterConfigured = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendMail({ to, subject, text }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(
      `[mailer] SMTP is not configured (see .env.example) — logging this email instead of sending it.\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`,
    );
    return { sent: false };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({ from, to, subject, text });
  return { sent: true };
}
