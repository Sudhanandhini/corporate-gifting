import nodemailer from 'nodemailer';
import 'dotenv/config';

const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

let transporter = null;
if (hasSmtp) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Sends the OTP. In DEV (no SMTP configured) it just logs the code and the
 * caller returns it in the response so the flow is testable out of the box.
 */
export async function sendOtpEmail(email, code) {
  if (!transporter) {
    console.log(`\n[DEV OTP] ${email} -> ${code}\n`);
    return { delivered: false, dev: true };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gifting-portal.com',
    to: email,
    subject: 'Your verification code',
    text: `Your Corporate Gifting verification code is ${code}. It expires shortly.`,
    html: `<p>Your Corporate Gifting verification code is <b style="font-size:20px">${code}</b>.</p><p>It expires shortly.</p>`,
  });
  return { delivered: true, dev: false };
}

export const isDevMail = !hasSmtp;
