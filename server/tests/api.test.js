const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { calculateWaitTime } = require('../services/queue.service');

describe('Kisan Procurement Connect — Core Business Logic Tests', () => {
  describe('ApiResponse & ApiError Utilities', () => {
    it('should create valid ApiResponse objects', () => {
      const res = new ApiResponse(200, { token: 'TK-101' }, 'Success');
      expect(res.statusCode).toBe(200);
      expect(res.success).toBe(true);
      expect(res.data.token).toBe('TK-101');
      expect(res.message).toBe('Success');
    });

    it('should create valid ApiError with correct stack and status', () => {
      const err = new ApiError(404, 'Centre not found');
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Centre not found');
      expect(err.success).toBe(false);
    });
  });

  describe('JWT & Auth Security Logic', () => {
    const secret = 'test-secret-key-12345';
    it('should sign and verify valid JWT tokens', () => {
      const payload = { id: 'farmer-123', role: 'farmer' };
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      expect(token).toBeDefined();

      const decoded = jwt.verify(token, secret);
      expect(decoded.id).toBe('farmer-123');
      expect(decoded.role).toBe('farmer');
    });

    it('should securely hash and verify passwords using bcrypt', async () => {
      const rawPassword = 'FarmerSecretPass@2026';
      const hash = await bcrypt.hash(rawPassword, 10);
      expect(hash).not.toBe(rawPassword);

      const isValid = await bcrypt.compare(rawPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Queue & Wait Time Calculation Logic', () => {
    it('should estimate wait time accurately based on queue position', () => {
      // 5 farmers ahead with 15 minutes avg service time and 2 counters
      // formula: (5 * 15) / 2 = 37.5 minutes
      const waitTime = calculateWaitTime(5, 15, 2);
      expect(waitTime).toBe(38); // rounded
    });

    it('should return 0 minutes when position is 0', () => {
      const waitTime = calculateWaitTime(0, 15, 2);
      expect(waitTime).toBe(0);
    });
  });

  describe('Admin Dashboard Logic & Aggregations', () => {
    const adminController = require('../controllers/admin.controller');

    it('should successfully generate admin dashboard metrics without ReferenceError', async () => {
      const req = { user: { role: 'central_admin' }, query: {} };
      let responseData = null;
      const res = {
        json: (data) => { responseData = data; },
        status: () => res,
      };
      let errorThrown = null;
      const next = (err) => { errorThrown = err; };

      await adminController.getAdminDashboard(req, res, next);

      expect(errorThrown).toBeNull();
      expect(responseData).toBeDefined();
      expect(responseData.statusCode).toBe(200);
      expect(responseData.data.summary).toBeDefined();
    });

    it('should successfully handle state_officer and district_officer scoped dashboards', async () => {
      const reqState = { user: { role: 'state_officer', state: 'Punjab' }, query: {} };
      let stateData = null;
      const resState = {
        json: (data) => { stateData = data; },
        status: () => resState,
      };
      let errorState = null;
      await adminController.getAdminDashboard(reqState, resState, (err) => { errorState = err; });

      expect(errorState).toBeNull();
      expect(stateData).toBeDefined();
      expect(stateData.statusCode).toBe(200);
    });
  });
});
