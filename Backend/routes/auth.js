const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const providerSettings = {
  google: {
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs'
  },
  apple: {
    clientIdEnv: 'APPLE_CLIENT_ID',
    issuer: 'https://appleid.apple.com',
    jwksUrl: 'https://appleid.apple.com/auth/keys'
  }
};

const providerKeySets = {};

const getProviderKeySet = async (provider) => {
  if (!providerKeySets[provider]) {
    const { createRemoteJWKSet } = await import('jose');
    providerKeySets[provider] = createRemoteJWKSet(
      new URL(providerSettings[provider].jwksUrl)
    );
  }
  return providerKeySets[provider];
};

const verifyProviderToken = async (provider, idToken) => {
  const settings = providerSettings[provider];
  const audience = process.env[settings.clientIdEnv];

  if (!audience) {
    const error = new Error(`${provider} login is not configured`);
    error.statusCode = 503;
    throw error;
  }

  const { jwtVerify } = await import('jose');
  const keySet = await getProviderKeySet(provider);
  const { payload } = await jwtVerify(idToken, keySet, {
    audience,
    issuer: settings.issuer
  });

  if (!payload.email || ![true, 'true'].includes(payload.email_verified)) {
    const error = new Error('The social account email is not verified');
    error.statusCode = 401;
    throw error;
  }

  return payload;
};

const authUserPayload = (user) => {
  const effectiveRole = user.role || (user.isAdmin ? 'admin' : 'user');
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    nicNumber: user.nicNumber,
    role: effectiveRole,
    isAdmin: user.isAdmin || effectiveRole === 'admin',
    vetLicenseNumber: user.vetLicenseNumber,
    clinicName: user.clinicName,
    profilePicture: user.profilePicture || ''
  };
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('nicNumber').notEmpty().withMessage('NIC number is required'),
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.province').notEmpty().withMessage('Province is required'),
  body('address.postalCode').notEmpty().withMessage('Postal code is required')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, password, phone, nicNumber, address, role, vetLicenseNumber, clinicName } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { nicNumber }] });
    if (user) {
      return res.status(400).json({ message: 'User with this email or NIC already exists' });
    }

    // Determine user role and isAdmin flag
    const userRole = role === 'veterinarian' ? 'veterinarian' : 'user';
    const isAdmin = false;

    // Create new user
    user = new User({
      fullName,
      email,
      password,
      phone,
      nicNumber,
      address,
      role: userRole,
      isAdmin,
      vetLicenseNumber: userRole === 'veterinarian' ? vetLicenseNumber : undefined,
      clinicName: userRole === 'veterinarian' ? clinicName : undefined
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        vetLicenseNumber: user.vetLicenseNumber,
        clinicName: user.clinicName
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/oauth/:provider
// @desc    Sign in or register a standard user with Google or Apple
// @access  Public
router.post('/oauth/:provider', [
  body('idToken').isString().notEmpty().withMessage('Provider ID token is required'),
  body('fullName').optional().trim().isLength({ max: 120 }).withMessage('Name is too long')
], async (req, res) => {
  try {
    const provider = req.params.provider.toLowerCase();
    if (!providerSettings[provider]) {
      return res.status(400).json({ message: 'Unsupported login provider' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const identity = await verifyProviderToken(provider, req.body.idToken);
    const normalizedEmail = identity.email.toLowerCase();
    const providerAccountPath = `oauthAccounts.${provider}`;
    let user = await User.findOne({ [providerAccountPath]: identity.sub })
      .select('+profilePicture');

    if (!user) {
      user = await User.findOne({ email: normalizedEmail })
        .select('+profilePicture');
    }

    if (user && (user.isAdmin || (user.role && user.role !== 'user'))) {
      return res.status(403).json({
        message: 'Google and Apple login is available only for standard user accounts'
      });
    }

    if (user) {
      const linkedSubject = user.oauthAccounts?.[provider];
      if (linkedSubject && linkedSubject !== identity.sub) {
        return res.status(403).json({ message: 'This email is linked to another social account' });
      }

      user.set(providerAccountPath, identity.sub);
      await user.save();
    } else {
      const fallbackName = normalizedEmail.split('@')[0];
      const fullName = identity.name || req.body.fullName || fallbackName;
      const identityHash = crypto
        .createHash('sha256')
        .update(`${provider}:${identity.sub}`)
        .digest('hex')
        .slice(0, 20)
        .toUpperCase();

      user = new User({
        fullName,
        email: normalizedEmail,
        password: crypto.randomBytes(32).toString('hex'),
        phone: 'Not provided',
        nicNumber: `OAUTH-${provider.toUpperCase()}-${identityHash}`,
        address: {
          street: 'Not provided',
          city: 'Not provided',
          province: 'Not provided',
          postalCode: 'Not provided'
        },
        role: 'user',
        isAdmin: false,
        oauthAccounts: { [provider]: identity.sub }
      });
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({
      message: `${provider === 'google' ? 'Google' : 'Apple'} login successful`,
      token,
      user: authUserPayload(user)
    });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(error.statusCode || 401).json({
      message: error.statusCode === 503
        ? error.message
        : 'Social login could not be verified'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+profilePicture');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: authUserPayload(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const effectiveRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    res.json({
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
        address: req.user.address,
        nicNumber: req.user.nicNumber,
        role: effectiveRole,
        isAdmin: req.user.isAdmin || effectiveRole === 'admin',
        vetLicenseNumber: req.user.vetLicenseNumber,
        clinicName: req.user.clinicName,
        profilePicture: req.user.profilePicture || ''
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
