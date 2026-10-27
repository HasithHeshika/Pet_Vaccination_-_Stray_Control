const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const { scheduleVaccinationReminders } = require('./services/vaccinationScheduler');
const securityHeaders = require('./middleware/securityHeaders');
const rateLimit = require('./middleware/rateLimit');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Azure App Service sits behind a proxy; needed for correct client IPs in rate limiting
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Only the deployed web frontend (and local dev) may call the API from a browser.
// Requests without an Origin header (mobile app, curl, server-to-server) are allowed.
const allowedOrigins = (process.env.CORS_ORIGINS ||
  'https://lively-sky-055ae2000.7.azurestaticapps.net,http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Azure Static Web Apps pull-request preview builds of the same app
const previewOriginPattern = /^https:\/\/lively-sky-055ae2000-[a-z0-9-]+\.[a-z0-9]+\.7\.azurestaticapps\.net$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || previewOriginPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  }
}));

// Middleware
app.use(securityHeaders);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Create admin user if not exists
const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (!adminExists) {
      const admin = new User({
        fullName: 'System Administrator',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        phone: '0000000000',
        nicNumber: 'ADMIN001',
        address: {
          street: 'Admin Street',
          city: 'Colombo',
          province: 'Western',
          postalCode: '00000'
        },
        isAdmin: true
      });
      
      await admin.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

const backfillIncidentFields = async () => {
  try {
    const StrayReport = require('./models/StrayReport');
    const legacy = await StrayReport.updateMany(
      { urgencyRank: { $exists: false } },
      { $set: { incidentType: 'stray', urgency: 'normal', urgencyRank: 2 } }
    );
    let ranked = 0;
    for (const [status, rank] of Object.entries(StrayReport.STATUS_RANK)) {
      const result = await StrayReport.updateMany(
        { status, statusRank: { $ne: rank } },
        { $set: { statusRank: rank } }
      );
      ranked += result.modifiedCount;
    }
    if (legacy.modifiedCount > 0 || ranked > 0) {
      console.log(`Backfilled incident fields on ${legacy.modifiedCount} older report(s), status order on ${ranked}`);
    }
  } catch (error) {
    console.error('Error backfilling incident fields:', error);
  }
};

// Brute-force protection on credential endpoints
// Only failed attempts count, so many users behind one campus/office network can still log in
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: 'Too many failed login or signup attempts. Please try again in 15 minutes.'
});
app.use(['/api/auth/login', '/api/auth/signup', '/api/auth/oauth'], authLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/pets', require('./routes/pet'));
app.use('/api/vaccinations', require('./routes/vaccination'));
const incidentRoutes = require('./routes/strayReport');
app.use('/api/stray-reports', incidentRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/lost-and-found', require('./routes/lostReport'));
app.use('/api/licenses', require('./routes/license'));
app.use('/api/authority', require('./routes/authority'));

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Pet Management System API is running' });
});

// Unknown API routes return JSON rather than Express's default HTML page
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const listenOnAvailablePort = (preferredPort) => {
  const ports = [Number(preferredPort) || 5000, 5001, 5002].filter((port, index, list) => list.indexOf(port) === index);

  const tryListen = (index = 0) => new Promise((resolve, reject) => {
    if (index >= ports.length) {
      reject(new Error(`No available backend port found. Tried: ${ports.join(', ')}`));
      return;
    }

    const port = ports[index];
    const server = app.listen(port, '0.0.0.0');

    server.once('listening', () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Health check available at http://localhost:${port}`);
      console.log('Server is now accepting connections');
      resolve(server);
    });

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is already in use. Trying another port...`);
        tryListen(index + 1).then(resolve).catch(reject);
        return;
      }

      reject(error);
    });
  });

  return tryListen();
};

// Start server function
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Initialize admin user
    await createAdminUser();

    // Reports created before incident types existed are stray sightings of normal urgency
    await backfillIncidentFields();
    
    // Start vaccination reminder scheduler
    scheduleVaccinationReminders();
    console.log('Vaccination reminder scheduler initialized');
    
    // Start server
    const server = await listenOnAvailablePort(process.env.PORT);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
