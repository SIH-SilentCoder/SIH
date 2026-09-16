import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Farmer Pages
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import BookSlotPage from './pages/farmer/BookSlotPage';
import MyBookingsPage from './pages/farmer/MyBookingsPage';
import BookingDetailPage from './pages/farmer/BookingDetailPage';
import ProcurementHistoryPage from './pages/farmer/ProcurementHistoryPage';
import NotificationsPage from './pages/farmer/NotificationsPage';
import ProfilePage from './pages/farmer/ProfilePage';
import AiAssistantPage from './pages/farmer/AiAssistantPage';
import FarmerKycPage from './pages/farmer/FarmerKycPage';

// Officer Pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import OfficerBookingsPage from './pages/officer/OfficerBookingsPage';
import OfficerKycApprovalsPage from './pages/officer/OfficerKycApprovalsPage';
import GateEntryVerificationPage from './pages/officer/GateEntryVerificationPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import FarmerManagementPage from './pages/admin/FarmerManagementPage';
import OfficerManagementPage from './pages/admin/OfficerManagementPage';
import CentreManagementPage from './pages/admin/CentreManagementPage';
import BookingManagementPage from './pages/admin/BookingManagementPage';
import CropManagementPage from './pages/admin/CropManagementPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import StaffManagementPage from './pages/admin/StaffManagementPage';
import ProcurementManagementPage from './pages/admin/ProcurementManagementPage';
import StatePerformancePage from './pages/admin/StatePerformancePage';
import ApprovalsPage from './pages/admin/ApprovalsPage';
import PaymentsMonitoringPage from './pages/admin/PaymentsMonitoringPage';
import AlertsPage from './pages/admin/AlertsPage';
import SettingsHelpPage from './pages/admin/SettingsHelpPage';
import { OFFICER_ROLES, ADMIN_ROLES, CREATOR_ROLES } from './context/AuthContext';

// 404 Page
const NotFoundPage = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-200 text-center shadow-sm">
      <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-black">
        404
      </div>
      <h1 className="text-2xl font-black text-gray-900">Page Not Found</h1>
      <p className="text-sm text-gray-500 mt-2">
        The page you requested does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md transition"
        >
          Return Home
        </Link>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Farmer Protected Routes */}
            <Route
              path="/farmer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <FarmerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/book-slot"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <BookSlotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/book"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <BookSlotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/bookings"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/bookings/:id"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <BookingDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/history"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <ProcurementHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/notifications"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/profile"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/ai-assistant"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <AiAssistantPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/farmer/kyc"
              element={
                <ProtectedRoute allowedRoles={['farmer']}>
                  <FarmerKycPage />
                </ProtectedRoute>
              }
            />

            {/* Officer Protected Routes */}
            <Route
              path="/officer/dashboard"
              element={
                <ProtectedRoute allowedRoles={OFFICER_ROLES}>
                  <OfficerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/gate-entry"
              element={
                <ProtectedRoute allowedRoles={OFFICER_ROLES}>
                  <GateEntryVerificationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/bookings"
              element={
                <ProtectedRoute allowedRoles={OFFICER_ROLES}>
                  <OfficerBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/kyc-approvals"
              element={
                <ProtectedRoute allowedRoles={['central_admin', 'state_officer', 'district_officer', 'centre_head', 'procurement_officer', 'admin', 'officer']}>
                  <OfficerKycApprovalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/staff"
              element={
                <ProtectedRoute allowedRoles={OFFICER_ROLES}>
                  <StaffManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Protected Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <StaffManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/farmers"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <FarmerManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/officers"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <OfficerManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/centres"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <CentreManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <BookingManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/crops"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <CropManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/procurement"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <ProcurementManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/states"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <StatePerformancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/approvals"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <ApprovalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <PaymentsMonitoringPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/alerts"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <AlertsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <SettingsHelpPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/help"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <SettingsHelpPage />
                </ProtectedRoute>
              }
            />

            {/* 404 Catch All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
