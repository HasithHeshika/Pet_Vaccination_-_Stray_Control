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
- **Pet Registration & Unique QR Codes**: Admin pet registration with instant QR code generation. Scanning the QR opens a public pet profile; finders can message the owner without the owner's email or phone being shown.
- **Veterinarian Portal**: Dedicated doctor interface to lookup patient records by Pet ID, view medical history, log vaccinations/treatments, and send reminders.
- **Automated Vaccination Reminders**: Background `node-cron` service and `nodemailer` integration to deliver email reminders for upcoming/overdue vaccinations (requires SMTP settings; a reminder is only marked as sent after it is delivered).
- **Breeder Licensing System**: Full breeder application workflow, status tracking, renewal requests, and municipal authority approval dashboards.
- **Animal Incident Reporting**: Anyone can report violence or abuse, a sick or injured animal in a public place, a stray, or any other animal incident, with urgency, photos, GPS location and optional contact details. Urgent reports are emailed to the authority and listed first on the authority dashboard.
- **Lost & Found**: Lost and found reports (species, up to 2 photos, GPS, collar-tag Pet ID). Found reports are matched against open lost reports and registered pets; the authority reviews each suggested match and, on confirmation, the owner and finder are emailed. An AI photo check can be plugged in later (`Backend/services/matching/aiProviders/`).

---

## 🏆 Sprint Progress & Implementation Status

| Sprint | Goal / Description | Status | Key Components |
| :--- | :--- | :---: | :--- |
| **Sprint 1** | Setup of Pet Registration & QR ID system | ✅ Completed | `Pet.js`, `PetRegistration.jsx`, QR generation, JWT Auth |
| **Sprint 2** | Vaccination Scheduler & Automated Reminder service | ✅ Completed | `Vaccination.js`, `vaccinationScheduler.js` (daily `node-cron` job), `notificationService.js` (`nodemailer` email; requires SMTP settings). SMS is not yet implemented |
| **Sprint 3** | Implementation of Veterinarian Portal | ✅ Completed | `VetDashboard.jsx`, Vet role middleware (`vet.js`), patient lookup & treatment logger |
| **Sprint 4** | Lost-and-Found & Stray Reporting modules | ✅ Completed | `LostReport.js`, `StrayReport.js`, `ReportStrayForm.jsx`, `LostFoundFeed.jsx` |
| **Sprint 5** | Breeder Licensing & Admin Dashboards | ✅ Completed | `BreederLicense.js`, `ApplyLicense.jsx`, `ApplicationStatus.jsx`, `RenewLicense.jsx`, `AdminBreederLicenses.jsx`, `AuthorityDashboard.jsx` |
| **Sprint 6** | Testing, UI polish & deployment readiness | ✅ Completed | End-to-end API tests (`Backend/tests/api.test.js`) and frontend tests run in CI, responsive UI styling, Docker compose setup |

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

## ⚙️ Backend Environment Variables

| Variable | Purpose |
| :--- | :--- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing login tokens (use a long random value in production) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial administrator account (change the defaults in production) |
| `FRONTEND_URL` | Public web URL used in pet QR codes and email links (production: the Azure Static Web Apps URL) |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API |
| `ACS_EMAIL_CONNECTION_STRING`, `ACS_EMAIL_SENDER` | Outgoing email through Azure Communication Services (used in production) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Alternative: outgoing email through any SMTP server. With neither ACS nor SMTP set, emails are only logged |
| `MATCH_MAX_KM`, `MATCH_MAX_DAYS`, `MATCH_MIN_SCORE` | Optional Lost & Found matching limits (defaults 15 km, 30 days, score 40) |
| `MATCH_AI_PROVIDER` | Optional AI photo check for matches; default `none` (no provider implemented yet) |
| `REMINDER_CRON` | Schedule for the daily reminder check (default `0 9 * * *`) |
| `AUTHORITY_ALERT_EMAILS` | Comma-separated addresses emailed about urgent or emergency animal incidents (default: all administrator accounts) |

After changing `FRONTEND_URL`, re-issue existing QR codes with `cd Backend && npm run regenerate-qr`.

## 🧪 Tests

The full Software Testing & QA results are in the QA report (`qa/` holds the raw coverage, load-test and live smoke-test results).

```bash
# A throwaway MongoDB for the backend and end-to-end tests (test databases are dropped first)
docker run -d --rm --name pet-test-mongo -p 27077:27017 mongo:7

# Backend: unit tests + API tests (61 tests); add :coverage for a coverage report
cd Backend && TEST_MONGODB_URI=mongodb://127.0.0.1:27077/pet_management_test npm test
cd Backend && TEST_MONGODB_URI=mongodb://127.0.0.1:27077/pet_management_test npm run test:coverage

# Web frontend: component and unit tests (99 tests)
cd Frontend && CI=true npm test -- --watchAll=false --coverage

# Mobile app: unit and widget tests (65 tests)
cd Mobileapp && flutter test --coverage

# End-to-end browser tests (Playwright, 27 tests incl. accessibility and phone layout)
cd e2e && npm install && npx playwright install chromium
npm run build:web      # once after frontend changes
npm test

# Load test of the API (local) and smoke test of the live Azure deployment
node scripts/load-test.js
LIVE_ADMIN_EMAIL=... LIVE_ADMIN_PASSWORD=... node scripts/live-smoke.js
```

The backend and frontend suites run automatically in GitHub Actions (`.github/workflows/ci.yml`).

---

## 🔌 API Documentation

### Authentication (`/api/auth`)
- `POST /signup` - Register user (supports `user` or `veterinarian` role)
- `POST /login` - Authenticate & receive JWT token
- `GET /me` - Fetch active authenticated user profile
- `POST /forgot-password` - Email a one-time reset link valid for 30 minutes (same reply whether or not the account exists; rate limited)
- `POST /reset-password` - Set a new password with the emailed token; signs the user out of existing sessions

Admins can also email a user a reset link with `POST /api/users/:id/send-password-reset` ("Reset Password" on the user list). Admins never see or set passwords.

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

### Animal Incident Reports (`/api/incidents`, also `/api/stray-reports`)
- `POST /` - Report an animal incident (*Public, login optional*). Body: `incidentType` (`violence`, `sick_injured`, `stray`, `other` + `otherIncidentType`), `urgency` (`emergency`, `urgent`, `normal`; defaults by type), `location`, optional `coordinates` `{lat, lng}`, `description`, up to 2 `images` (JPEG/PNG/WebP data URLs, 2 MB each), optional `reporterName` / `reporterContact`. Urgent and emergency reports email `AUTHORITY_ALERT_EMAILS` (or all admins)
- `GET /` - List reports, open and most urgent first, without photos (*Admin Only*)
- `GET /:id` - One report including photos (*Admin Only*)
- `PATCH /:id/status` - Update report progress (*Admin Only*)

### Lost & Found (`/api/lost-and-found`)
- `POST /` - Submit a lost or found report, `reportType: lost|found` (*Private*)
- `GET /?type=lost|found` - Public feed (first photo of each report only)
- `GET /:id` - One report with all photos
- `PUT /:id`, `DELETE /:id` - Edit or delete a report (*reporter or Admin*)
- `PATCH /:id/status` - Update report status (*reporter or Admin*)

### Lost & Found matches (`/api/matches`)
- `GET /mine` - Confirmed matches for my reports and registered pets (*Private*)
- `GET /?status=suggested|confirmed|rejected` - Matches to review, highest score first (*Admin Only*)
- `GET /:id` - Both sides in full, score breakdown and AI result (*Admin Only*)
- `PATCH /:id` - `{decision: confirm|reject, note}`; confirming emails the owner and finder (*Admin Only*)
- `POST /rerun/:reportId` - Run matching again for one report (*Admin Only*)

---