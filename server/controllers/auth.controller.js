const { body } = require('express-validator');
const User = require('../models/User.model');
const FarmerProfile = require('../models/FarmerProfile.model');
const OfficerProfile = require('../models/OfficerProfile.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { generateTokens } = require('../middleware/auth.middleware');
const { ROLES, ROLE_LEVELS, ROLE_LABELS, isOfficerRole } = require('../utils/roleHierarchy');

// Real SMS and Cryptographic OTP Managers
const otpManager = require('../services/sms/OtpManager');
const smsService = require('../services/sms/SMSService');

// Validation rules — farmer self-registration (ONLY the 5 required fields + mandatory OTP)
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit Indian mobile number'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP verification is mandatory for mobile number'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('district').trim().notEmpty().withMessage('District is required'),
  body('address').trim().notEmpty().withMessage('Full address is required'),
];

// Login validation — accepts mobile (with OTP) OR employeeId (with password)
const loginValidation = (req, res, next) => {
  const { employeeId, mobile, password, otp } = req.body;
  if (!employeeId && !mobile) {
    return res.status(400).json(new ApiResponse(400, null, 'Please provide either mobile number or Employee ID.'));
  }
  if (employeeId && !password) {
    return res.status(400).json(new ApiResponse(400, null, 'Password is required for officer login.'));
  }
  if (mobile && !otp && !password) {
    return res.status(400).json(new ApiResponse(400, null, 'OTP is required for farmer login.'));
  }
  next();
};

// POST /api/auth/send-otp — Generate and send OTP via SMS Gateway for registration or login
const sendOtp = async (req, res, next) => {
  try {
    const { mobile, purpose = 'login' } = req.body;
    if (!mobile || !/^[6-9]\d{9}$/.test(String(mobile).trim())) {
      throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number.');
    }

    const cleanMobile = String(mobile).trim();
    const user = await User.findOne({ mobile: cleanMobile });

    let regNote = '';
    if (purpose === 'register') {
      if (user) {
        regNote = ' (Account exists: Submitting will update profile, or you can Login)';
      }
    } else {
      // Default / Login flow
      if (!user) {
        throw new ApiError(404, 'Mobile number not registered. Please register first on the portal.');
      }

      if (user.role !== ROLES.FARMER) {
        throw new ApiError(403, 'This mobile belongs to an officer account. Officers must login using their Employee ID on the Officer tab.');
      }

      if (!user.isActive) {
        throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
      }
    }

    // Generate cryptographic 6-digit OTP (enforces 60-second cooldown)
    let otpPayload;
    try {
      otpPayload = otpManager.generateOtp(cleanMobile, purpose);
    } catch (err) {
      throw new ApiError(err.statusCode || 429, err.message);
    }

    // Dispatch real SMS via SMS gateway
    const smsResult = await smsService.sendOtp(cleanMobile, otpPayload.rawOtp);

    // Return fresh dynamic random OTP in response for development / demo mode testing
    const demoOtpCode = otpPayload.rawOtp;

    res.json(
      new ApiResponse(200, {
        mobile: cleanMobile,
        resendCooldown: 60,
        smsDelivered: Boolean(smsResult?.delivered),
        gatewayConfigured: smsService.isConfigured(),
        demoOtp: demoOtpCode,
      }, `OTP sent to +91 ${cleanMobile.slice(0, 2)}******${cleanMobile.slice(-2)}. (Demo OTP: ${demoOtpCode})`)
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-otp — Verify entered OTP against cryptographic store
const verifyOtp = async (req, res, next) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !/^[6-9]\d{9}$/.test(String(mobile).trim())) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number.');
    }
    if (!otp || String(otp).trim().length !== 6) {
      throw new ApiError(400, 'Please enter a valid 6-digit OTP.');
    }

    const cleanMobile = String(mobile).trim();
    const cleanOtp = String(otp).trim();

    try {
      const result = otpManager.verifyOtp(cleanMobile, cleanOtp);
      res.json(
        new ApiResponse(200, {
          verified: true,
          mobile: cleanMobile,
          verificationToken: result.verificationToken,
        }, 'Mobile number verified successfully.')
      );
    } catch (err) {
      throw new ApiError(err.statusCode || 400, err.message);
    }
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/register  — Farmer self-registration with strictly 5 fields + OTP verification
const register = async (req, res, next) => {
  try {
    const {
      name, mobile, otp,
      state, district, address,
      password,
    } = req.body;

    const cleanMobile = String(mobile).trim();

    // Verify OTP state: must either have already been verified in this session or verify successfully
    const cleanOtp = String(otp || '').trim();
    const isAlreadyVerified = otpManager.isVerified(cleanMobile);
    if (!isAlreadyVerified) {
      try {
        otpManager.verifyOtp(cleanMobile, cleanOtp);
      } catch (err) {
        throw new ApiError(400, `Mobile OTP verification required: ${err.message}`);
      }
    }

    // Consume the OTP token
    otpManager.consume(cleanMobile);

    // Default password if not provided
    const userPassword = password || `Kisan@${cleanMobile.slice(-4)}`;

    // Create user or update existing farmer
    let user = await User.findOne({ mobile: cleanMobile });
    if (user) {
      user.name = name.trim();
      user.state = state.trim();
      user.district = district.trim();
      if (password) user.password = userPassword;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        mobile: cleanMobile,
        password: userPassword,
        role: ROLES.FARMER,
        level: ROLE_LEVELS[ROLES.FARMER],
        state: state.trim(),
        district: district.trim(),
      });
    }

    // Create or update farmer profile
    await FarmerProfile.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        state: state.trim(),
        district: district.trim(),
        address: address.trim(),
        isProfileComplete: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const { accessToken } = generateTokens(user._id, user.role);

    res.status(201).json(
      new ApiResponse(201, { user, accessToken }, 'Registration successful! Welcome to Kisan Procurement Connect.')
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login — Dual login: OTP for farmers, Employee ID + Password for officers
const login = async (req, res, next) => {
  try {
    const { mobile, employeeId, password, otp } = req.body;

    if (!mobile && !employeeId) {
      throw new ApiError(400, 'Please provide either mobile number or Employee ID.');
    }

    let user;

    if (employeeId) {
      // ── Officer login via Employee ID / Email / Mobile + Password ──
      if (!password) {
        throw new ApiError(400, 'Password is required for officer login.');
      }
      const rawId = String(employeeId).trim();
      const cleanId = rawId.toUpperCase();

      // State code normalization mapping (e.g. PUN <-> PB, HRY <-> HR, RAJ <-> RJ)
      const aliases = {
        'SPO-PUN-001': 'SPO-PB-001',
        'SPO-PB-001': 'SPO-PUN-001',
        'SPO-HRY-001': 'SPO-HR-001',
        'SPO-HR-001': 'SPO-HRY-001',
        'SPO-RAJ-001': 'SPO-RJ-001',
        'SPO-RJ-001': 'SPO-RAJ-001',
      };
      const aliasedId = aliases[cleanId];

      const lookupQueries = [
        { employeeId: cleanId },
        ...(aliasedId ? [{ employeeId: aliasedId }] : []),
        { email: new RegExp(`^${rawId}$`, 'i') },
        { mobile: rawId },
      ];

      user = await User.findOne({ $or: lookupQueries }).select('+password');
      if (!user) {
        throw new ApiError(401, 'Invalid Employee ID or password.');
      }
      if (!isOfficerRole(user.role)) {
        throw new ApiError(403, 'Employee ID login is only for officers and staff.');
      }
      if (!user.isActive) {
        throw new ApiError(403, 'Your account has been deactivated. Please contact your supervising officer.');
      }
      const isPasswordCorrect = await user.comparePassword(password);
      if (!isPasswordCorrect) {
        throw new ApiError(401, 'Invalid Employee ID or password.');
      }
    } else {
      // ── Farmer login via Mobile Number + OTP ──
      const cleanMobile = String(mobile).trim();
      user = await User.findOne({ mobile: cleanMobile }).select('+password');
      if (!user) {
        throw new ApiError(401, 'Mobile number not found. Please register first.');
      }
      if (user.role !== ROLES.FARMER) {
        throw new ApiError(403, 'This login is for farmers only. Officers must login using their Employee ID on the Officer tab.');
      }
      if (!user.isActive) {
        throw new ApiError(403, 'Your account has been deactivated. Please contact support.');
      }

      // Secure verification of entered OTP (or password fallback if explicitly provided)
      const cleanOtp = String(otp || '').trim();
      let isVerified = false;

      if (cleanOtp) {
        try {
          otpManager.verifyOtp(cleanMobile, cleanOtp);
          otpManager.consume(cleanMobile);
          isVerified = true;
        } catch (err) {
          throw new ApiError(err.statusCode || 401, err.message);
        }
      } else if (password) {
        const isPassOk = await user.comparePassword(password);
        if (isPassOk) isVerified = true;
      }

      if (!isVerified) {
        throw new ApiError(401, 'Please provide the valid 6-digit OTP sent to your mobile.');
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const { accessToken } = generateTokens(user._id, user.role);
    const userObj = user.toJSON();

    // Include mustChangePassword flag so client can force password change
    res.json(
      new ApiResponse(200, {
        user: userObj,
        accessToken,
        mustChangePassword: !!user.mustChangePassword,
      }, 'Login successful.')
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/change-password — For first-login password change
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) throw new ApiError(404, 'User not found.');

    const isCorrect = await user.comparePassword(currentPassword);
    if (!isCorrect) throw new ApiError(400, 'Current password is incorrect.');

    if (!newPassword || newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters.');
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json(new ApiResponse(200, null, 'Password changed successfully.'));
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    // JWT is stateless; client deletes the token
    // In production, maintain a token blacklist or use refresh tokens
    res.json(new ApiResponse(200, null, 'Logged out successfully.'));
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === ROLES.FARMER) {
      profile = await FarmerProfile.findOne({ userId: user._id })
        .populate('crops.cropId', 'name mspPrice unit');
    } else if (isOfficerRole(user.role)) {
      profile = await OfficerProfile.findOne({ userId: user._id })
        .populate('centreId', 'name district');
    }

    res.json(new ApiResponse(200, {
      user,
      profile,
      roleLabel: ROLE_LABELS[user.role] || user.role,
    }));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  sendOtp,
  verifyOtp,
  logout,
  getMe,
  changePassword,
  registerValidation,
  loginValidation,
};
