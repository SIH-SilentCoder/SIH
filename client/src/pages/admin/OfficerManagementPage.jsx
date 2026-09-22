import { useState, useEffect } from 'react';
import {
  UserPlus, Search, RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff,
  Shield, Building2, AlertCircle, CheckCircle, User, Phone, Mail, Briefcase
} from 'lucide-react';
import { adminService } from '../../services';
import { extractError } from '../../utils/constants';
import AdminLayout from '../../layouts/AdminLayout';
import Button from '../../components/common/Button';
import Input, { Select } from '../../components/common/Input';
import { TableSkeleton } from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

import { INDIAN_STATES, STATE_DISTRICTS } from '../../utils/locations';

// Role hierarchy for appointment
const APPOINTABLE_ROLES = {
  central_admin: [
    { value: 'state_officer', label: 'State Nodal Officer (SPO)' },
    { value: 'district_officer', label: 'District Nodal Officer (DNO)' },
    { value: 'centre_head', label: 'Procurement Centre Head (PCH)' },
    { value: 'procurement_officer', label: 'Procurement Officer (PO)' },
    { value: 'quality_staff', label: 'Quality & Weighing Staff (QWS)' },
    { value: 'data_staff', label: 'Data / System Staff (DSS)' },
    { value: 'gate_staff', label: 'Gate / Verification Staff (GVS)' },
  ],
  state_officer: [
    { value: 'district_officer', label: 'District Nodal Officer (DNO)' },
    { value: 'centre_head', label: 'Procurement Centre Head (PCH)' },
    { value: 'procurement_officer', label: 'Procurement Officer (PO)' },
    { value: 'quality_staff', label: 'Quality & Weighing Staff (QWS)' },
    { value: 'data_staff', label: 'Data / System Staff (DSS)' },
    { value: 'gate_staff', label: 'Gate / Verification Staff (GVS)' },
  ],
  district_officer: [
    { value: 'centre_head', label: 'Procurement Centre Head (PCH)' },
    { value: 'procurement_officer', label: 'Procurement Officer (PO)' },
    { value: 'quality_staff', label: 'Quality & Weighing Staff (QWS)' },
    { value: 'data_staff', label: 'Data / System Staff (DSS)' },
    { value: 'gate_staff', label: 'Gate / Verification Staff (GVS)' },
  ],
  centre_head: [
    { value: 'procurement_officer', label: 'Procurement Officer (PO)' },
    { value: 'quality_staff', label: 'Quality & Weighing Staff (QWS)' },
    { value: 'data_staff', label: 'Data / System Staff (DSS)' },
    { value: 'gate_staff', label: 'Gate / Verification Staff (GVS)' },
  ],
};

const ROLE_BADGE = {
  central_admin: 'bg-purple-100 text-purple-700',
  state_officer: 'bg-blue-100 text-blue-700',
  district_officer: 'bg-indigo-100 text-indigo-700',
  centre_head: 'bg-green-100 text-green-700',
  procurement_officer: 'bg-teal-100 text-teal-700',
  quality_staff: 'bg-amber-100 text-amber-700',
  data_staff: 'bg-sky-100 text-sky-700',
  gate_staff: 'bg-rose-100 text-rose-700',
};

const ROLE_LABEL = {
  central_admin: 'Central Admin',
  state_officer: 'State Officer',
  district_officer: 'District Officer',
  centre_head: 'Centre Head',
  procurement_officer: 'Procurement Officer',
  quality_staff: 'Quality Staff',
  data_staff: 'Data Staff',
  gate_staff: 'Gate Staff',
};

const OfficerManagementPage = () => {
  const { user } = useAuth();
  const [officers, setOfficers] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [lastCreated, setLastCreated] = useState(null);

  const appointableRoles = APPOINTABLE_ROLES[user?.role] || [];

  const [form, setForm] = useState({
    name: '', mobile: '', email: '', role: appointableRoles[0]?.value || '',
    centreId: '', designation: '', district: user?.district || '', state: user?.state || '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [officersRes, centresRes] = await Promise.all([
        adminService.getOfficers(),
        adminService.getCentres(),
      ]);
      setOfficers(officersRes.data?.data?.officers || []);
      setCentres(centresRes.data?.data?.centres || []);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.mobile || !form.role) {
      toast.error('Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await adminService.appointOfficer(form);
      const data = res.data?.data;
      setLastCreated(data);
      toast.success(`Officer appointed! Employee ID: ${data?.employeeId}`);
      setShowForm(false);
      setForm({ name: '', mobile: '', email: '', role: appointableRoles[0]?.value || '', centreId: '', designation: '', district: user?.district || '', state: user?.state || '' });
      fetchData();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const filtered = officers.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.user?.name?.toLowerCase().includes(q) ||
      o.user?.mobile?.includes(q) ||
      o.profile?.employeeId?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Officer Management</h1>
          <p className="page-subtitle">
            Appoint and manage officers under your jurisdiction
          </p>
        </div>
        {appointableRoles.length > 0 && (
          <Button
            variant="primary"
            onClick={() => setShowForm(!showForm)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Appoint Officer
          </Button>
        )}
      </div>

      {/* Last Created Credentials Banner */}
      {lastCreated && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800 text-sm">Officer Appointed Successfully!</p>
              <p className="text-sm text-emerald-700 mt-1">
                Share these credentials with the officer:
              </p>
              <div className="mt-2 p-3 bg-white rounded-lg border border-emerald-200 font-mono text-sm">
                <p>Employee ID: <strong>{lastCreated.employeeId}</strong></p>
                <p>Default Password: <strong>{lastCreated.defaultPassword || 'Kisan@123'}</strong></p>
                <p className="text-xs text-gray-400 mt-1">Officer must change password on first login.</p>
              </div>
            </div>
            <button onClick={() => setLastCreated(null)} className="text-emerald-400 hover:text-emerald-600 text-lg">×</button>
          </div>
        </div>
      )}

      {/* Appoint Form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary-500" />
            Appoint New Officer
          </h2>
          {appointableRoles.length === 0 ? (
            <div className="flex items-center gap-2 text-amber-700 text-sm bg-amber-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              You don't have authority to appoint officers at this level.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Kumar" required leftIcon={<User className="w-4 h-4" />} />
                <Input label="Mobile Number *" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="10-digit mobile" required leftIcon={<Phone className="w-4 h-4" />} />
                <Input label="Email (Optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="officer@example.com" leftIcon={<Mail className="w-4 h-4" />} />
                <Select label="Role to Appoint *" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
                  {appointableRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
                {!user?.district && (
                  <>
                    <Select label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, district: '' })}>
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <Select label="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} disabled={!form.state}>
                      <option value="">Select District</option>
                      {(STATE_DISTRICTS[form.state] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                    </Select>
                  </>
                )}
                {centres.length > 0 && (
                  <Select
                    label="Assign to Centre (Optional)"
                    value={form.centreId}
                    onChange={(e) => {
                      const selectedC = centres.find((c) => c._id === e.target.value);
                      setForm({
                        ...form,
                        centreId: e.target.value,
                        state: form.state || selectedC?.state || '',
                        district: form.district || selectedC?.district || '',
                      });
                    }}
                  >
                    <option value="">No Centre Assignment</option>
                    {(centres.filter((c) => {
                      if (form.district) return c.district?.toLowerCase() === form.district.toLowerCase();
                      if (form.state) return c.state?.toLowerCase() === form.state.toLowerCase();
                      return true;
                    })).map((c) => (
                      <option key={c._id} value={c._id}>{c.name} ({c.district}, {c.state})</option>
                    ))}
                  </Select>
                )}
                <Input label="Designation (Optional)" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Procurement Officer" leftIcon={<Briefcase className="w-4 h-4" />} />
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <Shield className="w-4 h-4 flex-shrink-0" />
                Default password will be <strong className="mx-1">Kisan@123</strong> — officer must change it on first login.
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" loading={saving}>Appoint Officer</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData} leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
      </div>

      {/* Officers List */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No officers found"
          description={officers.length === 0 ? "No officers have been appointed yet. Use the button above to appoint your first officer." : "No officers match your search."}
          className="card"
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-th">Officer</th>
                <th className="table-th">Employee ID</th>
                <th className="table-th">Role</th>
                <th className="table-th">District</th>
                <th className="table-th">Centre</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((o) => (
                <tr key={o.user._id} className="table-tr">
                  <td className="table-td">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{o.user.name}</p>
                      <p className="text-xs text-gray-400">{o.user.mobile}</p>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className="font-mono text-sm text-gray-700">{o.profile?.employeeId || o.user.employeeId || '—'}</span>
                  </td>
                  <td className="table-td">
                    <span className={`badge text-xs ${ROLE_BADGE[o.user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABEL[o.user.role] || o.user.role}
                    </span>
                  </td>
                  <td className="table-td text-sm text-gray-600">{o.user.district || '—'}</td>
                  <td className="table-td text-sm text-gray-600">{o.profile?.centreId?.name || '—'}</td>
                  <td className="table-td">
                    <span className={`badge text-xs ${o.user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {o.user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default OfficerManagementPage;
