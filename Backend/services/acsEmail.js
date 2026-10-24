const crypto = require('crypto');

// Sends email through Azure Communication Services (ACS) Email using its REST API and
// HMAC access-key authentication, so no extra npm dependency is needed.
// Configure with:
//   ACS_EMAIL_CONNECTION_STRING = endpoint=https://<resource>.communication.azure.com/;accesskey=<key>
//   ACS_EMAIL_SENDER            = DoNotReply@<your-azure-managed-domain>.azurecomm.net
const API_VERSION = '2023-03-31';

const parseConnectionString = (connectionString = '') => {
  const parts = Object.fromEntries(
    connectionString.split(';').filter(Boolean).map((part) => {
      const index = part.indexOf('=');
      return [part.slice(0, index).trim().toLowerCase(), part.slice(index + 1).trim()];
    })
  );
  return { endpoint: parts.endpoint, accessKey: parts.accesskey };
};

const isAcsConfigured = () =>
  Boolean(process.env.ACS_EMAIL_CONNECTION_STRING && process.env.ACS_EMAIL_SENDER);

// "Name <address>" or "address" -> address
const extractAddress = (value = '') => {
  const match = String(value).match(/<([^>]+)>/);
  return (match ? match[1] : String(value)).trim();
};

const sendAcsEmail = async ({ to, subject, text, html }) => {
  const { endpoint, accessKey } = parseConnectionString(process.env.ACS_EMAIL_CONNECTION_STRING);
  const url = new URL(`/emails:send?api-version=${API_VERSION}`, endpoint);

  const body = JSON.stringify({
    senderAddress: process.env.ACS_EMAIL_SENDER,
    recipients: { to: [{ address: extractAddress(to) }] },
    content: {
      subject,
      ...(text ? { plainText: text } : {}),
      ...(html ? { html } : {})
    }
  });

  const date = new Date().toUTCString();
  const contentHash = crypto.createHash('sha256').update(body, 'utf8').digest('base64');
  const stringToSign = `POST\n${url.pathname}${url.search}\n${date};${url.host};${contentHash}`;
  const signature = crypto
    .createHmac('sha256', Buffer.from(accessKey, 'base64'))
    .update(stringToSign, 'utf8')
    .digest('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ms-date': date,
      'x-ms-content-sha256': contentHash,
      Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`
    },
    body
  });

  if (response.status !== 202) {
    const detail = await response.text();
    throw new Error(`ACS email request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const result = await response.json().catch(() => ({}));
  return { messageId: result.id || response.headers.get('x-ms-request-id') };
};

module.exports = { isAcsConfigured, sendAcsEmail };
