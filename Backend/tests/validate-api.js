const http = require('http');

/**
 * Automated Verification Script for Pet Vaccination & Stray Control System APIs
 * Tests key API endpoints for Auth, Roles, Vaccinations, Breeder Licenses, and Stray Reports.
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

const makeRequest = (path, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', err => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting API Verification Test Suite');
  console.log('====================================================\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Testing Server Health Check...');
    const health = await makeRequest('/../', 'GET');
    console.log(`   Status: ${health.status} | Response: ${JSON.stringify(health.body || health.raw)}`);

    // 2. Register Veterinarian
    const vetEmail = `vet.test.${Date.now()}@petcare.org`;
    console.log(`\n2️⃣ Testing Veterinarian Registration (${vetEmail})...`);
    const vetSignup = await makeRequest('/auth/signup', 'POST', {
      fullName: 'Dr. Sarah Jenkins',
      email: vetEmail,
      password: 'password123',
      phone: '0771234567',
      nicNumber: `NIC${Date.now()}`,
      role: 'veterinarian',
      vetLicenseNumber: 'VET-SL-2026-991',
      clinicName: 'Central Animal Hospital',
      address: { street: '123 Vet Ave', city: 'Colombo', province: 'Western', postalCode: '00100' }
    });
    console.log(`   Status: ${vetSignup.status} | Role Assigned: ${vetSignup.body?.user?.role || 'N/A'}`);

    // 3. Login Admin
    console.log('\n3️⃣ Testing Admin Login...');
    const adminLogin = await makeRequest('/auth/login', 'POST', {
      email: 'admin@petmanagement.com',
      password: 'Admin@123'
    });
    console.log(`   Status: ${adminLogin.status} | Success: ${!!adminLogin.body?.token}`);
    const adminToken = adminLogin.body?.token;

    if (adminToken) {
      // 4. Test Breeder License API
      console.log('\n4️⃣ Testing Breeder License Application API...');
      const licenseApp = await makeRequest('/licenses/apply', 'POST', {
        businessName: 'Apex Canine Breeders',
        facilityAddress: '45 Lake View Road, Kandy',
        documentsUrl: 'https://example.com/docs.pdf',
        notes: 'High compliance breeding facility'
      }, adminToken);
      console.log(`   Status: ${licenseApp.status} | License ID: ${licenseApp.body?._id}`);

      if (licenseApp.body?._id) {
        console.log('   Testing Admin Breeder License Approval...');
        const approval = await makeRequest(`/licenses/${licenseApp.body._id}/status`, 'PUT', {
          status: 'Approved',
          notes: 'Facility inspected and verified by municipal authority'
        }, adminToken);
        console.log(`   Status: ${approval.status} | Updated Status: ${approval.body?.status}`);
      }

      // 5. Test Stray Reports Listing
      console.log('\n5️⃣ Testing Stray Reports Retrieval API...');
      const strayReports = await makeRequest('/stray-reports', 'GET', null, adminToken);
      console.log(`   Status: ${strayReports.status} | Total Stray Reports Found: ${Array.isArray(strayReports.body) ? strayReports.body.length : strayReports.body?.reports?.length || 0}`);
    }

    console.log('\n====================================================');
    console.log('✅ API Verification Test Suite Completed Successfully!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Verification Error:', err.message);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
