import { useState, useEffect } from 'react';
import {
  Landmark, Building2, Users, Shield, PlusCircle, Search, RefreshCw,
  CheckCircle2, AlertTriangle, Layers, MapPin, Phone, Mail, UserPlus, FileText, ChevronRight
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { adminService } from '../../services';
import toast from 'react-hot-toast';

const STATE_DEPARTMENTS = [
  { id: 'agriculture', name: 'Agriculture & Crop Management' },
  { id: 'procurement', name: 'Procurement & Mandi Board' },
  { id: 'logistics', name: 'Logistics & Warehousing' },
  { id: 'quality', name: 'Quality Assurance & Inspection' },
  { id: 'admin', name: 'Administration & Nodal Department' },
];

const StateGovernancePage = () => {
  const [states, setStates] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('states');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [addStateModal, setAddStateModal] = useState(false);
  const [addOfficerModal, setAddOfficerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [stateForm, setStateForm] = useState({
    name: '',
    code: '',
    zone: 'North',
    nodalHeadName: '',
    nodalHeadMobile: '',
    nodalHeadEmail: '',
    description: '',
  });

  const [officerForm, setOfficerForm] = useState({
    name: '',
    mobile: '',
    email: '',
    password: 'Kisan@123',
    state: '',
    department: 'Procurement & Mandi Board',
    departmentRole: 'State Procurement Officer',
    designation: 'State Procurement / Nodal Officer',
  });

  // Fetch States & Officers
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStates, resOfficers] = await Promise.all([
        adminService.getStates(),
        adminService.getOfficers(),
      ]);

      if (resStates.data?.success) setStates(resStates.data.data.states || []);
      if (resOfficers.data?.success) {
        // Filter only state_officer roles
        const stateOfficers = (resOfficers.data.data.officers || []).filter(
          (o) => o.user?.role === 'state_officer'
        );
        setOfficers(stateOfficers);
      }
    } catch (err) {
      console.error('Error loading state governance data:', err);
      toast.error(err.response?.data?.message || 'Error loading state governance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Add State Submission
  const handleAddState = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminService.createState(stateForm);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to add state.');

      toast.success(`State "${stateForm.name}" added to National Procurement Network!`);
      setAddStateModal(false);
      setStateForm({ name: '', code: '', zone: 'North', nodalHeadName: '', nodalHeadMobile: '', nodalHeadEmail: '', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error adding state');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add State Officer Submission
  const handleAddStateOfficer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminService.createStateOfficer(officerForm);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create State Officer account.');

      const empId = res.data?.data?.user?.employeeId || '';
      toast.success(`State Officer account created for ${officerForm.state}! Employee ID: ${empId}`);
      setAddOfficerModal(false);
      setOfficerForm({
        name: '',
        mobile: '',
        email: '',
        password: 'Kisan@123',
        state: '',
        department: 'Procurement & Mandi Board',
        departmentRole: 'State Procurement Officer',
        designation: 'State Procurement / Nodal Officer',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error creating State Officer');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStates = states.filter((st) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      st.name?.toLowerCase().includes(q) ||
      st.code?.toLowerCase().includes(q) ||
      st.nodalHeadName?.toLowerCase().includes(q) ||
      st.zone?.toLowerCase().includes(q)
    );
  });

  const filteredOfficers = officers.filter((o) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      o.user.name?.toLowerCase().includes(q) ||
      o.user.employeeId?.toLowerCase().includes(q) ||
      o.user.state?.toLowerCase().includes(q) ||
      o.user.department?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-800/40 relative overflow-hidden">
          <div className="relative z-10 max-w-4xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-widest text-rose-400 bg-rose-400/10 border border-rose-400/30 px-3 py-1 rounded-full">
                Central Apex Directorate
              </span>
              <span className="text-xs text-slate-300">• National State Nodal &amp; Regional Governance Wing</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              State Network Provisioning &amp; Officer Governance
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Add new States into the national procurement grid, assign State Nodal Directors, and provision State-Level Nodal Officers across State Departments (Krishi Vibhag, Mandi Board, Logistics, Quality Control, Administration).
            </p>
          </div>
          <Landmark className="w-64 h-64 absolute -right-10 -bottom-10 text-rose-400/5 pointer-events-none" />
        </div>

        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[10px] uppercase font-bold tracking-wider">Managed States</span>
              <Landmark className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{states.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Active State Hubs</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-blue-700">
              <span className="text-[10px] uppercase font-bold tracking-wider">State Nodal Officers</span>
              <Users className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{officers.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">SPO Credentials Issued</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[10px] uppercase font-bold tracking-wider">State Mandis</span>
              <Building2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {states.reduce((acc, curr) => acc + (curr.centreCount || 0), 0)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Linked Procurement Centres</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[10px] uppercase font-bold tracking-wider">State Departments</span>
              <Shield className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">5</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Executive Wings / State</p>
          </div>
        </div>

        {/* ── Central Actions Bar ── */}
        <div className="bg-gradient-to-br from-rose-50 via-slate-50 to-amber-50 p-6 rounded-3xl border border-rose-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-rose-700" />
              <span>Central Governance &amp; Provisioning Actions</span>
            </h2>
            <p className="text-xs text-slate-600">Onboard new States or create State-Level Officer accounts</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setAddStateModal(true)}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <Landmark className="w-4 h-4" />
              <span>Add New State</span>
            </button>

            <button
              type="button"
              onClick={() => setAddOfficerModal(true)}
              className="flex-1 md:flex-initial px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add State Officer (SPO)</span>
            </button>
          </div>
        </div>

        {/* ── States & Officers Directory Table ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('states')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'states'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Managed States Directory ({states.length})
              </button>
              <button
                onClick={() => setActiveTab('officers')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'officers'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                State Nodal Officers (SPO) ({officers.length})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search state, officer, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <button
                onClick={fetchData}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                title="Refresh state directory"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Directory Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading State Governance database...</div>
            ) : activeTab === 'states' ? (
              filteredStates.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No states registered yet. Click "Add New State" to onboard a state.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">State Name</th>
                      <th className="py-3 px-3">State Code</th>
                      <th className="py-3 px-3">Zone</th>
                      <th className="py-3 px-3">Nodal Director / Head</th>
                      <th className="py-3 px-3 text-center">Officers</th>
                      <th className="py-3 px-3 text-center">Mandis</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStates.map((st) => (
                      <tr key={st._id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{st.name}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-rose-800">{st.code}</td>
                        <td className="py-3.5 px-3">
                          <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                            {st.zone} Zone
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-slate-900">{st.nodalHeadName || 'N/A'}</p>
                          <p className="text-[10px] text-slate-500">{st.nodalHeadMobile || st.nodalHeadEmail || ''}</p>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-blue-800">{st.officerCount || 0}</td>
                        <td className="py-3.5 px-3 text-center font-bold text-emerald-800">{st.centreCount || 0}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300">
                            Active Network
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              filteredOfficers.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No State Officers provisioned yet. Click "Add State Officer" to create credentials.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-3">Officer Name</th>
                      <th className="py-3 px-3">State</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-4 text-right">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredOfficers.map((off) => (
                      <tr key={off.user._id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-800">{off.user.employeeId || 'SPO-001'}</td>
                        <td className="py-3.5 px-3 font-bold text-slate-900">{off.user.name}</td>
                        <td className="py-3.5 px-3 font-bold text-slate-800">{off.user.state}</td>
                        <td className="py-3.5 px-3 text-slate-700">{off.user.department || 'Administration'}</td>
                        <td className="py-3.5 px-3 text-slate-600">
                          <p>{off.user.mobile}</p>
                          <p className="text-[10px] text-slate-400">{off.user.email}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-900 px-2.5 py-1 rounded-full border border-purple-200">
                            State Procurement Officer
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>

        {/* ── Modal 1: Add New State ── */}
        {addStateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                    Central Directorate
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    Onboard New State into Network
                  </h3>
                </div>
                <button
                  onClick={() => setAddStateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddState} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">State Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Punjab, Rajasthan"
                      value={stateForm.name}
                      onChange={(e) => setStateForm({ ...stateForm, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">State 2-Letter Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PB, RJ, HR"
                      value={stateForm.code}
                      onChange={(e) => setStateForm({ ...stateForm, code: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none uppercase font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Geographic Zone</label>
                    <select
                      value={stateForm.zone}
                      onChange={(e) => setStateForm({ ...stateForm, zone: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    >
                      <option value="North">North Zone</option>
                      <option value="South">South Zone</option>
                      <option value="East">East Zone</option>
                      <option value="West">West Zone</option>
                      <option value="Central">Central Zone</option>
                      <option value="North-East">North-East Zone</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Nodal Director Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sh. Sukhdev Singh, IAS"
                      value={stateForm.nodalHeadName}
                      onChange={(e) => setStateForm({ ...stateForm, nodalHeadName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Nodal Contact Mobile</label>
                    <input
                      type="text"
                      placeholder="10 digit mobile"
                      value={stateForm.nodalHeadMobile}
                      onChange={(e) => setStateForm({ ...stateForm, nodalHeadMobile: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Nodal Email</label>
                    <input
                      type="email"
                      placeholder="nodal.officer@state.gov.in"
                      value={stateForm.nodalHeadEmail}
                      onChange={(e) => setStateForm({ ...stateForm, nodalHeadEmail: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddStateModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-md transition"
                  >
                    {submitting ? 'Adding State...' : 'Add State to Network'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal 2: Add State Officer (SPO) ── */}
        {addOfficerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    Central Officer Provisioning
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    Provision State-Level Nodal Officer (SPO)
                  </h3>
                </div>
                <button
                  onClick={() => setAddOfficerModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddStateOfficer} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select State Scope *</label>
                  <select
                    required
                    value={officerForm.state}
                    onChange={(e) => setOfficerForm({ ...officerForm, state: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="">-- Choose Assigned State --</option>
                    {states.map((s) => (
                      <option key={s._id} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                    <option value="Punjab">Punjab (PB)</option>
                    <option value="Haryana">Haryana (HR)</option>
                    <option value="Madhya Pradesh">Madhya Pradesh (MP)</option>
                    <option value="Rajasthan">Rajasthan (RJ)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Officer Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sh. Sukhdev Singh, IAS"
                      value={officerForm.name}
                      onChange={(e) => setOfficerForm({ ...officerForm, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="10 digit mobile"
                      value={officerForm.mobile}
                      onChange={(e) => setOfficerForm({ ...officerForm, mobile: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">State Department</label>
                    <select
                      value={officerForm.department}
                      onChange={(e) => setOfficerForm({ ...officerForm, department: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    >
                      {STATE_DEPARTMENTS.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Officer Email</label>
                    <input
                      type="email"
                      placeholder="officer@state.gov.in"
                      value={officerForm.email}
                      onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-[11px] text-rose-900 leading-snug">
                  🆔 <strong>Employee ID</strong> will be auto-generated based on State Code (e.g., <code>SPO-PB-001</code>). Default login password set to <code>Kisan@123</code>.
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddOfficerModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition"
                  >
                    {submitting ? 'Creating Account...' : 'Provision State Officer Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StateGovernancePage;
