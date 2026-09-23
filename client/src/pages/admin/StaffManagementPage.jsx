import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, ChevronDown, ChevronRight,
  ToggleLeft, ToggleRight, KeyRound, Copy, Search,
  Building2, MapPin, BadgeCheck, RefreshCw, Eye,
} from 'lucide-react';
import { useAuth, ROLE_LABELS, ROLES } from '../../context/AuthContext';
import { staffService, adminService } from '../../services';
import { extractError } from '../../utils/constants';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Input, { Select } from '../../components/common/Input';
import AdminLayout from '../../layouts/AdminLayout';
import OfficerLayout from '../../layouts/OfficerLayout';

const StaffManagementPage = () => {
  const { user, roleLabel } = useAuth();
  const [tab, setTab] = useState('subordinates'); // subordinates | create | hierarchy
  const [subordinates, setSubordinates] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [hierarchySummary, setHierarchySummary] = useState({});
  const [creatableRoles, setCreatableRoles] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '', mobile: '', email: '', targetRole: '',
    state: '', district: '', centreId: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);

  const fetchSubordinates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffService.getSubordinates({ search: searchTerm });
      setSubordinates(res.data.data.subordinates);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const fetchHierarchy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffService.getHierarchy();
      setHierarchy(res.data.data.hierarchy);
      setHierarchySummary(res.data.data.summary);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCreatableRoles = useCallback(async () => {
    try {
      const res = await staffService.getCreatableRoles();
      setCreatableRoles(res.data.data.roles);
    } catch (err) {
      // silently fail
    }
  }, []);

  const fetchCentres = useCallback(async () => {
    try {
      const res = await adminService.getCentres();
      setCentres(res.data.data.centres || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCreatableRoles();
    fetchCentres();
  }, [fetchCreatableRoles, fetchCentres]);

  useEffect(() => {
    if (tab === 'subordinates') fetchSubordinates();
    else if (tab === 'hierarchy') fetchHierarchy();
  }, [tab, fetchSubordinates, fetchHierarchy]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return toast.error('Name is required');
    if (!createForm.targetRole) return toast.error('Please select a role');

    setCreateLoading(true);
    try {
      const res = await staffService.createSubordinate(createForm);
      const data = res.data.data;
      setCreatedAccount(data);
      toast.success(res.data.message || 'Account created!');
      setCreateForm({ name: '', mobile: '', email: '', targetRole: '', state: '', district: '', centreId: '' });
      fetchSubordinates();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await staffService.toggleSubordinate(id);
      toast.success(res.data.message);
      fetchSubordinates();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleResetPassword = async (id, name) => {
    if (!confirm(`Reset password for ${name}? They will need to change it on next login.`)) return;
    try {
      const res = await staffService.resetPassword(id);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const isAdminTier = ['central_admin', 'state_officer', 'district_officer', 'admin'].includes(user?.role);
  const Layout = isAdminTier ? AdminLayout : OfficerLayout;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-sm text-gray-500">
              Logged in as <span className="font-medium text-primary-600">{roleLabel}</span>
              {user?.employeeId && <span className="text-gray-400 ml-1">({user.employeeId})</span>}
            </p>
          </div>
        </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {[
          { id: 'subordinates', label: 'My Subordinates', icon: Users },
          ...(user?.role === 'state_officer' ? [{ id: 'create', label: 'Create Account', icon: UserPlus }] : []),
          { id: 'hierarchy', label: 'Hierarchy Tree', icon: Shield },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all
              ${tab === id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: Subordinates ── */}
      {tab === 'subordinates' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <Input
                id="search"
                placeholder="Search by name, ID or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button variant="secondary" onClick={fetchSubordinates} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : subordinates.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No subordinates found</p>
              <p className="text-gray-400 text-sm mt-1">Create new staff accounts using the "Create Account" tab</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {subordinates.map((sub) => (
                <div
                  key={sub._id}
                  className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all
                    ${!sub.isActive ? 'opacity-60 bg-gray-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 truncate">{sub.name}</p>
                      {sub.employeeId && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-md text-xs font-bold">
                          {sub.employeeId}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${sub.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {sub.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{sub.roleLabel}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                      {sub.mobile && <span>📱 {sub.mobile}</span>}
                      {sub.district && <span>📍 {sub.district}</span>}
                      {sub.state && <span>🗺️ {sub.state}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(sub._id)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title={sub.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {sub.isActive
                        ? <ToggleRight className="w-5 h-5 text-green-600" />
                        : <ToggleLeft className="w-5 h-5 text-gray-400" />
                      }
                    </button>
                    <button
                      onClick={() => handleResetPassword(sub._id, sub.name)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Reset password"
                    >
                      <KeyRound className="w-5 h-5 text-amber-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Create Account ── */}
      {tab === 'create' && user?.role === 'state_officer' && (
        <div className="max-w-lg mx-auto">
          {creatableRoles.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No creatable roles</p>
              <p className="text-gray-400 text-sm mt-1">Your role does not have permission to create subordinate accounts</p>
            </div>
          ) : (
            <>
              {/* Success card */}
              {createdAccount && (
                <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-2xl">
                  <p className="font-bold text-green-800 text-lg mb-3">✅ Account Created Successfully</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-green-700">Name:</span>
                      <span className="font-semibold text-green-900">{createdAccount.user?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-700">Role:</span>
                      <span className="font-semibold text-green-900">{createdAccount.roleLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-700">Employee ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-900 text-base">{createdAccount.employeeId}</span>
                        <button onClick={() => copyToClipboard(createdAccount.employeeId)} className="text-green-600 hover:text-green-800">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-green-700">Default Password:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-900">{createdAccount.defaultPassword}</span>
                        <button onClick={() => copyToClipboard(createdAccount.defaultPassword)} className="text-green-600 hover:text-green-800">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-3">
                    ⚠️ Share the Employee ID and default password with the new staff member. They must change their password on first login.
                  </p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => setCreatedAccount(null)}>
                    Dismiss
                  </Button>
                </div>
              )}

              <div className="card p-6">
                <h3 className="font-bold text-gray-900 mb-1">Create New Staff Account</h3>
                <p className="text-sm text-gray-500 mb-5">
                  As <span className="font-medium text-primary-600">{roleLabel}</span>, you can create:
                  {' '}{creatableRoles.map((r) => r.label).join(', ')}
                </p>

                <form onSubmit={handleCreate} className="space-y-4">
                  <Select
                    id="targetRole"
                    label="Role"
                    value={createForm.targetRole}
                    onChange={(e) => setCreateForm({ ...createForm, targetRole: e.target.value })}
                    required
                  >
                    <option value="">Select role to create</option>
                    {creatableRoles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </Select>

                  <Input
                    id="staffName"
                    label="Full Name"
                    placeholder="Enter full name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                    leftIcon={<BadgeCheck className="w-4 h-4" />}
                  />

                  <Input
                    id="staffMobile"
                    label="Mobile Number (Optional)"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={createForm.mobile}
                    onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
                    maxLength={10}
                    inputMode="numeric"
                  />

                  <Input
                    id="staffEmail"
                    label="Email Address (Optional)"
                    type="email"
                    placeholder="email@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  />

                  {createForm.targetRole && ['state_officer'].includes(createForm.targetRole) && (
                    <Input
                      id="staffState"
                      label="State"
                      placeholder="e.g. Punjab, Madhya Pradesh"
                      value={createForm.state}
                      onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                      required
                      leftIcon={<MapPin className="w-4 h-4" />}
                    />
                  )}

                  {createForm.targetRole && ['district_officer'].includes(createForm.targetRole) && (
                    <Input
                      id="staffDistrict"
                      label="District"
                      placeholder="e.g. Ludhiana, Amritsar"
                      value={createForm.district}
                      onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                      required
                      leftIcon={<MapPin className="w-4 h-4" />}
                    />
                  )}

                  {createForm.targetRole && ['centre_head', 'procurement_officer', 'quality_staff', 'data_staff', 'gate_staff'].includes(createForm.targetRole) && (
                    <Select
                      id="staffCentre"
                      label="Procurement Centre"
                      value={createForm.centreId}
                      onChange={(e) => setCreateForm({ ...createForm, centreId: e.target.value })}
                    >
                      <option value="">Select centre (optional — uses your centre)</option>
                      {centres.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} — {c.district}
                        </option>
                      ))}
                    </Select>
                  )}

                  <div className="pt-2">
                    <Button type="submit" variant="primary" loading={createLoading} className="w-full"
                      leftIcon={<UserPlus className="w-4 h-4" />}
                    >
                      Create Account
                    </Button>
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    Default password: <strong>Kisan@123</strong> — user must change on first login
                  </p>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Hierarchy Tree ── */}
      {tab === 'hierarchy' && (
        <div>
          {/* Summary cards */}
          {Object.keys(hierarchySummary).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {Object.entries(hierarchySummary).map(([role, count]) => (
                <div key={role} className="card p-3 text-center">
                  <p className="text-2xl font-bold text-primary-700">{count}</p>
                  <p className="text-xs text-gray-500 mt-1">{role}</p>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : hierarchy.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No hierarchy data</p>
              <p className="text-gray-400 text-sm mt-1">Create subordinates first to build the hierarchy tree</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hierarchy.map((node) => (
                <HierarchyNode key={node._id} node={node} depth={0} />
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </Layout>
  );
};

/** Recursive hierarchy tree node */
const HierarchyNode = ({ node, depth }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.subordinates && node.subordinates.length > 0;

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-gray-50 cursor-pointer
          ${!node.isActive ? 'opacity-50 bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <div className="w-4 h-4 flex-shrink-0" />
        )}

        <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          L{node.level || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{node.name}</p>
            {node.employeeId && (
              <span className="px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded text-xs font-mono">
                {node.employeeId}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{node.roleLabel}</p>
        </div>

        {hasChildren && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs font-medium flex-shrink-0">
            {node.subordinateCount} staff
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.subordinates.map((child) => (
            <HierarchyNode key={child._id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;
