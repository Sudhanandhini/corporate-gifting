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

function orderDetailRows(order) {
  return [
    ['Order ID', order.order_code],
    ['Gift', `${order.gift_name}${order.quantity > 1 ? ` ×${order.quantity}` : ''}`],
    ['Recipient', order.recipient_name],
    ['Last Name', order.last_name || '—'],
    ['Phone', order.phone],
    ['Employee ID', order.employee_id || '—'],
    ['Entity', order.entity || '—'],
    ['Delivery Address', `${order.address}, ${order.city}, ${order.state} ${order.pincode}`],
    ['Status', order.status],
  ];
}

function orderDetailsHtml(order) {
  const rows = orderDetailRows(order)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;">${k}</td><td style="padding:4px 0;font-weight:600;">${v}</td></tr>`)
    .join('');
  return `<table cellpadding="0" cellspacing="0">${rows}</table>`;
}

function orderDetailsText(order) {
  return orderDetailRows(order).map(([k, v]) => `${k}: ${v}`).join('\n');
}

/** Sent to the client once their order is submitted and confirmed. */
export async function sendOrderConfirmationEmail(order) {
  if (!order.client_email) return { delivered: false, skipped: true };
  const subject = `Your Corporate Gifting order ${order.order_code} is confirmed`;
  if (!transporter) {
    console.log(`\n[DEV MAIL] Order confirmation -> ${order.client_email} (${order.order_code})\n`);
    return { delivered: false, dev: true };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gifting-portal.com',
    to: order.client_email,
    subject,
    text: `Thank you! Your gift order has been submitted.\n\n${orderDetailsText(order)}`,
    html: `<p>Thank you! Your gift order has been submitted.</p>${orderDetailsHtml(order)}`,
  });
  return { delivered: true, dev: false };
}

/** Sent to the admin inbox (ADMIN_NOTIFY_EMAIL) for every new order. */
export async function sendOrderAdminNotification(order) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) return { delivered: false, skipped: true };
  const subject = `New gift order ${order.order_code} — ${order.recipient_name}`;
  if (!transporter) {
    console.log(`\n[DEV MAIL] New order notification -> ${adminEmail} (${order.order_code})\n`);
    return { delivered: false, dev: true };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gifting-portal.com',
    to: adminEmail,
    subject,
    text: `A new gift order was submitted.\n\n${orderDetailsText(order)}`,
    html: `<p>A new gift order was submitted.</p>${orderDetailsHtml(order)}`,
  });
  return { delivered: true, dev: false };
}

/**
 * Fires both the client confirmation and admin notification without letting
 * a mail failure affect the order that already succeeded — callers should
 * not await this on the request path.
 */
export async function sendOrderEmails(order) {
  const [client, admin] = await Promise.allSettled([
    sendOrderConfirmationEmail(order),
    sendOrderAdminNotification(order),
  ]);
  if (client.status === 'rejected') console.error('Order confirmation email failed:', client.reason);
  if (admin.status === 'rejected') console.error('Admin order notification email failed:', admin.reason);
}

export const isDevMail = !hasSmtp;
