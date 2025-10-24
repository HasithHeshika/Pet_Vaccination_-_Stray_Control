# Pet Ownership, Vaccination & Stray Control System

A comprehensive MERN stack application for managing pet ownership records, vaccination schedules, and QR-based pet identification.

## Sprint 1 Features
- User authentication (Login/Signup)
- Admin dashboard for managing users
- Pet registration system (Admin only)
- QR code generation for each pet
- User dashboard to view registered pets
- Download QR codes

## Prerequisites

### Option 1: Docker (Recommended - Easiest Setup)
- **Docker** - [Download](https://www.docker.com/get-started)
- **Docker Compose** - Comes with Docker Desktop

### Option 2: Manual Setup
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (MongoDB Compass or MongoDB Server) - [Download](https://www.mongodb.com/try/download/community)
- **Visual Studio Code** - [Download](https://code.visualstudio.com/)
- **Git** (optional) - [Download](https://git-scm.com/)

## Quick Start with Docker 🐳

The easiest way to run this project is using Docker. See [README.Docker.md](./README.Docker.md) for detailed Docker documentation.

### Step 1: Setup Environment
```bash
cp .env.example .env
# Edit .env and update the values (especially JWT_SECRET and admin credentials)
```

### Step 2: Start the Application

**Using Make (Recommended):**
```bash
# Development mode with hot-reload
make dev-up

# Production mode
make prod-up
```

**Using Docker Compose directly:**
```bash
# Development mode
docker-compose -f docker-compose.dev.yml up -d

# Production mode
docker-compose up -d
```

### Step 3: Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **MongoDB:** localhost:27017

### Stop the Application
```bash
# Using Make
make dev-down  # or make prod-down

# Using Docker Compose
docker-compose down
```

For more Docker commands and troubleshooting, see [README.Docker.md](./README.Docker.md)

## Project Structure
```
pet-management-system/
├── backend/          # Node.js + Express backend
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── .env
│   ├── server.js
│   └── package.json
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── App.jsx
│   │   └── index.js
│   └── package.json
└── README.md
```

## Manual Setup Instructions

> **Note:** If you're using Docker, you can skip this section. See "Quick Start with Docker" above.

### Step 1: Create Project Folder
1. Open **File Explorer** and create a new folder called `pet-management-system`
2. Inside this folder, create two subfolders: `backend` and `frontend`

### Step 2: Setup Backend

#### 2.1 Open Backend in VS Code
1. Open **Visual Studio Code**
2. Click **File → Open Folder**
3. Navigate to and select the `backend` folder
4. VS Code will open with the backend folder

#### 2.2 Create Backend Files
Create the following folder structure and files (you can see all file contents in the artifacts above):

```
backend/
├── config/
│   └── db.js
├── models/
│   ├── User.js
│   └── Pet.js
├── routes/
│   ├── auth.js
│   ├── user.js
│   └── pet.js
├── middleware/
│   ├── auth.js
│   └── admin.js
├── utils/
│   └── qrGenerator.js
├── .env
├── server.js
└── package.json
```

**Important:** Copy the exact content for each file from the artifacts I provided above.

#### 2.3 Install Backend Dependencies
1. In VS Code, open the **Terminal** (View → Terminal or Ctrl+`)
2. Make sure you're in the `backend` folder
3. Run the following command:
```bash
npm install
```

This will install all required packages (express, mongoose, bcryptjs, jsonwebtoken, etc.)

#### 2.4 Start MongoDB
1. Open **MongoDB Compass**
2. Click **Connect** (it should connect to `mongodb://localhost:27017`)
3. Keep MongoDB Compass running in the background

#### 2.5 Start Backend Server
In the VS Code terminal (still in backend folder), run:
```bash
npm run dev
```

You should see:
```
MongoDB Connected Successfully
Admin user created successfully
Server is running on port 5000
```

**Keep this terminal running!**

### Step 3: Setup Frontend

#### 3.1 Open New VS Code Window
1. Open a **new VS Code window** (File → New Window)
2. Click **File → Open Folder**
3. Navigate to and select the `frontend` folder

#### 3.2 Create React App Base
1. Open Terminal in this new VS Code window
2. Make sure you're in the `frontend` folder
3. Run:
```bash
npx create-react-app .
```

Wait for it to complete (this may take a few minutes).

#### 3.3 Install Additional Frontend Dependencies
```bash
npm install react-router-dom axios
```

#### 3.4 Replace/Create Frontend Files
Now replace or create the following files with the content from the artifacts:

```
frontend/src/
├── components/
│   ├── Auth/
│   │   ├── Login.jsx
│   │   └── Signup.jsx
│   ├── Admin/
│   │   ├── AdminDashboard.jsx
│   │   ├── UserList.jsx
│   │   └── PetRegistration.jsx
│   ├── User/
│   │   ├── UserDashboard.jsx
│   │   └── MyPets.jsx
│   ├── Navbar.jsx
│   └── Navbar.css
├── context/
│   └── AuthContext.jsx
├── App.jsx (REPLACE existing)
├── App.css (REPLACE existing)
├── index.js (REPLACE existing)
└── index.css (REPLACE existing)
```

Also update `package.json` to add the proxy at the bottom.

#### 3.5 Start Frontend Development Server
In the frontend VS Code terminal, run:
```bash
npm start
```

This will automatically open `http://localhost:3000` in your browser.

**Keep this terminal running too!**

## Usage Guide

### Admin Login
- **Email:** admin@petmanagement.com
- **Password:** Admin@123

### Testing the System

#### 1. Create a User Account
1. Go to `http://localhost:3000`
2. Click **Sign Up**
3. Fill in all required fields:
   - Full Name
   - Email
   - Password (minimum 6 characters)
   - Phone Number
   - NIC Number
   - Complete Address Information
4. Click **Sign Up**
5. You'll be logged in and redirected to User Dashboard

#### 2. Logout and Login as Admin
1. Click **Logout** in the navbar
2. Click **Login**
3. Enter admin credentials (see above)
4. Click **Login**
5. You'll be redirected to Admin Dashboard

#### 3. Register a Pet
1. In Admin Dashboard, click **View All Users**
2. You'll see the user you just created
3. Click **Register Pet** button for that user
4. Fill in the pet registration form:
   - Pet Name (required)
   - Pet Type (Dog, Cat, Bird, etc.)
   - Breed (dropdown based on pet type)
   - Age (years and months)
   - Gender
   - Color
   - Weight
   - Microchip Number (optional)
   - Medical History (optional)
5. Click **Register Pet**

#### 4. View QR Code
After registration:
- QR code will be displayed
- Click **Download QR Code** to save it
- Click **Back to Users** or **Register Another Pet**

#### 5. User Views Their Pets
1. Logout from admin account
2. Login with the user account you created
3. Click **View My Pets** in the dashboard
4. You'll see all pets registered to your account
5. Click **View Details** to see full pet information
6. Click **Download QR** to download the QR code

## Default Admin Credentials
- **Email:** admin@petmanagement.com
- **Password:** Admin@123

**Important:** Change the admin password in production by updating the `.env` file.

## Troubleshooting

### Backend won't start
- Make sure MongoDB is running (MongoDB Compass should be connected)
- Check if port 5000 is already in use
- Verify all dependencies are installed (`npm install`)

### Frontend won't start
- Check if port 3000 is already in use
- Verify all dependencies are installed
- Make sure the proxy is set correctly in `package.json`

### Can't login
- Check if backend server is running
- Verify MongoDB connection
- Check browser console for errors (F12)

### QR Code not generating
- Ensure the `qrcode` package is installed in backend
- Check backend terminal for errors
- Verify pet registration completed successfully

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Admin only)
- `GET /api/users/:id/pets` - Get user's pets

### Pets
- `POST /api/pets/register` - Register pet (Admin only)
- `GET /api/pets` - Get all pets (Admin only)
- `GET /api/pets/:id` - Get pet by ID
- `GET /api/pets/petid/:petId` - Get pet by Pet ID (for QR scanning)

## Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- QRCode for generating QR codes

### Frontend
- React.js
- React Router for navigation
- Axios for API calls
- Context API for state management

## Next Steps (Future Sprints)
- Vaccination scheduling system
- Automated reminders
- Lost and found pet reporting
- Breeder licensing module
- Veterinary dashboard
- Insurance integration

## Support
If you encounter any issues during setup, please check:
1. All files are created with correct names
2. All dependencies are installed
3. MongoDB is running
4. Both backend and frontend servers are running
5. Browser console for any errors (F12)

## Contributors
- M. V. Prasad (Project Coordinator)
- Your Team Members

## License
This project is for educational purposes.