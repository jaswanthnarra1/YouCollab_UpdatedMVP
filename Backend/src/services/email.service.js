const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Create a reusable Gmail SMTP transporter.
 * Uses an App Password (not your regular Gmail password).
 *
 * Setup steps:
 *  1. Enable 2-Step Verification on your Google account.
 *  2. Go to https://myaccount.google.com/apppasswords
 *  3. Create an App Password for "Mail" → "Other (custom name)"
 *  4. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env / Railway Variables.
 */
const createTransporter = () => {
  const user = config.EMAIL.GMAIL_USER;
  const pass = config.EMAIL.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null; // will mock in dev if not configured
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    // Some hosts throttle or block outbound SMTP entirely — without these,
    // nodemailer's defaults can leave a connection attempt hanging for minutes.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
};

/**
 * Send an email via Gmail SMTP (nodemailer).
 * Falls back to a console log if credentials are not set (dev mode).
 *
 * @param {string|string[]} to   - Recipient email(s)
 * @param {string}          subject
 * @param {string}          html - HTML body
 */
const sendMail = async (to, subject, html) => {
  const transporter = createTransporter();
  const fromName = config.EMAIL.FROM_NAME || 'YouCollab';
  const fromAddr = config.EMAIL.GMAIL_USER || 'noreply@youcollab.in';
  const from = `"${fromName}" <${fromAddr}>`;

  // No credentials configured → mock in development
  if (!transporter) {
    console.warn(`[Gmail Mocked Email] To: ${to}, Subject: ${subject}`);
    return { messageId: 'mocked-id' };
  }

  const info = await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
  });

  console.log(`[Gmail] Email sent: ${info.messageId}`);
  return info;
};

module.exports = { sendMail };
