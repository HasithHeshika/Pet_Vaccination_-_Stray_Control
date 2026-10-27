// Drops the e2e database, then starts the real backend (Backend/server.js) against it
const path = require('node:path');
const { spawn } = require('node:child_process');
const { API_PORT, WEB_URL, MONGO_URI, ADMIN } = require('./ports');

const backend = path.join(__dirname, '..', '..', 'Backend');
const mongoose = require(path.join(backend, 'node_modules', 'mongoose'));

(async () => {
  if (!/test/i.test(new URL(MONGO_URI).pathname)) {
    throw new Error(`Refusing to drop ${MONGO_URI}: the database name must contain "test"`);
  }
  await mongoose.connect(MONGO_URI);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();

  const server = spawn(process.execPath, [path.join(backend, 'server.js')], {
    cwd: backend,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(API_PORT),
      MONGODB_URI: MONGO_URI,
      MONGO_URI,
      JWT_SECRET: 'e2e-secret',
      ADMIN_EMAIL: ADMIN.email,
      ADMIN_PASSWORD: ADMIN.password,
      FRONTEND_URL: WEB_URL,
      CORS_ORIGINS: WEB_URL,
      SMTP_HOST: '',
      SMTP_USER: '',
      ACS_EMAIL_CONNECTION_STRING: '',
      ACS_EMAIL_SENDER: '',
      NODE_ENV: 'test'
    }
  });
  const stop = () => server.kill();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  process.on('exit', stop);
  server.on('exit', (code) => process.exit(code ?? 0));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
