const config = require('../config');
const emailService = require('./email.service');

const escapeHtml = (str) =>
  str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Send a contact form submission to the support inbox.
 */
const sendContactMessage = async ({ name, email, message }) => {
  const to = config.EMAIL.GMAIL_USER || 'support@youcollab.in';

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">New contact form message</h2>
      <p style="font-size: 14px; color: #475569;"><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
      <div style="background-color: #f1f5f9; border-radius: 6px; padding: 16px; margin-top: 16px; white-space: pre-wrap; font-size: 14px; color: #1e293b;">${escapeHtml(message)}</div>
    </div>
  `;

  await emailService.sendMail(to, `Contact form: ${name}`, htmlContent);

  return { message: "Thanks for reaching out — we'll get back to you soon." };
};

module.exports = { sendContactMessage };
