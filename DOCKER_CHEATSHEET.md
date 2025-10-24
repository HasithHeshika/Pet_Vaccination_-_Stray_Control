# Docker Commands Cheat Sheet

## Quick Reference

### Using Make Commands (Easiest)
```bash
# View all available commands
make help

# Development
make dev-up          # Start development environment
make dev-down        # Stop development environment
make dev-logs        # View development logs
make dev-restart     # Restart development environment

# Production
make prod-up         # Start production environment
make prod-down       # Stop production environment
make prod-logs       # View production logs
make prod-restart    # Restart production environment

# Utilities
make ps              # Show container status
make backend-sh      # Access backend shell
make mongodb-sh      # Access MongoDB shell
make backup-db       # Backup database
make restore-db      # Restore database
make clean           # Clean up everything
```

### Docker Compose Commands

#### Starting Services
```bash
# Development mode (with hot-reload)
docker-compose -f docker-compose.dev.yml up -d

# Production mode
docker-compose up -d

# Build and start
docker-compose up -d --build

# Start without detached mode (see logs)
docker-compose up
```

#### Stopping Services
```bash
# Stop containers
docker-compose down

# Stop and remove volumes (deletes data!)
docker-compose down -v

# Stop and remove everything including images
docker-compose down -v --rmi all
```

#### Viewing Status and Logs
```bash
# List running containers
docker-compose ps

# View logs (all services)
docker-compose logs

# View logs (follow mode)
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# View last 100 lines
docker-compose logs --tail=100
```

#### Managing Specific Services
```bash
# Restart a service
docker-compose restart backend

# Stop a service
docker-compose stop frontend

# Start a service
docker-compose start frontend

# Rebuild a service
docker-compose up -d --build backend

# Scale a service (not applicable for this project)
docker-compose up -d --scale backend=3
```

#### Executing Commands in Containers
```bash
# Access backend shell
docker-compose exec backend sh

# Access frontend shell
docker-compose exec frontend sh

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p admin123

# Run a command
docker-compose exec backend npm install package-name
docker-compose exec backend node --version
```

### Docker Commands

#### Container Management
```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop a container
docker stop pet-management-backend

# Remove a container
docker rm pet-management-backend

# View container logs
docker logs pet-management-backend
docker logs -f pet-management-backend

# Execute command in container
docker exec -it pet-management-backend sh
```

#### Image Management
```bash
# List images
docker images

# Remove an image
docker rmi pet_vaccination_-_stray_control_backend

# Remove unused images
docker image prune

# Remove all unused images
docker image prune -a

# Build an image
docker build -t my-image ./backend
```

#### Volume Management
```bash
# List volumes
docker volume ls

# Inspect a volume
docker volume inspect pet_vaccination_-_stray_control_mongodb_data

# Remove a volume
docker volume rm pet_vaccination_-_stray_control_mongodb_data

# Remove all unused volumes
docker volume prune
```

#### Network Management
```bash
# List networks
docker network ls

# Inspect a network
docker network inspect pet_vaccination_-_stray_control_pet-management-network

# Remove a network
docker network rm pet_vaccination_-_stray_control_pet-management-network
```

#### System Cleanup
```bash
# Remove all stopped containers, unused networks, dangling images
docker system prune

# Remove everything (including unused images)
docker system prune -a

# Remove everything including volumes
docker system prune -a --volumes

# Show disk usage
docker system df
```

### Common Workflows

#### Fresh Start
```bash
# Stop everything
docker-compose down -v

# Rebuild and start
docker-compose up -d --build

# View logs
docker-compose logs -f
```

#### Update After Code Changes

**Development mode (hot-reload automatic):**
```bash
# No action needed - changes are reflected automatically
```

**Production mode:**
```bash
# Rebuild and restart the changed service
docker-compose up -d --build backend

# Or restart all services
docker-compose down
docker-compose up -d --build
```

#### Database Operations

**Backup:**
```bash
# Using Make
make backup-db

# Manual
mkdir -p ./mongodb-backup
docker-compose exec mongodb mongodump -u admin -p admin123 --authenticationDatabase admin -o /backup
docker cp pet-management-mongodb:/backup ./mongodb-backup
```

**Restore:**
```bash
# Using Make
make restore-db

# Manual
docker cp ./mongodb-backup pet-management-mongodb:/backup
docker-compose exec mongodb mongorestore -u admin -p admin123 --authenticationDatabase admin /backup
```

**Access MongoDB Shell:**
```bash
# Using Make
make mongodb-sh

# Manual
docker-compose exec mongodb mongosh -u admin -p admin123

# In MongoDB shell:
show dbs
use pet_management
show collections
db.users.find()
db.pets.find()
```

#### Debugging Issues

**Check service health:**
```bash
docker-compose ps
```

**View all logs:**
```bash
docker-compose logs
```

**View specific service logs:**
```bash
docker-compose logs -f backend
```

**Access container shell:**
```bash
docker-compose exec backend sh
```

**Check environment variables:**
```bash
docker-compose exec backend env
```

**Test backend endpoint:**
```bash
curl http://localhost:5000/
```

**Restart specific service:**
```bash
docker-compose restart backend
```

#### Port Conflicts

If ports are already in use, update `.env`:
```env
FRONTEND_PORT=3001
BACKEND_PORT=5001
MONGO_PORT=27018
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Environment Variables

**View environment variables in container:**
```bash
docker-compose exec backend env | grep MONGODB
```

**Set environment variable:**
```bash
# In .env file
JWT_SECRET=my-new-secret

# Restart services
docker-compose down
docker-compose up -d
```

### Performance Monitoring

**Check resource usage:**
```bash
docker stats
```

**Check specific container:**
```bash
docker stats pet-management-backend
```

**Inspect container:**
```bash
docker inspect pet-management-backend
```

### Networking

**Test connectivity between containers:**
```bash
# From backend to mongodb
docker-compose exec backend ping mongodb

# From frontend to backend
docker-compose exec frontend wget -O- http://backend:5000
```

### Tips and Best Practices

1. **Always use `-d` flag** for detached mode in development
2. **Use `--build` flag** when code changes aren't reflected
3. **Check logs** when something doesn't work
4. **Use volumes** for persistent data (already configured)
5. **Use .env file** for configuration (never commit it!)
6. **Clean up regularly** with `docker system prune`
7. **Use health checks** (already configured in compose files)
8. **Backup database** before major changes
9. **Use development mode** during development for hot-reload
10. **Use production mode** for deployment

### Troubleshooting Commands

```bash
# Service won't start
docker-compose logs backend
docker-compose restart backend

# Database connection issues
docker-compose logs mongodb
docker-compose exec mongodb mongosh -u admin -p admin123

# Port already in use
lsof -i :5000  # Find process using port
kill -9 <PID>   # Kill the process

# Clean slate
docker-compose down -v
docker system prune -a
docker-compose up -d --build

# Check if services are healthy
docker-compose ps
curl http://localhost:5000/
curl http://localhost:3000/
```

### Common Issues and Solutions

**Issue: "Port already in use"**
```bash
# Solution: Change port in .env or stop conflicting service
docker-compose down
# Edit .env to change ports
docker-compose up -d
```

**Issue: "Cannot connect to database"**
```bash
# Solution: Check MongoDB is running and healthy
docker-compose ps
docker-compose logs mongodb
docker-compose restart mongodb
```

**Issue: "Changes not reflected"**
```bash
# Solution: Rebuild the service
docker-compose down
docker-compose up -d --build
```

**Issue: "Out of disk space"**
```bash
# Solution: Clean up Docker
docker system prune -a --volumes
```

**Issue: "Container keeps restarting"**
```bash
# Solution: Check logs for errors
docker-compose logs backend
docker-compose exec backend sh  # Debug inside container
```
