# MongoDB Connection Guide

## Connecting to MongoDB in Docker

### For the Backend Application ✅

The backend is **already connected** successfully using the Docker network. No action needed!

### For MongoDB Compass or Other Tools

If you want to connect to the MongoDB container from MongoDB Compass or another tool on your host machine, use one of these methods:

#### Method 1: Connect with Authentication (Recommended)

**Connection String:**
```
mongodb://admin:admin123@localhost:27017/?authSource=admin
```

**Or using individual fields in MongoDB Compass:**

1. Open MongoDB Compass
2. Click "New Connection"
3. Fill in the fields:
   - **Authentication:** Username / Password
   - **Username:** `admin`
   - **Password:** `admin123`
   - **Authentication Database:** `admin`
   - **Hostname:** `localhost`
   - **Port:** `27017`
4. Click "Connect"

#### Method 2: Connect to Specific Database

**Connection String:**
```
mongodb://admin:admin123@localhost:27017/pet_management?authSource=admin
```

### Common Connection Errors and Solutions

#### Error: "Command hostInfo requires authentication"

**Cause:** Trying to connect without providing credentials.

**Solution:** Use the connection string with credentials (see Method 1 above).

#### Error: "Authentication failed"

**Cause:** Wrong username or password.

**Solution:** Check your `.env` file for the correct credentials:
```bash
cat .env | grep MONGO
```

Default credentials:
- Username: `admin`
- Password: `admin123`

#### Error: "Connection refused"

**Cause:** MongoDB container is not running.

**Solution:**
```bash
# Check if containers are running
docker-compose -f docker-compose.dev.yml ps

# If not running, start them
make dev-up
```

### Using MongoDB Shell from Docker

If you want to use the MongoDB shell:

```bash
# Method 1: Using Make
make mongodb-sh

# Method 2: Using Docker Compose
docker-compose -f docker-compose.dev.yml exec mongodb mongosh -u admin -p admin123 --authSource admin

# Method 3: Direct Docker command
docker exec -it pet-management-mongodb-dev mongosh -u admin -p admin123 --authSource admin
```

Once in the MongoDB shell:
```javascript
// Switch to pet_management database
use pet_management

// Show all collections
show collections

// View users
db.users.find().pretty()

// View pets
db.pets.find().pretty()

// Count documents
db.users.countDocuments()
db.pets.countDocuments()
```

### Viewing Data in the Application

**Recommended:** Instead of using MongoDB Compass, use the web application:

1. **Access the application:**
   - Frontend: http://localhost:3000

2. **Login as admin:**
   - Email: `admin@petmanagement.com`
   - Password: `Admin@123`

3. **View data in the admin dashboard:**
   - User list
   - Pet registrations
   - All data is displayed in the UI

### Environment Variables Reference

The MongoDB configuration is in your `.env` file:

```env
MONGO_ROOT_USERNAME=admin       # MongoDB admin username
MONGO_ROOT_PASSWORD=admin123    # MongoDB admin password
MONGO_DATABASE=pet_management   # Database name
MONGO_PORT=27017               # MongoDB port
```

### Security Notes

**Development:**
- Default credentials are fine for development
- MongoDB is accessible on localhost:27017

**Production:**
- Change default credentials to strong passwords
- Don't expose MongoDB port publicly
- Use environment variables from secrets management
- Enable MongoDB SSL/TLS

### Troubleshooting

#### Can't connect from host machine but backend works

This is normal! The backend connects using the Docker network name `mongodb`, while your host machine connects via `localhost:27017`.

**Solution:** Use the connection string with authentication (see Method 1).

#### Want to disable authentication (NOT recommended)

If you really need to disable authentication for testing:

1. Edit `docker-compose.dev.yml`:
```yaml
mongodb:
  image: mongo:7.0
  # Comment out or remove these lines:
  # environment:
  #   MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME:-admin}
  #   MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD:-admin123}
```

2. Update backend connection in `docker-compose.dev.yml`:
```yaml
backend:
  environment:
    MONGODB_URI: mongodb://mongodb:27017/pet_management
    # Remove ?authSource=admin part
```

3. Restart:
```bash
make dev-down
make dev-up
```

**Warning:** This is insecure and only for local testing!

### Quick Connection Test

Test the connection from command line:

```bash
# Test with mongosh (if installed locally)
mongosh "mongodb://admin:admin123@localhost:27017/?authSource=admin"

# Test with Docker
docker exec -it pet-management-mongodb-dev mongosh -u admin -p admin123 --authSource admin --eval "db.adminCommand('ping')"
```

### MongoDB Compass Screenshots

**Connection Screen:**
```
┌─────────────────────────────────────┐
│ New Connection                       │
├─────────────────────────────────────┤
│ Authentication: Username / Password  │
│                                      │
│ Username:      admin                 │
│ Password:      ••••••••              │
│ Auth Database: admin                 │
│                                      │
│ Hostname:      localhost             │
│ Port:          27017                 │
│                                      │
│ [Cancel]           [Connect]         │
└─────────────────────────────────────┘
```

### Connection String Examples

**For different scenarios:**

```bash
# Development (what backend uses internally)
mongodb://admin:admin123@mongodb:27017/pet_management?authSource=admin

# From host machine (what you use in Compass)
mongodb://admin:admin123@localhost:27017/pet_management?authSource=admin

# Admin database connection
mongodb://admin:admin123@localhost:27017/?authSource=admin

# Read-only user (if you create one)
mongodb://readonly:password@localhost:27017/pet_management?authSource=admin&readPreference=secondary
```

### Creating Additional Users

If you want to create additional MongoDB users:

```bash
# Access MongoDB shell
make mongodb-sh

# In the shell:
use admin

db.createUser({
  user: "developer",
  pwd: "devpassword",
  roles: [
    { role: "readWrite", db: "pet_management" },
    { role: "dbAdmin", db: "pet_management" }
  ]
})

# Then connect with:
# mongodb://developer:devpassword@localhost:27017/pet_management?authSource=admin
```

---

## Summary

**For the application (backend):** ✅ Already working, no action needed!

**For MongoDB Compass:** Use this connection string:
```
mongodb://admin:admin123@localhost:27017/?authSource=admin
```

**For MongoDB Shell:** Use this command:
```bash
make mongodb-sh
```

The authentication error you saw is expected behavior - MongoDB in Docker requires authentication for security. Just use the credentials from your `.env` file!
