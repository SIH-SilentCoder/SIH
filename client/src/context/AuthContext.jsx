import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';
import toast from 'react-hot-toast';

// Role constants — must match server/utils/roleHierarchy.js
export const ROLES = {
  CENTRAL_ADMIN: 'central_admin',
  STATE_OFFICER: 'state_officer',
  DISTRICT_OFFICER: 'district_officer',
  CENTRE_HEAD: 'centre_head',
  PROCUREMENT_OFFICER: 'procurement_officer',
  QUALITY_STAFF: 'quality_staff',
  DATA_STAFF: 'data_staff',
  GATE_STAFF: 'gate_staff',
  FARMER: 'farmer',
};

export const ROLE_LABELS = {
  [ROLES.CENTRAL_ADMIN]: 'Central Procurement Organization',
  [ROLES.STATE_OFFICER]: 'State Procurement / Nodal Department',
  [ROLES.DISTRICT_OFFICER]: 'District Nodal Officer',
  [ROLES.CENTRE_HEAD]: 'Procurement Center Head',
  [ROLES.PROCUREMENT_OFFICER]: 'Procurement Officer',
  [ROLES.QUALITY_STAFF]: 'Quality & Weighing Staff',
  [ROLES.DATA_STAFF]: 'Data / System Staff',
  [ROLES.GATE_STAFF]: 'Gate / Verification Staff',
  [ROLES.FARMER]: 'Farmer',
};

export const OFFICER_ROLES = [
  ...Object.values(ROLES).filter((r) => r !== ROLES.FARMER),
  'admin',
  'officer',
];

export const ADMIN_ROLES = [
  ROLES.CENTRAL_ADMIN,
  ROLES.STATE_OFFICER,
  ROLES.DISTRICT_OFFICER,
  'admin',
];

export const CREATOR_ROLES = [
  ROLES.CENTRAL_ADMIN,
  ROLES.STATE_OFFICER,
  ROLES.DISTRICT_OFFICER,
  ROLES.CENTRE_HEAD,
  'admin',
];

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));

  // Load user from stored token on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Optionally verify token with server
          const res = await authService.getMe();
          setUser(res.data.data.user);
        } catch {
          // Token invalid, clear storage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Dual login:
   * - Farmer: login({ mobile, password })
   * - Officer: login({ employeeId, password })
   */
  const login = useCallback(async (credentials) => {
    const res = await authService.login(credentials);
    const { user: userData, accessToken, mustChangePassword } = res.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    return { ...userData, mustChangePassword };
  }, []);

  const register = useCallback(async (formData) => {
    const res = await authService.register(formData);
    const { user: userData, accessToken } = res.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore server error, proceed with local logout
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully.');
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    // ── Role helpers ──
    isFarmer: user?.role === ROLES.FARMER,
    isOfficer: OFFICER_ROLES.includes(user?.role),
    isCentralAdmin: user?.role === ROLES.CENTRAL_ADMIN,
    isStateOfficer: user?.role === ROLES.STATE_OFFICER,
    isDistrictOfficer: user?.role === ROLES.DISTRICT_OFFICER,
    isCentreHead: user?.role === ROLES.CENTRE_HEAD,
    isProcurementOfficer: user?.role === ROLES.PROCUREMENT_OFFICER,
    isQualityStaff: user?.role === ROLES.QUALITY_STAFF,
    isDataStaff: user?.role === ROLES.DATA_STAFF,
    isGateStaff: user?.role === ROLES.GATE_STAFF,
    isAdmin: user?.role === ROLES.CENTRAL_ADMIN, // backward compat
    roleLabel: ROLE_LABELS[user?.role] || user?.role,
    // ── Actions ──
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
