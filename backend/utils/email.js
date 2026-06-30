import nodemailer from "nodemailer";

function transporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const wrap = (title, body) => `<!DOCTYPE html><html><body style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#f9fafb">
<div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
  <h1 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 4px">Plan<span style="color:#6366f1">It</span></h1>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0 24px">
  <h2 style="font-size:18px;font-weight:600;color:#111;margin:0 0 16px">${title}</h2>
  ${body}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px">
  <p style="font-size:12px;color:#9ca3af;text-align:center">© 2026 PlanIt · Events worth showing up for</p>
</div></body></html>`;

export async function sendOtpEmail(to, otp) {
  const t = transporter();
  const html = wrap("Verify your email", `
    <p style="color:#4b5563">Enter this code to verify your PlanIt account:</p>
    <div style="text-align:center;margin:28px 0">
      <span style="font-size:42px;font-weight:700;letter-spacing:14px;color:#1a1a2e;font-family:monospace">${otp}</span>
    </div>
    <p style="color:#9ca3af;font-size:13px;text-align:center">Expires in 5 minutes. Max 5 attempts.</p>`);

  if (!t) { console.log(`\n🔑 [DEV OTP] ${to}: ${otp}\n`); return { devMode: true, devOtp: otp }; }
  await t.sendMail({ from: process.env.FROM_EMAIL || "PlanIt <noreply@planit.com>", to, subject: `${otp} — Your PlanIt code`, html });
  return { devMode: false };
}

export async function sendBookingConfirmation(to, userName, booking, event) {
  const t = transporter();
  const html = wrap("Booking Confirmed 🎉", `
    <p style="color:#4b5563">Hi <strong>${userName}</strong>, you're all set!</p>
    <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0">
      <h3 style="margin:0 0 14px;color:#1a1a2e">${event.title}</h3>
      <table style="width:100%;font-size:14px">
        <tr><td style="padding:5px 0;color:#6b7280">📅 Date</td><td style="font-weight:500">${event.date}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280">🕐 Time</td><td style="font-weight:500">${event.time}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280">📍 Venue</td><td style="font-weight:500">${event.location}, ${event.city}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280">🎫 Tickets</td><td style="font-weight:500">${booking.qty}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280">🔖 Booking ID</td><td style="font-weight:600;color:#6366f1;font-family:monospace">${booking.bookingId}</td></tr>
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px">Host: <strong>${event.hostName || "PlanIt Host"}</strong></p>`);

  if (!t) { console.log(`\n📧 [DEV] Booking confirmation → ${to} (${booking.bookingId})\n`); return; }
  await t.sendMail({ from: process.env.FROM_EMAIL || "PlanIt <noreply@planit.com>", to, subject: `Confirmed: ${event.title}`, html });
}

export async function sendEventNotification(to, userName, event, type, message) {
  const t = transporter();
  const subjects = { update: `Updated: ${event.title}`, cancelled: `Cancelled: ${event.title}`, reminder: `Reminder: ${event.title}`, announcement: `Announcement: ${event.title}` };
  const html = wrap(subjects[type] || "Event Notification", `
    <p style="color:#4b5563">Hi <strong>${userName}</strong>,</p>
    <p style="color:#4b5563">${message}</p>
    <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0">
      <strong style="color:#1a1a2e">${event.title}</strong><br>
      <span style="color:#6b7280;font-size:13px">${event.date} · ${event.time} · ${event.location}</span>
    </div>`);

  if (!t) { console.log(`\n📧 [DEV] ${type} notification → ${to}\n`); return; }
  await t.sendMail({ from: process.env.FROM_EMAIL || "PlanIt <noreply@planit.com>", to, subject: subjects[type] || "PlanIt Notification", html });
}
