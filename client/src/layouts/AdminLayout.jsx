import { useState } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Building, Building2, Users, Wheat,
  ShieldCheck, CheckSquare, CreditCard, BarChart3, Bell, Settings,
  HelpCircle, LogOut, Menu, X, ChevronDown, ChevronRight, UserCog,
  FileText, AlertTriangle, Landmark, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const getNavSections = (user) => {
  const isStateOfficer = user?.role === 'state_officer';

  return [
    {
      title: 'Core Command',
      items: [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: isStateOfficer ? `${user?.state || 'State'} Dashboard` : 'Dashboard' },
      ],
    },
    {
      title: 'Procurement & Monitoring',
      items: [
        {
          to: '/admin/procurement',
          icon: Truck,
          label: 'Procurement',
          badge: 'Live',
          subItems: [
            { to: '/admin/procurement?tab=overview', label: 'Procurement Overview' },
            ...(!isStateOfficer ? [{ to: '/admin/procurement?tab=statewise', label: 'State-wise Procurement' }] : []),
            { to: '/admin/procurement?tab=commodity', label: 'Crop / Commodity' },
          ],
        },
        ...(!isStateOfficer ? [
          {
            to: '/admin/states',
            icon: Landmark,
            label: 'States',
            subItems: [
              { to: '/admin/states?tab=overview', label: 'State Overview' },
              { to: '/admin/states?tab=performance', label: 'State Performance' },
            ],
          },
        ] : []),
        {
          to: '/admin/centres',
          icon: Building2,
          label: isStateOfficer ? `${user?.state || 'State'} Mandis / Centres` : 'Procurement Centres',
          subItems: [
            { to: '/admin/centres?tab=overview', label: 'Centre Overview' },
            { to: '/admin/centres?tab=utilization', label: 'Capacity & Performance' },
          ],
        },
        {
          to: '/admin/farmers',
          icon: Users,
          label: 'Farmers',
          subItems: [
            { to: '/admin/farmers?tab=registered', label: 'Registered Farmers' },
            { to: '/admin/farmers?tab=verified', label: 'Verified Farmers' },
            { to: '/admin/farmers?tab=statistics', label: 'Farmer Statistics' },
          ],
        },
        {
          to: '/admin/crops',
          icon: Wheat,
          label: 'Crops / Commodities',
          subItems: [
            { to: '/admin/crops?tab=list', label: 'Commodity List' },
            { to: '/admin/crops?tab=msp', label: 'MSP & Guidelines' },
          ],
        },
      ],
    },
    {
      title: 'Governance & Oversight',
      items: [
        ...(!isStateOfficer ? [
          {
            to: '/admin/org-structure',
            icon: Landmark,
            label: 'Apex Org Hierarchy',
            badge: 'Central',
            badgeColor: 'bg-emerald-100 text-emerald-800',
          },
          {
            to: '/admin/state-governance',
            icon: Landmark,
            label: 'State Expansion & Governance',
            badge: 'New',
            badgeColor: 'bg-rose-100 text-rose-800',
            subItems: [
              { to: '/admin/state-governance?tab=states', label: 'Managed States' },
              { to: '/admin/state-governance?tab=officers', label: 'State Officers (SPO)' },
            ],
          },
        ] : []),
        {
          to: '/admin/staff',
          icon: UserCog,
          label: isStateOfficer ? `${user?.state || 'State'} Officers & Appointments` : 'Officers & Administration',
          subItems: [
            { to: '/admin/staff?tab=subordinates', label: 'Officer Directory' },
            ...(isStateOfficer ? [{ to: '/admin/staff?tab=create', label: 'Officer Appointments' }] : []),
            { to: '/admin/staff?tab=hierarchy', label: 'Hierarchy Tree' },
          ],
        },
        {
          to: '/state/department-proposals',
          icon: ShieldCheck,
          label: 'State Proposals & Approvals',
          badge: 'Workflow',
          badgeColor: 'bg-emerald-100 text-emerald-800',
        },
        ...(!isStateOfficer ? [
          {
            to: '/admin/approvals',
            icon: CheckSquare,
            label: 'Approvals',
            badge: '3',
            badgeColor: 'bg-amber-100 text-amber-800',
            subItems: [
              { to: '/admin/approvals?tab=pending', label: 'Pending Approvals' },
              { to: '/admin/approvals?tab=approved', label: 'Approved Actions' },
              { to: '/admin/approvals?tab=rejected', label: 'Rejected Requests' },
            ],
          },
        ] : []),
        {
          to: '/admin/payments',
          icon: CreditCard,
          label: 'Payments',
          subItems: [
            { to: '/admin/payments?tab=overview', label: 'Payment Overview' },
            { to: '/admin/payments?tab=pending', label: 'Pending DBT Disbursals' },
            { to: '/admin/payments?tab=completed', label: 'Settled Payments' },
          ],
        },
        {
          to: '/admin/analytics',
          icon: BarChart3,
          label: 'Reports & Analytics',
        },
        {
          to: '/admin/alerts',
          icon: Bell,
          label: 'Alerts & Notifications',
          badge: 'Critical',
          badgeColor: 'bg-rose-100 text-rose-800',
        },
      ],
    },
    {
      title: 'System & Support',
      items: [
        { to: '/admin/settings', icon: Settings, label: 'Settings' },
        { to: '/admin/help', icon: HelpCircle, label: 'Help & Support' },
      ],
    },
  ];
};

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({
    '/admin/procurement': true,
    '/admin/states': false,
    '/admin/centres': false,
    '/admin/farmers': false,
    '/admin/crops': false,
    '/admin/staff': false,
    '/admin/approvals': false,
    '/admin/payments': false,
  });
  const { user, roleLabel, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isStateOfficer = user?.role === 'state_officer';
  const navSections = getNavSections(user);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleSubMenu = (to) => {
    setExpandedMenus((prev) => ({ ...prev, [to]: !prev[to] }));
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0b1329] text-slate-300 select-none">
      {/* Emblem & Portal Identity */}
      <div className="p-4 border-b border-slate-800/80 bg-[#070d1e]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-primary-700 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
            <Wheat className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-400 leading-tight">
              {isStateOfficer ? `${user?.state || 'State'} Govt. Initiative` : 'Government of India'}
            </p>
            <p className="text-xs font-bold text-white leading-tight truncate mt-0.5">
              {isStateOfficer ? `${user?.state || 'State'} Mandi Board` : 'Central Procurement Org.'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {isStateOfficer ? 'State Nodal Department' : 'Food & Public Distribution'}
            </p>
          </div>
        </div>
      </div>

      {/* Logged in Officer Credential Card */}
      <div className="p-3 mx-3 mt-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            {roleLabel || (isStateOfficer ? 'State Nodal Officer' : 'Central Officer')}
          </span>
          {user?.employeeId && (
            <span className="text-[10px] font-mono font-bold text-slate-300">
              {user.employeeId}
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-white truncate mt-1">{user?.name || 'Administrator'}</p>
        <p className="text-[10px] text-slate-400 truncate">
          {isStateOfficer ? `Jurisdiction: ${user?.state || 'State'} Only` : 'HQ: New Delhi • Executive Command'}
        </p>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2 mb-1.5">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                const isExpanded = expandedMenus[item.to];
                const Icon = item.icon;

                return (
                  <div key={item.to} className="space-y-0.5">
                    <div
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/20 text-white border border-blue-500/30'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                      onClick={() => {
                        if (item.subItems) {
                          toggleSubMenu(item.to);
                        } else {
                          navigate(item.to);
                          setSidebarOpen(false);
                        }
                      }}
                    >
                      <NavLink
                        to={item.to}
                        onClick={(e) => {
                          if (item.subItems) {
                            e.preventDefault();
                            toggleSubMenu(item.to);
                          }
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </NavLink>

                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              item.badgeColor || 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.subItems && (
                          <span className="text-slate-500 hover:text-slate-300">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sub-menu items */}
                    {item.subItems && isExpanded && (
                      <div className="pl-7 pr-1 py-1 space-y-0.5 border-l border-slate-800 ml-4 animate-fadeIn">
                        {item.subItems.map((sub, subIdx) => {
                          const isSubActive = location.pathname + location.search === sub.to;
                          return (
                            <Link
                              key={subIdx}
                              to={sub.to}
                              onClick={() => setSidebarOpen(false)}
                              className={`block py-1.5 px-2 text-[11px] rounded transition-colors ${
                                isSubActive
                                  ? 'text-emerald-400 font-bold bg-emerald-950/40'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                              }`}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout Action */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070d1e]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 w-full text-xs font-semibold rounded-lg text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-all border border-rose-900/40"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit CPO Console (Logout)</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Official Government Banner Header */}
      <header className="sticky top-0 z-30 bg-[#0b1329] text-white border-b border-slate-800 shadow-md">
        {/* Subtle Indian Tricolor accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-white to-emerald-600" />
        
        <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Ministry Brand text */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">
                  Government of India
                </span>
                <span className="hidden sm:inline text-slate-500 text-xs">•</span>
                <span className="hidden sm:inline text-[11px] text-slate-300">
                  Ministry of Consumer Affairs, Food &amp; Public Distribution
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Central Procurement Organisation</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-widest hidden md:inline">
                  National CPO Console
                </span>
              </h1>
            </div>
          </div>

          {/* Quick Central Status Indicators */}
          <div className="flex items-center gap-3 flex-shrink-0 text-xs">
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>National Procurement Grid: Active</span>
            </div>

            <Link
              to="/admin/alerts"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 relative transition"
              title="Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#0b1329]" />
            </Link>

            <Link
              to="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Page Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Fixed Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[#0b1329] border-r border-slate-800 flex-shrink-0">
          <SidebarContent />
        </aside>

        {/* Mobile Slide-over Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0b1329] z-10">
              <div className="absolute top-2 right-2 z-20">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Dynamic Page Content Canvas */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
