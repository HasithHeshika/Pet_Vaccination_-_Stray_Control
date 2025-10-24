# Common Frontend Issues and Solutions

## Issue: 500 Internal Server Error on Login

### Symptoms
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
api/auth/login:1
```

### Root Cause
The `proxy` setting in `frontend/package.json` was pointing to the wrong backend port.

### Solution ✅ (Already Fixed)
Updated `frontend/package.json`:
```json
{
  "proxy": "http://backend:5000"
}
```

**Note:** In Docker, we use the service name `backend` instead of `localhost` because containers communicate via Docker network names.

### If Running Manually (Not Docker)
If you're running the app manually without Docker, the proxy should be:
```json
{
  "proxy": "http://localhost:5000"
}
```

---

## React Router Future Flag Warnings

### Warning 1: v7_startTransition
```
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates 
in `React.startTransition` in v7.
```

### Warning 2: v7_relativeSplatPath
```
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes 
is changing in v7.
```

### What Are These?
These are **not errors** - they're just informational warnings about future React Router changes. Your app works fine!

### Should You Fix Them?
**Not urgent!** These warnings won't affect functionality. But if you want to silence them:

#### Option 1: Add Future Flags (Recommended for Long-term)

Update `frontend/src/App.jsx`:

```jsx
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      {/* Your routes */}
    </BrowserRouter>
  );
}
```

#### Option 2: Ignore the Warnings (Quick Fix)

These warnings don't affect functionality, so you can safely ignore them until you're ready to upgrade to React Router v7.

---

## Common API Connection Issues

### Issue: Frontend Can't Connect to Backend

**Symptoms:**
- Network errors in browser console
- "Failed to fetch" errors
- CORS errors

**Solutions:**

#### Running with Docker:
1. **Check proxy in `package.json`:**
   ```json
   {
     "proxy": "http://backend:5000"
   }
   ```

2. **Restart frontend container:**
   ```bash
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

#### Running Manually:
1. **Check proxy in `package.json`:**
   ```json
   {
     "proxy": "http://localhost:5000"
   }
   ```

2. **Make sure backend is running:**
   ```bash
   cd backend && npm run dev
   ```

3. **Restart frontend:**
   ```bash
   cd frontend && npm start
   ```

---

## CORS Errors

### Symptoms
```
Access to XMLHttpRequest at 'http://localhost:5000/api/auth/login' from origin 
'http://localhost:3000' has been blocked by CORS policy
```

### Cause
Backend CORS not properly configured.

### Solution
The backend already has CORS enabled in `backend/server.js`:
```javascript
app.use(cors());
```

If you still get CORS errors:

1. **Make sure backend is running:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs backend
   ```

2. **Check backend CORS configuration:**
   ```bash
   # Should see: app.use(cors());
   grep -n "cors" backend/server.js
   ```

3. **Restart both services:**
   ```bash
   docker-compose -f docker-compose.dev.yml restart backend frontend
   ```

---

## Network Tab Shows 404 Errors

### Symptoms
Browser network tab shows 404 for API calls like `/api/auth/login`

### Cause
Proxy not configured or backend not running.

### Solution

1. **Verify backend is running:**
   ```bash
   curl http://localhost:5000/
   # Should return: {"message":"Pet Management System API is running"}
   ```

2. **Check frontend proxy:**
   ```bash
   grep proxy frontend/package.json
   ```

3. **Restart frontend:**
   ```bash
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

---

## React Warnings in Console

### Warning: useEffect Missing Dependencies

```
Line 16:6:  React Hook useEffect has a missing dependency: 'fetchMyPets'. 
Either include it or remove the dependency array  react-hooks/exhaustive-deps
```

**What it means:** React is suggesting you add a function to the useEffect dependency array.

**Is it critical?** No, these are linting warnings, not errors. Your app works fine.

**How to fix (if you want):**

```jsx
// Option 1: Add to dependency array
useEffect(() => {
  fetchMyPets();
}, [fetchMyPets]); // Add here

// Option 2: Wrap function in useCallback
const fetchMyPets = useCallback(async () => {
  // function body
}, [/* dependencies */]);

// Option 3: Disable eslint for that line
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  fetchMyPets();
}, []);
```

---

## Debugging API Calls

### Check Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try to login
4. Look at the request:
   - **URL:** Should be `/api/auth/login` (proxied to backend)
   - **Method:** POST
   - **Status:** Should be 200
   - **Response:** Should contain token

### Common Issues:

| Status | Meaning | Solution |
|--------|---------|----------|
| 404 | Route not found | Check proxy configuration |
| 500 | Server error | Check backend logs |
| 401 | Unauthorized | Check credentials |
| 0 (Failed) | No connection | Backend not running |

---

## Testing the Backend Directly

To verify backend is working:

```bash
# Test health endpoint
curl http://localhost:5000/

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@petmanagement.com","password":"Admin@123"}'
```

---

## Quick Diagnostics

### Is everything running?
```bash
docker-compose -f docker-compose.dev.yml ps
```

Should show 3 containers: mongodb, backend, frontend - all "Up"

### Check backend logs:
```bash
docker-compose -f docker-compose.dev.yml logs backend --tail 50
```

### Check frontend logs:
```bash
docker-compose -f docker-compose.dev.yml logs frontend --tail 50
```

### Test backend connection:
```bash
curl http://localhost:5000/
```

### Test frontend connection:
```bash
curl http://localhost:3000/
```

---

## Complete Reset

If nothing works, do a complete reset:

```bash
# 1. Stop everything
docker-compose -f docker-compose.dev.yml down

# 2. Clean up
docker system prune -f

# 3. Start fresh
docker-compose -f docker-compose.dev.yml up -d --build

# 4. Watch logs
docker-compose -f docker-compose.dev.yml logs -f
```

---

## Summary of Fixes Applied

✅ **Fixed proxy configuration** in `frontend/package.json`:
- Changed from `http://localhost:3001` to `http://backend:5000`
- This allows frontend to properly communicate with backend in Docker

✅ **Verified backend is running** and responding correctly

✅ **Documented React Router warnings** (informational only, not errors)

---

## Need More Help?

1. Check the logs:
   ```bash
   make dev-logs
   ```

2. Verify services are running:
   ```bash
   make ps
   ```

3. Test endpoints manually:
   ```bash
   curl http://localhost:5000/
   curl http://localhost:3000/
   ```

4. See other troubleshooting guides:
   - [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
   - [MONGODB_CONNECTION_GUIDE.md](./MONGODB_CONNECTION_GUIDE.md)
   - [DOCKER_CHEATSHEET.md](./DOCKER_CHEATSHEET.md)
