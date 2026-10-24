// Public URL of the web frontend, used in QR codes and email links.
// Set FRONTEND_URL in each environment (e.g. http://localhost:3000 for local development).
const DEFAULT_FRONTEND_URL = 'https://lively-sky-055ae2000.7.azurestaticapps.net';

const getFrontendUrl = () => (process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');

module.exports = { getFrontendUrl };
