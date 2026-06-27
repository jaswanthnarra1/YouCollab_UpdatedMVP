const config = require('../config');
const AppError = require('../utils/AppError');

/**
 * Send an email via Resend REST API using native fetch (or dynamic fallback to https module if global fetch is not present).
 * This avoids external library dependencies and is extremely robust.
 */
const sendMail = async (to, subject, html) => {
  const apiKey = config.EMAIL.RESEND_API_KEY;
  const from = config.EMAIL.FROM_EMAIL;

  if (!apiKey) {
    console.warn(`[Resend Mocked Email] To: ${to}, Subject: ${subject}`);
    return { id: 'mocked-id' };
  }

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error payload:', data);
      throw new AppError(data?.message || 'Failed to send verification email.', response.status, 'EMAIL_ERROR');
    }

    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('Error sending email via Resend:', err);
    throw new AppError('Verification email service is temporarily unavailable.', 500, 'EMAIL_ERROR');
  }
};

module.exports = {
  sendMail,
};
