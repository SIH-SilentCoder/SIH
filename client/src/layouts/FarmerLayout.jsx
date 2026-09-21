import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, ClipboardList, History, Bell, User,
  LogOut, Menu, X, Wheat, ChevronRight, Home, Sparkles, ShieldCheck, CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services';

const navItems = [
  { to: '/farmer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farmer/kyc', icon: ShieldCheck, label: 'Farmer KYC' },
  { to: '/farmer/ai-assistant', icon: Sparkles, label: 'AI Assistant' },
  { to: '/farmer/book', icon: Calendar, label: 'Book a Slot' },
  { to: '/farmer/bookings', icon: ClipboardList, label: 'All Bookings' },
  { to: '/farmer/history', icon: History, label: 'History' },
  { to: '/farmer/notifications', icon: Bell, label: 'Notifications' },
  { to: '/farmer/profile', icon: User, label: 'My Profile' },
  { to: '/farmer/payment-history', icon: CreditCard, label: 'Payment History' },
];

const FarmerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationService.getNotifications({ unreadOnly: 'true', limit: 1 });
        setUnreadCount(res.data.data.unreadCount || 0);
      } catch {
        // ignore
      }
    };
    fetchUnread();
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`${mobile ? 'flex flex-col h-full' : 'flex flex-col h-full'}`}>
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wheat className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Kisan Connect</p>
            <p className="text-xs text-gray-500">Procurement Portal</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 mx-3 mt-3 bg-primary-50 rounded-lg">
        <p className="text-xs text-primary-600 font-medium">Logged in as Farmer</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
        <p className="text-xs text-gray-500 truncate">{user?.mobile}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => mobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              isActive ? 'nav-item-active flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-primary-700 bg-primary-50 transition-all' :
              'nav-item'
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {label === 'Notifications' && unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3 space-y-1">
        <a href="/" className="nav-item">
          <Home className="w-5 h-5" />
          <span>Home</span>
        </a>
        <button onClick={handleLogout} className="nav-item w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700">
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200 z-30">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl">
            <div className="absolute top-3 right-3">
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:pl-64">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
              <Wheat className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">Kisan Connect</span>
          </div>
          {unreadCount > 0 && (
            <NavLink to="/farmer/notifications" className="ml-auto">
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            </NavLink>
          )}
        </div>

        <div className="p-4 md:p-6 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default FarmerLayout;
