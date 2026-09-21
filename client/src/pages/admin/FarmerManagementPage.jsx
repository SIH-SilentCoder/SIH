import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, RefreshCw, CheckCircle, AlertCircle,
  User, Phone, MapPin, ToggleLeft, ToggleRight, X
} from 'lucide-react';
import { adminService } from '../../services';
import { extractError } from '../../utils/constants';
import AdminLayout from '../../layouts/AdminLayout';
import Button from '../../components/common/Button';
import Input, { Select } from '../../components/common/Input';
import { TableSkeleton } from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

import { INDIAN_STATES, STATE_DISTRICTS } from '../../utils/locations';

const KYC_BADGE = {
  'Verified': 'bg-emerald-100 text-emerald-700',
  'Pending': 'bg-amber-100 text-amber-700',
  'Rejected': 'bg-red-100 text-red-700',
  'Not Started': 'bg-gray-100 text-gray-600',
};

const FarmerManagementPage = () => {
  const { user } = useAuth();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [lastCreated, setLastCreated] = useState(null);

  const [form, setForm] = useState({
    name: '', mobile: '', email: '',
    state: user?.state || '',
    district: user?.district || '',
    village: '', address: '',
  });

  useEffect(() => { fetchFarmers(); }, [page, search]);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getFarmers({ page, limit: 20, search: search || undefined });
      const data = res.data?.data;
      setFarmers(data?.farmers || []);
      setPagination(data?.pagination || {});
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.mobile) {
      toast.error('Farmer name and mobile are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await adminService.registerFarmer(form);
      const data = res.data?.data;
      setLastCreated(data);
      toast.success('Farmer registered successfully!');
      setShowForm(false);
      setForm({ name: '', mobile: '', email: '', state: user?.state || '', district: user?.district || '', village: '', address: '' });
      fetchFarmers();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (farmerId) => {
    try {
      await adminService.toggleFarmerStatus(farmerId);
      toast.success('Farmer status updated.');
      fetchFarmers();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  return (
    <AdminLayout>
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Farmer Management</h1>
          <p className="page-subtitle">View and manage registered farmers in your jurisdiction</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)} leftIcon={<UserPlus className="w-4 h-4" />}>
          Register Farmer
        </Button>
      </div>

      {/* Last Registered Farmer Banner */}
      {lastCreated && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-800 text-sm">Farmer Registered Successfully!</p>
              <p className="text-sm text-emerald-700 mt-1">Share these login credentials with the farmer:</p>
              <div className="mt-2 p-3 bg-white rounded-lg border border-emerald-200 font-mono text-sm">
                <p>Mobile: <strong>{lastCreated.user?.mobile}</strong></p>
                <p>Default Password: <strong>{lastCreated.defaultPassword}</strong> (same as mobile)</p>
                <p className="text-xs text-gray-400 mt-1">Farmer should change password after first login.</p>
              </div>
            </div>
            <button onClick={() => setLastCreated(null)} className="text-emerald-400 hover:text-emerald-600 text-lg">×</button>
          </div>
        </div>
      )}

      {/* Register Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary-500" />
              Register New Farmer
            </h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Farmer's full name"
                required
                leftIcon={<User className="w-4 h-4" />}
              />
              <Input
                label="Mobile Number *"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="10-digit mobile number"
                required
                leftIcon={<Phone className="w-4 h-4" />}
              />
              <Input
                label="Email (Optional)"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="farmer@example.com"
                containerClassName="col-span-2"
              />

              {!user?.district ? (
                <>
                  <Select
                    label="State"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value, district: '' })}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Select
                    label="District"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    disabled={!form.state}
                  >
                    <option value="">Select District</option>
                    {(STATE_DISTRICTS[form.state] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </>
              ) : (
                <>
                  <Input label="State" value={form.state} readOnly />
                  <Input label="District" value={form.district} readOnly />
                </>
              )}

              <Input
                label="Village / Town"
                value={form.village}
                onChange={(e) => setForm({ ...form, village: e.target.value })}
                placeholder="Village or town name"
                leftIcon={<MapPin className="w-4 h-4" />}
              />
              <Input
                label="Full Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Complete postal address"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Default login password will be the farmer's <strong className="mx-1">mobile number</strong>. Farmer can change it after logging in.
            </div>

            <div className="flex gap-3 pt-2 border-t">
              <Button type="submit" variant="primary" loading={saving}>Register Farmer</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9 w-full"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchFarmers} leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : farmers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No farmers found"
          description={search ? 'No farmers match your search.' : 'No farmers registered yet. Use the button above to register your first farmer.'}
          className="card"
        />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Farmer</th>
                  <th className="table-th">Mobile</th>
                  <th className="table-th">District</th>
                  <th className="table-th">KYC Status</th>
                  <th className="table-th">Account</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {farmers.map(({ user: u, profile: p }) => (
                  <tr key={u._id} className="table-tr">
                    <td className="table-td">
                      <p className="font-medium text-gray-900 text-sm">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email || 'No email'}</p>
                    </td>
                    <td className="table-td font-mono text-sm">{u.mobile}</td>
                    <td className="table-td text-sm text-gray-600">{u.district || '—'}, {u.state || '—'}</td>
                    <td className="table-td">
                      <span className={`badge text-xs ${KYC_BADGE[p?.kycStatus || 'Not Started']}`}>
                        {p?.kycStatus || 'Not Started'}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`badge text-xs ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="table-td">
                      <button
                        onClick={() => handleToggle(u._id)}
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                          u.isActive
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > 20 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-gray-500">
                Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total} farmers
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="ghost" size="sm" disabled={page * 20 >= pagination.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default FarmerManagementPage;
