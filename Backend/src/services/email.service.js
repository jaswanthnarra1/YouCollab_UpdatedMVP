const config = require('../config');
const logger = require('../utils/logger');

/**
 * Send an email using Resend API.
 * Defaults to stub logging in development environment to avoid external setup block.
 */
const sendEmail = async ({ to, subject, html }) => {
  if (!config.EMAIL.RESEND_API_KEY || config.NODE_ENV === 'development') {
    logger.info(`[Email Stub] Sent successfully to: ${to} | Subject: "${subject}"`);
    return { success: true, stub: true };
  }

  try {
    // Dynamic import to avoid loading fetch if not needed
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.EMAIL.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: config.EMAIL.FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      logger.error('Resend email API failure:', data);
      return { success: false, error: data };
    }

    logger.info(`Email successfully dispatched via Resend: ${data.id}`);
    return { success: true, id: data.id };
  } catch (error) {
    logger.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
};
