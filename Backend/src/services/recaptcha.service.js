const config = require('../config');

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Verify a reCAPTCHA v2 token with Google's siteverify API.
 * @param {string} token - the client-side widget's response token
 * @param {string} [remoteIp] - the requester's IP, improves Google's scoring
 * @returns {Promise<{ success: boolean, errorCodes: string[] }>}
 */
const verifyRecaptchaToken = async (token, remoteIp) => {
  const params = new URLSearchParams({
    secret: config.RECAPTCHA.SECRET_KEY,
    response: token,
  });
  if (remoteIp) params.set('remoteip', remoteIp);

  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    return { success: false, errorCodes: ['verification-request-failed'] };
  }

  const data = await res.json();
  return { success: !!data.success, errorCodes: data['error-codes'] || [] };
};

module.exports = { verifyRecaptchaToken };
