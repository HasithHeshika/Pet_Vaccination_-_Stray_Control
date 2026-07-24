# Pet Vaccination & Stray Control System

A comprehensive MERN stack application for managing pet ownership records, vaccination schedules, QR-based pet identification, veterinarian patient records, breeder licensing, and municipal stray animal control.

---

## 📑 Table of Contents
- [Features](#features)
- [Sprint Progress & Implementation Status](#sprint-progress--implementation-status)
- [User Roles & Access Control](#user-roles--access-control)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Getting Started (Docker)](#getting-started-docker-recommended)
- [Manual Setup](#manual-setup)
- [API Documentation](#api-documentation)

---

## ✨ Features

- **Role-Based Access Control**: Granular permissions for **Admins**, **Veterinarians**, and **Pet Owners / Breeders**.
- **Pet Registration & Unique QR Codes**: Admin pet registration with instant QR code generation and scan tracking.
- **Veterinarian Portal**: Dedicated doctor interface to lookup patient records by Pet ID, view medical history, log vaccinations/treatments, and send reminders.
- **Automated Vaccination Reminders**: Background `node-cron` service and `nodemailer` integration to deliver email reminders for upcoming/overdue vaccinations.
- **Breeder Licensing System**: Full breeder application workflow, status tracking, renewal requests, and municipal authority approval dashboards.
- **Stray & Lost Pet Reporting**: Citizen stray animal reporting, lost pet feed, and municipal progress dashboards.

---

## 🏆 Sprint Progress & Implementation Status

| Sprint | Goal / Description | Status | Key Components |
| :--- | :--- | :---: | :--- |
| **Sprint 1** | Setup of Pet Registration & QR ID system | ✅ Completed | `Pet.js`, `PetRegistration.jsx`, QR generation, JWT Auth |
| **Sprint 2** | Vaccination Scheduler & Automated Reminder service | ✅ Completed | `Vaccination.js`, `reminderService.js`, `node-cron`, `nodemailer` email notifications |
| **Sprint 3** | Implementation of Veterinarian Portal | ✅ Completed | `VetDashboard.jsx`, Vet role middleware (`vet.js`), patient lookup & treatment logger |
| **Sprint 4** | Lost-and-Found & Stray Reporting modules | ✅ Completed | `LostReport.js`, `StrayReport.js`, `ReportStrayForm.jsx`, `LostFoundFeed.jsx` |
| **Sprint 5** | Breeder Licensing & Admin Dashboards | ✅ Completed | `BreederLicense.js`, `ApplyBreederLicense.jsx`, `MyBreederLicenses.jsx`, `AdminBreederLicenses.jsx` |
| **Sprint 6** | Testing, UI polish & deployment readiness | ✅ Completed | API validation suite (`validate-api.js`), responsive UI styling, Docker compose setup |

---

## 👥 User Roles & Access Control

1. **System Administrator (`admin`)**
   - Access to full Admin Dashboard, pet registration, user management, stray report tracking, and breeder license approvals.
2. **Registered Veterinarian (`veterinarian`)**
   - Access to dedicated **Vet Portal** (`/vet/dashboard`) for quick patient lookup, viewing full medical history, logging new vaccinations/treatments, and triggering email reminders to pet owners.
3. **Pet Owner / Breeder (`user`)**
   - Personal dashboard to view registered pets, QR codes, upcoming vaccination schedules, report stray animals, post lost pets, and apply for/renew breeder licenses.

---

## 🛠 Technologies Used

### Backend
- **Node.js** & **Express.js** - RESTful API framework
- **MongoDB** & **Mongoose** - Database & object modeling
- **JWT & Bcrypt.js** - Authentication & password security
- **node-cron** & **nodemailer** - Automated background reminders & emails
- **QRCode** - QR identification library

### Frontend
- **React.js** - Dynamic single-page application framework
- **React Router v6** - Route management & role protection
- **Axios** - HTTP API client
- **Context API** - Global auth & state management

---

## 📁 Project Structure

```text
pet-management-system/
├── Backend/          # Node.js + Express API
│   ├── config/       # Database configuration
│   ├── middleware/   # Auth, Admin, and Vet role validation
│   ├── models/       # Schemas (User, Pet, Vaccination, BreederLicense, StrayReport, LostReport)
│   ├── routes/       # API endpoints
│   ├── services/     # Automated reminder service & cron scheduler
│   ├── tests/        # API verification test suite
│   └── server.js     # Entry point
├── Frontend/         # React Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/     # Admin dashboard & license management
│   │   │   ├── Auth/      # Login & role-enabled Signup
│   │   │   ├── Breeder/   # Breeder licensing application & list
│   │   │   ├── Vet/       # Veterinarian Portal & patient lookup
│   │   │   ├── Stray/     # Stray reporting form
│   │   │   └── User/      # User dashboard & pet views
│   │   ├── context/       # AuthContext
│   │   └── App.jsx        # Routes
├── docker-compose.yml     # Production Docker configuration
├── docker-compose.dev.yml # Development Docker configuration
└── Makefile               # Task automation
```

---

## 🐳 Getting Started (Docker - Recommended)

```bash
# 1. Environment Setup
cp .env.example .env

# 2. Start Application with hot-reload (Frontend on 3000, Backend on 5001)
make dev-up
```

---

## 🔌 API Documentation

### Authentication (`/api/auth`)
- `POST /signup` - Register user (supports `user` or `veterinarian` role)
- `POST /login` - Authenticate & receive JWT token
- `GET /me` - Fetch active authenticated user profile

### Veterinarian & Vaccinations (`/api/vaccinations`)
- `POST /` - Add vaccination record (*Admin or Vet*)
- `GET /pet/:petId` - Retrieve vaccination history for pet
- `POST /:id/send-reminder` - Trigger manual/automated email reminder to pet owner (*Admin or Vet*)

### Breeder Licensing (`/api/licenses`)
- `POST /apply` - Submit breeder license application (*Private*)
- `GET /my-licenses` - List user's license applications (*Private*)
- `GET /` - Retrieve all applications (*Admin Only*)
- `PUT /:id/status` - Approve, reject, or set expiry dates for license (*Admin Only*)
- `POST /:id/renew` - Request license renewal (*Private*)

### Stray & Lost Reports (`/api/stray-reports`, `/api/lost-and-found`)
- `POST /` - Submit stray sighting or lost pet report
- `GET /` - List reports with status filters
- `PATCH /:id/status` - Update report progress (*Admin Only*)

---