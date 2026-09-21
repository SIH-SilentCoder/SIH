import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  sendOtp: (data) => api.post('/auth/send-otp', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const farmerService = {
  getProfile: () => api.get('/farmers/profile'),
  updateProfile: (data) => api.put('/farmers/profile', data),
  getHistory: (params) => api.get('/farmers/history', { params }),
  sendAadhaarOtp: (data) => api.post('/farmers/aadhaar/send-otp', data),
  verifyAadhaarOtp: (data) => api.post('/farmers/aadhaar/verify-otp', data),
  sendKisanIdOtp: (data) => api.post('/farmers/kisan-id/send-otp', data),
  verifyKisanIdOtp: (data) => api.post('/farmers/kisan-id/verify-otp', data),
  verifyKisanId: (data) => api.post('/farmers/kisan-id/verify-otp', data),
  checkNpciStatus: () => api.post('/farmers/check-npci-status'),
  submitKyc: (data) => api.post('/farmers/submit-kyc', data),
  getKycStatus: () => api.get('/farmers/kyc-status'),
};

export const centreService = {
  getCentres: (params) => api.get('/centres', { params }),
  getCentreById: (id) => api.get(`/centres/${id}`),
  getCentreSlots: (id, date) => api.get(`/centres/${id}/slots`, { params: { date } }),
};

export const cropService = {
  getCrops: () => api.get('/crops'),
};

export const bookingService = {
  createBooking: (data) => api.post('/bookings', data),
  getBookings: (params) => api.get('/bookings', { params }),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  cancelBooking: (id, data) => api.put(`/bookings/${id}/cancel`, data),
};

export const queueService = {
  getLiveQueue: (centreId, date) => api.get(`/queue/${centreId}/live`, { params: { date } }),
  getMyPosition: (centreId, token, date) =>
    api.get(`/queue/${centreId}/position`, { params: { token, date } }),
  markArrived: (token, centreId) => api.put(`/queue/${token}/arrived`, { centreId }),
  callToken: (token, centreId, counter) => api.put(`/queue/${token}/call`, { centreId, counter }),
  completeToken: (token, centreId) => api.put(`/queue/${token}/complete`, { centreId }),
  callNext: (centreId, counter) => api.post('/queue/call-next', { centreId, counter }),
  getGateMetrics: (params) => api.get('/queue/gate-metrics', { params }),
  lookupGateToken: (data) => api.post('/queue/lookup-gate-token', data),
  verifyGateEntry: (token, data) => api.put(`/queue/verify-gate-entry/${token}`, data),
};

export const procurementService = {
  getProcurement: (id) => api.get(`/procurements/${id}`),
  createProcurement: (data) => api.post('/procurements', data),
  updateStatus: (id, data) => api.put(`/procurements/${id}/status`, data),
  forwardToPayment: (id) => api.put(`/procurements/${id}/forward-payment`),
};

export const paymentService = {
  getPayment: (id) => api.get(`/payments/${id}`),
  getMyPayments: () => api.get('/payments/my'),
  updateStatus: (id, action, data) => api.put(`/payments/${id}/status`, { action, ...data }),
};

export const notificationService = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const officerService = {
  getDashboard: () => api.get('/officer/dashboard'),
  getBookings: (params) => api.get('/officer/bookings', { params }),
  getKycApprovals: (params) => api.get('/officer/kyc-approvals', { params }),
  updateKycApproval: (profileId, data) => api.put(`/officer/kyc-approvals/${profileId}`, data),
};

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getFarmers: (params) => api.get('/admin/farmers', { params }),
  toggleFarmerStatus: (id) => api.put(`/admin/farmers/${id}/toggle`),
  registerFarmer: (data) => api.post('/admin/farmers/register', data),
  getOfficers: () => api.get('/admin/officers'),
  createOfficer: (data) => api.post('/admin/officers', data),
  appointOfficer: (data) => api.post('/admin/officers/appoint', data),
  getCentres: () => api.get('/admin/centres'),
  createCentre: (data) => api.post('/admin/centres', data),
  updateCentre: (id, data) => api.put(`/admin/centres/${id}`, data),
  deleteCentre: (id) => api.delete(`/admin/centres/${id}`),
  getAllBookings: (params) => api.get('/admin/bookings', { params }),
  getCrops: () => api.get('/admin/crops'),
  createCrop: (data) => api.post('/admin/crops', data),
  updateCrop: (id, data) => api.put(`/admin/crops/${id}`, data),
  deleteCrop: (id) => api.delete(`/admin/crops/${id}`),
  generateSlots: (data) => api.post('/admin/slots/generate', data),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getStates: () => api.get('/admin/states'),
  createState: (data) => api.post('/admin/states', data),
  createStateOfficer: (data) => api.post('/admin/state-officers', data),
};

export const staffService = {
  getCreatableRoles: () => api.get('/staff/creatable-roles'),
  createSubordinate: (data) => api.post('/staff/create', data),
  getSubordinates: (params) => api.get('/staff/subordinates', { params }),
  getHierarchy: () => api.get('/staff/hierarchy'),
  toggleSubordinate: (id) => api.put(`/staff/${id}/toggle`),
  resetPassword: (id) => api.put(`/staff/${id}/reset-password`),
};

export const aiService = {
  chat: (message, history = []) => api.post('/ai/chat', { message, history }),
};


