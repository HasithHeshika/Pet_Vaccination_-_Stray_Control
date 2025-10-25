.PHONY: help build up down restart logs clean dev-build dev-up dev-down dev-logs prod-build prod-up prod-down prod-logs

# Default target
help:
	@echo "Pet Vaccination & Stray Control System - Docker Commands"
	@echo ""
	@echo "Development Mode:"
	@echo "  make dev-build    - Build development containers"
	@echo "  make dev-up       - Start development environment"
	@echo "  make dev-down     - Stop development environment"
	@echo "  make dev-logs     - View development logs"
	@echo "  make dev-restart  - Restart development environment"
	@echo ""
	@echo "Production Mode:"
	@echo "  make prod-build   - Build production containers"
	@echo "  make prod-up      - Start production environment"
	@echo "  make prod-down    - Stop production environment"
	@echo "  make prod-logs    - View production logs"
	@echo "  make prod-restart - Restart production environment"
	@echo ""
	@echo "General Commands:"
	@echo "  make setup        - Initial setup (create .env file)"
	@echo "  make clean        - Remove all containers, volumes, and images"
	@echo "  make ps           - Show running containers"
	@echo "  make backend-sh   - Access backend container shell"
	@echo "  make mongodb-sh   - Access MongoDB shell"
	@echo "  make backup-db    - Backup MongoDB database"
	@echo "  make restore-db   - Restore MongoDB database"

# Initial setup
setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env file. Please update it with your configuration."; \
	else \
		echo ".env file already exists."; \
	fi

# Development commands
dev-build:
	docker-compose -f docker-compose.dev.yml build

dev-up: setup
	docker-compose -f docker-compose.dev.yml up -d

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-restart:
	docker-compose -f docker-compose.dev.yml restart

# Production commands
prod-build:
	docker-compose build

prod-up: setup
	docker-compose up -d

prod-down:
	docker-compose down

prod-logs:
	docker-compose logs -f

prod-restart:
	docker-compose restart

# Aliases for common use (defaults to production)
build: prod-build
up: prod-up
down: prod-down
logs: prod-logs
restart: prod-restart

# Show container status
ps:
	docker-compose ps

# Access container shells
backend-sh:
	docker-compose exec backend sh

frontend-sh:
	docker-compose exec frontend sh

mongodb-sh:
	docker-compose exec mongodb mongosh -u admin -p admin123

# Database backup and restore
backup-db:
	@mkdir -p ./mongodb-backup
	docker-compose exec mongodb mongodump -u admin -p admin123 --authenticationDatabase admin -o /backup
	docker cp pet-management-mongodb:/backup ./mongodb-backup
	@echo "Database backed up to ./mongodb-backup"

restore-db:
	@if [ -d "./mongodb-backup" ]; then \
		docker cp ./mongodb-backup pet-management-mongodb:/backup; \
		docker-compose exec mongodb mongorestore -u admin -p admin123 --authenticationDatabase admin /backup; \
		echo "Database restored from ./mongodb-backup"; \
	else \
		echo "Error: ./mongodb-backup directory not found"; \
	fi

# Clean up everything
clean:
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	docker system prune -f
	@echo "Cleaned up all containers, volumes, and unused images"

# Clean up with images
clean-all:
	docker-compose down -v --rmi all
	docker-compose -f docker-compose.dev.yml down -v --rmi all
	docker system prune -af
	@echo "Cleaned up everything including images"
