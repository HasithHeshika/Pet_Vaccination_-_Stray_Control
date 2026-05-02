const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const { scheduleVaccinationReminders } = require('./services/vaccinationScheduler');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/pets', require('./routes/pet'));
app.use('/api/vaccinations', require('./routes/vaccination'));
app.use('/api/stray-reports', require('./routes/strayReport'));
app.use('/api/lost-and-found', require('./routes/lostReport'));
app.use('/api/licenses', require('./routes/license'));

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Pet Management System API is running' });
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
