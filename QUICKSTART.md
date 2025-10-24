# 🚀 Quick Start Guide

Get the Pet Vaccination & Stray Control System running in under 5 minutes!

## Prerequisites

✅ [Docker](https://www.docker.com/get-started) installed (includes Docker Compose)
✅ [Git](https://git-scm.com/) (optional, for cloning)

**That's it!** No need to install Node.js, MongoDB, or any other dependencies.

## 3-Step Quick Start

### Step 1: Clone or Download
```bash
git clone <repository-url>
cd Pet_Vaccination_-_Stray_Control
```

### Step 2: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# (Optional) Edit .env if you want to customize settings
nano .env
```

### Step 3: Start the Application
```bash
# Option A: Using Make (Recommended)
make dev-up

# Option B: Using Docker Compose directly
docker-compose -f docker-compose.dev.yml up -d
```

## 🎉 Done!

The application is now running:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **MongoDB:** localhost:27017

## Default Login Credentials

**Admin Account:**
- Email: `admin@petmanagement.com`
- Password: `Admin@123`

## Common Commands

### View Logs
```bash
make dev-logs              # See all logs
make dev-logs backend      # See backend logs only
```

### Stop the Application
```bash
make dev-down
```

### Restart Services
```bash
make dev-restart
```

### Access Database
```bash
make mongodb-sh
```

### View Container Status
```bash
make ps
```

### See All Available Commands
```bash
make help
```

## What's Running?

When you start the application, Docker automatically:
1. ✅ Starts MongoDB database
2. ✅ Creates database with initial schema
3. ✅ Creates default admin user
4. ✅ Starts backend API server
5. ✅ Starts frontend web server
6. ✅ Sets up networking between services

## Troubleshooting

### Port Already in Use?
Edit `.env` and change the ports:
```env
FRONTEND_PORT=3001
BACKEND_PORT=5001
MONGO_PORT=27018
```

Then restart:
```bash
make dev-down
make dev-up
```

### Services Won't Start?
Check the logs:
```bash
make dev-logs
```

### Need a Fresh Start?
```bash
# Stop and remove everything
make dev-down

# Start fresh
make dev-up
```

### Still Having Issues?
Run the validation script:
```bash
./validate-docker-setup.sh
```

## Development Workflow

### Code Changes
- **Backend:** Changes are automatically detected and the server restarts
- **Frontend:** Changes trigger automatic browser refresh

### View Logs in Real-Time
```bash
make dev-logs
```

### Access Container Shell
```bash
make backend-sh    # Backend container
make mongodb-sh    # MongoDB shell
```

## Production Deployment

For production deployment:
```bash
# Start in production mode
make prod-up

# View logs
make prod-logs
```

## Learning More

- **Detailed Documentation:** [README.Docker.md](./README.Docker.md)
- **Command Reference:** [DOCKER_CHEATSHEET.md](./DOCKER_CHEATSHEET.md)
- **Setup Summary:** [DOCKER_SETUP_SUMMARY.md](./DOCKER_SETUP_SUMMARY.md)

## Next Steps

1. **Login** at http://localhost:3000
2. **Create a user account** (Sign Up)
3. **Login as admin** to register pets
4. **Explore the features:**
   - User management
   - Pet registration
   - QR code generation
   - Pet viewing

## Need Help?

1. Check the logs: `make dev-logs`
2. View container status: `make ps`
3. Read the documentation: [README.Docker.md](./README.Docker.md)
4. Run validation: `./validate-docker-setup.sh`

---

**Happy coding! 🎉**

For the complete manual setup without Docker, see the main [README.md](./README.md).
