# Troubleshooting Guide

## Common Issues and Solutions

### 1. "ECONNREFUSED 127.0.0.1:27017" Error

**Problem:** Backend cannot connect to MongoDB.

**Cause:** This happens when:
- Running the app manually (not with Docker) and MongoDB is not installed/running locally
- Mixed setup: trying to use Docker MongoDB with manually running backend

**Solutions:**

#### Option A: Use Docker (Recommended)
```bash
# Make sure you're using Docker for everything
make dev-up

# Or
docker-compose -f docker-compose.dev.yml up -d
```

#### Option B: Run Manually (All Services)
If you want to run without Docker:

1. **Install MongoDB locally:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb
   sudo systemctl start mongodb
   
   # Or use MongoDB Compass and start MongoDB server
   ```

2. **Update backend/.env:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/pet_management
   ```

3. **Start backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Start frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

**Important:** Don't mix Docker and manual setup - use one or the other!

---

### 2. "Invalid reference format" Docker Error

**Problem:** Docker project name contains invalid characters.

**Solution:** Already fixed by adding `name:` to docker-compose files.

---

### 3. Port Already in Use

**Problem:** Port 3000, 5000, or 27017 is already in use.

**Solution:**

**Option A: Change ports in .env:**
```env
FRONTEND_PORT=3001
BACKEND_PORT=5001
MONGO_PORT=27018
```

**Option B: Kill the process using the port:**
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill it
sudo kill -9 <PID>
```

**Option C: Stop Docker containers:**
```bash
make dev-down
# or
docker-compose -f docker-compose.dev.yml down
```

---

### 4. Containers Keep Restarting

**Problem:** Containers won't stay running.

**Solution:**

1. **Check logs:**
   ```bash
   make dev-logs
   # or
   docker-compose -f docker-compose.dev.yml logs
   ```

2. **Common causes:**
   - Missing environment variables in .env
   - Port conflicts
   - Syntax errors in code

---

### 5. Frontend Can't Connect to Backend

**Problem:** API calls from frontend return errors.

**Cause:** Backend is not running or wrong API URL.

**Solution:**

**With Docker:**
- Backend should be accessible at `http://localhost:5000`
- Frontend automatically proxies to backend

**Manual Setup:**
- Ensure backend is running on port 5000
- Check `frontend/package.json` has `"proxy": "http://localhost:5000"`

---

### 6. Database Connection Issues

**Problem:** Backend can't connect to MongoDB.

**Solution:**

**With Docker:**
```bash
# Check MongoDB is running
docker-compose -f docker-compose.dev.yml ps

# Check MongoDB logs
docker-compose -f docker-compose.dev.yml logs mongodb

# Restart MongoDB
docker-compose -f docker-compose.dev.yml restart mongodb
```

**Manual Setup:**
```bash
# Check MongoDB is running
sudo systemctl status mongodb

# Or check with MongoDB Compass
```

---

### 7. Changes Not Reflecting

**Problem:** Code changes don't appear in the running application.

**Solution:**

**With Docker (Development Mode):**
- Changes should auto-reload
- If not, check volumes are mounted correctly
- Try restarting: `make dev-restart`

**With Docker (Production Mode):**
- Need to rebuild: `docker-compose down && docker-compose up -d --build`

**Manual Setup:**
- Should auto-reload with nodemon (backend) and React dev server (frontend)

---

### 8. Permission Denied Errors

**Problem:** Can't create files or access Docker socket.

**Solution:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then test
docker ps
```

---

### 9. Out of Disk Space

**Problem:** Docker build fails with "no space left on device".

**Solution:**

```bash
# Clean up Docker
docker system prune -a --volumes

# Remove specific volumes
docker volume rm pet-management-system-dev_mongodb_data_dev
```

---

### 10. Environment Variables Not Working

**Problem:** Application doesn't use values from .env file.

**Solution:**

**With Docker:**
1. Ensure `.env` is in the root directory (same level as docker-compose.yml)
2. Restart containers after changing .env:
   ```bash
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up -d
   ```

**Manual Setup:**
1. Backend uses `backend/.env`
2. Frontend uses environment variables at build time
3. Restart servers after changing .env

---

## Quick Diagnostic Commands

### Check if services are running:
```bash
# Docker
docker-compose -f docker-compose.dev.yml ps

# Manual
ps aux | grep node
```

### Check logs:
```bash
# Docker - All services
make dev-logs

# Docker - Specific service
docker-compose -f docker-compose.dev.yml logs backend
docker-compose -f docker-compose.dev.yml logs frontend
docker-compose -f docker-compose.dev.yml logs mongodb
```

### Check network connectivity:
```bash
# Test backend
curl http://localhost:5000/

# Test frontend
curl http://localhost:3000/

# Test MongoDB (with Docker)
docker-compose -f docker-compose.dev.yml exec mongodb mongosh -u admin -p admin123
```

### Check Docker resources:
```bash
# Disk usage
docker system df

# Container stats
docker stats
```

---

## Getting Help

### Before asking for help, gather:

1. **Error messages** from logs
2. **Container status**:
   ```bash
   docker-compose -f docker-compose.dev.yml ps
   ```
3. **Docker version**:
   ```bash
   docker --version
   docker-compose --version
   ```
4. **Environment info**:
   ```bash
   cat .env (sanitize sensitive data)
   ```

### Useful commands for troubleshooting:

```bash
# Full system check
./validate-docker-setup.sh

# View all logs
make dev-logs

# Access container shell
docker-compose -f docker-compose.dev.yml exec backend sh

# Check environment variables in container
docker-compose -f docker-compose.dev.yml exec backend env
```

---

## Complete Fresh Start

If nothing works, start fresh:

```bash
# 1. Stop everything
make dev-down
docker-compose down -v

# 2. Clean Docker
docker system prune -a --volumes

# 3. Remove node_modules
rm -rf backend/node_modules frontend/node_modules

# 4. Start fresh
make dev-up

# 5. Check logs
make dev-logs
```

---

## Switching Between Docker and Manual Setup

### Currently Using Docker, Want to Use Manual:

```bash
# 1. Stop Docker containers
make dev-down

# 2. Start MongoDB locally
sudo systemctl start mongodb

# 3. Update backend/.env
# Change MONGODB_URI to mongodb://localhost:27017/pet_management

# 4. Start backend manually
cd backend && npm run dev

# 5. Start frontend manually
cd frontend && npm start
```

### Currently Using Manual, Want to Use Docker:

```bash
# 1. Stop manual services (Ctrl+C in terminals)

# 2. Start with Docker
make dev-up

# 3. Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

---

## Version Compatibility

- **Node.js:** v14 or higher (v18 recommended)
- **Docker:** 20.10 or higher
- **Docker Compose:** 2.0 or higher
- **MongoDB:** 7.0 (in Docker) or 4.4+ (manual)

---

## Still Having Issues?

1. Check the documentation:
   - [QUICKSTART.md](./QUICKSTART.md)
   - [README.Docker.md](./README.Docker.md)
   - [DOCKER_CHEATSHEET.md](./DOCKER_CHEATSHEET.md)

2. Run validation:
   ```bash
   ./validate-docker-setup.sh
   ```

3. Check logs carefully - they usually contain the exact error

4. Try the "Complete Fresh Start" section above
