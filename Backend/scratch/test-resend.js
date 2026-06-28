/**
 * Test Resend email delivery
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

console.log('=== Resend Email Diagnostic ===');
console.log('API Key:', RESEND_API_KEY ? `${RESEND_API_KEY.slice(0, 12)}...` : 'MISSING');
console.log('From Email:', FROM_EMAIL);
console.log('');

async function testResend() {
  // Test 1: Send to Resend's test address (always works if API key is valid)
  console.log('--- Test 1: Send test email via Resend ---');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ['delivered@resend.dev'],
        subject: 'YouCollab Test Email',
        html: '<h1>Test</h1><p>This is a test email from YouCollab.</p>',
      }),
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('PASS: Resend can send emails!');
    } else {
      console.error('FAIL: Resend rejected the request');
      console.error('  This usually means the FROM domain is not verified in Resend');
      console.error('  Or the API key is invalid');
      
      // Try with Resend's default sender
      console.log('');
      console.log('--- Test 1b: Try with Resend default sender ---');
      const response2 = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: ['delivered@resend.dev'],
          subject: 'YouCollab Test Email',
          html: '<h1>Test</h1><p>This is a test email from YouCollab.</p>',
        }),
      });
      const data2 = await response2.json();
      console.log('Response status:', response2.status);
      console.log('Response body:', JSON.stringify(data2, null, 2));
      if (response2.ok) {
        console.log('PASS: Resend works with default sender!');
        console.log('  ACTION: Use "onboarding@resend.dev" as FROM_EMAIL until youCollab.com domain is verified');
      }
    }
  } catch (e) {
    console.error('FAIL: Resend fetch failed:', e.message);
  }
}

testResend().catch(console.error);
