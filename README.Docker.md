# Docker Setup Guide

This guide explains how to run the Pet Vaccination & Stray Control System using Docker.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and update the values as needed (especially the JWT_SECRET and admin credentials).

### 2. Production Mode

To run the application in production mode:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (will delete database data)
docker-compose down -v
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

### 3. Development Mode

To run the application in development mode with hot-reload:

```bash
# Build and start all services in development mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

## Available Services

### MongoDB
- Database service running MongoDB 7.0
- Data persisted in Docker volumes
- Default credentials configured in `.env`

### Backend
- Node.js/Express API server
- Automatic admin user creation
- Health checks enabled

### Frontend
- React application
- Production: Served via Nginx
- Development: React development server with hot-reload

## Docker Commands

### View running containers
```bash
docker-compose ps
```

### View logs for specific service
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Restart a specific service
```bash
docker-compose restart backend
```

### Rebuild a service
```bash
docker-compose up -d --build backend
```

### Execute commands in a container
```bash
# Access backend shell
docker-compose exec backend sh

# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p admin123
```

### Clean up everything
```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v

# Remove all unused images
docker image prune -a
```

## Environment Variables

Key environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Application environment | production |
| MONGO_ROOT_USERNAME | MongoDB admin username | admin |
| MONGO_ROOT_PASSWORD | MongoDB admin password | admin123 |
| MONGO_DATABASE | Database name | pet_management |
| BACKEND_PORT | Backend server port | 5000 |
| FRONTEND_PORT | Frontend server port | 3000 |
| JWT_SECRET | JWT signing secret | (must be set) |
| ADMIN_EMAIL | Default admin email | admin@petmanagement.com |
| ADMIN_PASSWORD | Default admin password | Admin@123 |

## Health Checks

All services include health checks:

- **MongoDB**: Checks database connectivity
- **Backend**: Verifies API endpoint
- **Frontend**: Checks Nginx server

View health status:
```bash
docker-compose ps
```

## Volumes

Persistent data is stored in Docker volumes:

- `mongodb_data`: MongoDB database files
- `mongodb_config`: MongoDB configuration

To backup the database:
```bash
docker-compose exec mongodb mongodump -u admin -p admin123 --authenticationDatabase admin -o /backup
docker cp pet-management-mongodb:/backup ./mongodb-backup
```

To restore the database:
```bash
docker cp ./mongodb-backup pet-management-mongodb:/backup
docker-compose exec mongodb mongorestore -u admin -p admin123 --authenticationDatabase admin /backup
```

## Troubleshooting

### Port already in use
If you get a port conflict error, change the ports in `.env`:
```
FRONTEND_PORT=3001
BACKEND_PORT=5001
MONGO_PORT=27018
```

### Services won't start
Check logs for errors:
```bash
docker-compose logs
```

### Database connection issues
Ensure MongoDB is healthy before backend starts:
```bash
docker-compose ps
```

### Clear everything and restart
```bash
docker-compose down -v
docker-compose up -d --build
```

## Production Deployment

For production deployment:

1. Update `.env` with secure credentials
2. Set a strong JWT_SECRET (minimum 32 characters)
3. Use strong MongoDB passwords
4. Consider using Docker secrets for sensitive data
5. Set up proper reverse proxy (nginx/traefik) with SSL
6. Configure backup strategy for MongoDB volume
7. Set up monitoring and logging

## Security Notes

- Never commit `.env` file to version control
- Change default passwords in production
- Use strong JWT secrets
- Enable firewall rules for exposed ports
- Regularly update Docker images
- Monitor container logs for suspicious activity

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
