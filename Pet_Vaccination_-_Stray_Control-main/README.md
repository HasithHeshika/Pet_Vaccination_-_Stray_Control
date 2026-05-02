# Pet Vaccination & Stray Control System

A comprehensive MERN stack application for managing pet ownership records, vaccination schedules, and QR-based pet identification. This system provides a robust solution for tracking pets, managing stray reports, and facilitating administrative control over pet registrations.

---

## 📑 Table of Contents
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started (Docker)](#getting-started-docker-recommended)
- [Manual Setup](#manual-setup)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- **User Authentication**: Secure Login/Signup with JWT.
- **Role-Based Access**: Separation of Admin and User roles.
- **Admin Dashboard**: Comprehensive user and pet management.
- **Pet Registration**: Admin-only pet registration system.
- **QR Code Integration**: Unique QR code generation and downloading for each pet.
- **User Dashboard**: Personalized view of registered pets and their details.
- **Vaccination Tracking**: Schedule and monitor vaccination records.
- **Stray Reporting**: Built-in mechanisms to report and manage stray animals.

---

## 🛠 Technologies Used

### Backend
- **Node.js** & **Express.js** - RESTful API framework
- **MongoDB** & **Mongoose** - NoSQL database and object modeling
- **JWT** (JSON Web Tokens) - Authentication
- **Bcrypt.js** - Password hashing
- **QRCode** - QR generation library

### Frontend
- **React.js** - UI framework
- **React Router** - Navigation
- **Axios** - HTTP client
- **Context API** - State management

---

## 📁 Project Structure

```text
pet-management-system/
├── Backend/          # Node.js + Express API
│   ├── config/       # Database configuration
│   ├── controllers/  # Route controllers
│   ├── middleware/   # Authentication & validation
│   ├── models/       # Mongoose schemas
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   ├── utils/        # Helper functions
│   └── server.js     # Entry point
├── Frontend/         # React Application
│   ├── public/       # Static assets
│   └── src/          # React source code
│       ├── api/      # API configurations
│       ├── components/ # React components
│       ├── context/  # State management
│       └── utils/    # Helper functions
├── docker-compose.yml     # Production Docker configuration
├── docker-compose.dev.yml # Development Docker configuration
└── Makefile               # Task automation
```

---

## 📦 Prerequisites

Choose one of the following methods to run the project. Docker is highly recommended for a seamless setup.

### Option 1: Docker (Recommended)
- [Docker](https://www.docker.com/get-started)
- Docker Compose (included with Docker Desktop)

### Option 2: Manual Setup
- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Running locally on port 27017)

---

## 🐳 Getting Started (Docker - Recommended)

The easiest way to run the project is using the provided Docker configuration.

### 1. Environment Setup
Copy the example environment file and update the variables if necessary:
```bash
cp .env.example .env
```

### 2. Start the Application

**Using Make (Easiest):**
```bash
# Development mode with hot-reload (Frontend on 3000, Backend on 5001)
make dev-up

# Production mode (Frontend on 80 mapped to 3000, Backend on 5000)
make prod-up
```

**Using Docker Compose Directly:**
```bash
# Development mode
docker-compose -f docker-compose.dev.yml up -d

# Production mode
docker-compose up -d
```

### 3. Access the System
- **Frontend (UI):** http://localhost:3000
- **Backend (API):** http://localhost:5000 (or 5001 in dev mode)

### 4. Stopping the Application
```bash
make dev-down    # Or make prod-down
# OR
docker-compose down
```

---

## 💻 Manual Setup

If you prefer to run the project without Docker, follow these steps:

### 1. Backend Setup
1. Open a terminal and navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure MongoDB is running locally (`mongodb://localhost:27017`).
4. Start the backend server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

---

## 📘 Usage Guide

### Default Admin Credentials
- **Email:** `admin@petmanagement.com`
- **Password:** `Admin@123`
*(Make sure to change these in the `.env` file before deploying to production!)*

### Workflows
1. **User Registration:** Users can sign up via the frontend portal providing necessary details.
2. **Admin Verification:** Log in as an Admin to view registered users.
3. **Pet Registration:** Admins register pets under specific users, filling in medical and biological details.
4. **QR Generation:** A unique QR code is automatically generated for the pet, which can be downloaded by both the user and the admin.

---

## 🔌 API Documentation

### Authentication (`/api/auth`)
- `POST /signup` - Register new user
- `POST /login` - Authenticate user & get token
- `GET /me` - Get current authenticated user

### Users (`/api/users`) - *Admin Only*
- `GET /` - Retrieve all users
- `GET /:id` - Retrieve user by ID
- `GET /:id/pets` - Retrieve specific user's pets

### Pets (`/api/pets`)
- `POST /register` - Register a new pet *(Admin Only)*
- `GET /` - Retrieve all pets *(Admin Only)*
- `GET /:id` - Retrieve pet by DB ID
- `GET /petid/:petId` - Retrieve pet by System Pet ID (used for QR scanning)

---

## 🔧 Troubleshooting

### Port Conflicts
- If `localhost:3000` or `localhost:5000` is already in use, you can update the ports in your `.env` file or stop the conflicting services.

### MongoDB Connection Issues
- Ensure your MongoDB container is running (`docker ps`) or your local instance is active.
- Verify the connection string in `docker-compose.yml` or `Backend/.env`.

### General Docker Issues
Use the provided Makefile to clean up your environment:
```bash
make clean      # Removes all containers and volumes
make clean-all  # Removes containers, volumes, and images
```