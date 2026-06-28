/**
 * Query Resend domains list to verify domain status.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.RESEND_API_KEY;

async function checkDomains() {
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });
    const data = await res.json();
    console.log('Resend domains status:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching domains:', err.message);
  }
}

checkDomains();
