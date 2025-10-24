#!/bin/bash

# Docker Setup Validation Script
# This script validates that all necessary Docker files are in place

echo "🐳 Validating Docker Setup for Pet Vaccination & Stray Control System"
echo "======================================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation status
ALL_VALID=true

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        ALL_VALID=false
        return 1
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        return 0
    else
        echo -e "${RED}✗${NC} $1/ (missing)"
        ALL_VALID=false
        return 1
    fi
}

echo "Checking Docker configuration files..."
echo "--------------------------------------"
check_file "docker-compose.yml"
check_file "docker-compose.dev.yml"
check_file "docker-compose.override.yml.example"
check_file ".dockerignore"
check_file ".env.example"
check_file "Makefile"
echo ""

echo "Checking Backend Docker files..."
echo "--------------------------------------"
check_file "backend/Dockerfile"
check_file "backend/Dockerfile.dev"
check_file "backend/.dockerignore"
echo ""

echo "Checking Frontend Docker files..."
echo "--------------------------------------"
check_file "frontend/Dockerfile"
check_file "frontend/Dockerfile.dev"
check_file "frontend/.dockerignore"
check_file "frontend/nginx.conf"
echo ""

echo "Checking Documentation files..."
echo "--------------------------------------"
check_file "README.md"
check_file "README.Docker.md"
check_file "DOCKER_CHEATSHEET.md"
check_file "DOCKER_SETUP_SUMMARY.md"
echo ""

echo "Checking Application files..."
echo "--------------------------------------"
check_file "backend/package.json"
check_file "backend/server.js"
check_file "frontend/package.json"
check_file "frontend/public/index.html"
echo ""

echo "Checking for .env file..."
echo "--------------------------------------"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    # Check for required environment variables
    echo ""
    echo "Checking .env file contents..."
    
    required_vars=("MONGO_ROOT_USERNAME" "MONGO_ROOT_PASSWORD" "JWT_SECRET" "ADMIN_EMAIL" "ADMIN_PASSWORD")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env 2>/dev/null; then
            value=$(grep "^$var=" .env | cut -d '=' -f2)
            if [ -n "$value" ]; then
                echo -e "${GREEN}✓${NC} $var is set"
            else
                echo -e "${YELLOW}⚠${NC} $var is defined but empty"
            fi
        else
            echo -e "${RED}✗${NC} $var is not defined"
            ALL_VALID=false
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} .env file not found (will be created from .env.example)"
    echo "  Run: cp .env.example .env"
fi
echo ""

echo "Checking Docker installation..."
echo "--------------------------------------"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓${NC} Docker is installed: $DOCKER_VERSION"
else
    echo -e "${RED}✗${NC} Docker is not installed"
    echo "  Please install Docker from: https://www.docker.com/get-started"
    ALL_VALID=false
fi

if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✓${NC} Docker Compose is installed: $COMPOSE_VERSION"
else
    echo -e "${RED}✗${NC} Docker Compose is not installed"
    echo "  Please install Docker Compose"
    ALL_VALID=false
fi
echo ""

echo "Checking Make installation..."
echo "--------------------------------------"
if command -v make &> /dev/null; then
    MAKE_VERSION=$(make --version | head -n 1)
    echo -e "${GREEN}✓${NC} Make is installed: $MAKE_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Make is not installed (optional, but recommended)"
    echo "  Install with: sudo apt-get install make (Ubuntu/Debian)"
    echo "  You can still use docker-compose commands directly"
fi
echo ""

echo "======================================================================"
if [ "$ALL_VALID" = true ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. If .env doesn't exist: cp .env.example .env"
    echo "2. Edit .env and update configuration values"
    echo "3. Start development environment: make dev-up"
    echo "   Or: docker-compose -f docker-compose.dev.yml up -d"
    echo ""
    echo "For more information, see:"
    echo "  - README.Docker.md (detailed documentation)"
    echo "  - DOCKER_CHEATSHEET.md (quick reference)"
    echo "  - make help (list of available commands)"
else
    echo -e "${RED}✗ Some validations failed. Please fix the issues above.${NC}"
    exit 1
fi
