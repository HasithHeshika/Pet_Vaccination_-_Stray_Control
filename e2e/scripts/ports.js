// Fixed local ports and the throwaway database used by the end-to-end tests
const API_PORT = 5077;
const WEB_PORT = 3077;

module.exports = {
  API_PORT,
  WEB_PORT,
  API_URL: `http://127.0.0.1:${API_PORT}`,
  WEB_URL: `http://127.0.0.1:${WEB_PORT}`,
  MONGO_URI: process.env.E2E_MONGODB_URI || 'mongodb://127.0.0.1:27077/pet_e2e_test',
  ADMIN: { email: 'admin@e2e.local', password: 'Admin@E2e123' }
};
