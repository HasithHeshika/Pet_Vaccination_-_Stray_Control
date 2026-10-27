// Builds the React app into e2e/.web-build, pointed at the local test API (not the live one)
const { execSync } = require('node:child_process');
const path = require('node:path');
const { API_URL } = require('./ports');

execSync('npm run build', {
  cwd: path.join(__dirname, '..', '..', 'Frontend'),
  stdio: 'inherit',
  env: {
    ...process.env,
    REACT_APP_API_URL: API_URL,
    BUILD_PATH: path.join(__dirname, '..', '.web-build'),
    GENERATE_SOURCEMAP: 'false',
    CI: 'false'
  }
});
