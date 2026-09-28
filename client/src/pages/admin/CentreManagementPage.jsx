import { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, RefreshCw, Edit3, Trash2, MapPin,
  Clock, Users, Package, ChevronRight, X, Check
} from 'lucide-react';
import { adminService } from '../../services';
import { extractError } from '../../utils/constants';
import AdminLayout from '../../layouts/AdminLayout';
import Button from '../../components/common/Button';
import Input, { Select } from '../../components/common/Input';
import { CardSkeleton } from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

import { INDIAN_STATES, STATE_DISTRICTS } from '../../utils/locations';

const INITIAL_FORM = {
  name: '', address: '', district: '', state: '', pincode: '',
  contactPhone: '', contactEmail: '', description: '',
  dailyCapacity: 100, slotDurationMinutes: 60, cancellationCutoffHours: 12,
  operatingHoursStart: '09:00', operatingHoursEnd: '17:00',
  availableCrops: [],
};

const CentreManagementPage = () => {
  const { user } = useAuth();
  const [centres, setCentres] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState(user?.role === 'state_officer' ? (user?.state || '') : 'all');
  const [selectedDistrict, setSelectedDistrict] = useState(user?.role === 'district_officer' ? (user?.district || '') : 'all');
  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy' | 'flat'
  const [collapsedStates, setCollapsedStates] = useState({});

  const [form, setForm] = useState({
    ...INITIAL_FORM,
    state: user?.state || '',
    district: user?.district || '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [centresRes, cropsRes] = await Promise.all([
        adminService.getCentres(),
        adminService.getCrops(),
      ]);
      setCentres(centresRes.data?.data?.centres || []);
      setCrops(cropsRes.data?.data?.crops || []);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (centre) => {
    setForm({
      name: centre.name || '',
      address: centre.address || '',
      district: centre.district || '',
      state: centre.state || '',
      pincode: centre.pincode || '',
      contactPhone: centre.contactPhone || '',
      contactEmail: centre.contactEmail || '',
      description: centre.description || '',
      dailyCapacity: centre.dailyCapacity || 100,
      slotDurationMinutes: centre.slotDurationMinutes || 60,
      cancellationCutoffHours: centre.cancellationCutoffHours || 12,
      operatingHoursStart: centre.operatingHours?.start || '09:00',
      operatingHoursEnd: centre.operatingHours?.end || '17:00',
      availableCrops: (centre.availableCrops || []).map((c) => c._id || c),
    });
    setEditingId(centre._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM, state: user?.state || '', district: user?.district || '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.address) {
      toast.error('Centre name and address are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        operatingHours: { start: form.operatingHoursStart, end: form.operatingHoursEnd },
      };
      if (editingId) {
        await adminService.updateCentre(editingId, payload);
        toast.success('Centre updated successfully.');
      } else {
        const res = await adminService.createCentre(payload);
        const data = res.data?.data;
        if (data?.pendingApproval) {
          toast.success('Procurement centre proposal submitted! It will become active after Central Officer approval.');
        } else {
          toast.success('Procurement centre created successfully.');
        }
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this centre? Farmers will no longer be able to book slots here.')) return;
    try {
      await adminService.deleteCentre(id);
      toast.success('Centre deactivated.');
      fetchData();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const toggleCrop = (cropId) => {
    setForm((prev) => ({
      ...prev,
      availableCrops: prev.availableCrops.includes(cropId)
        ? prev.availableCrops.filter((c) => c !== cropId)
        : [...prev.availableCrops, cropId],
    }));
  };

  const filtered = centres.filter((c) => {
    if (selectedState !== 'all' && c.state?.toLowerCase() !== selectedState.toLowerCase()) return false;
    if (selectedDistrict !== 'all' && c.district?.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.district?.toLowerCase().includes(q) ||
      c.state?.toLowerCase().includes(q) ||
      c.centreId?.toLowerCase().includes(q)
    );
  });

  // Unique states and districts for filters
  const availableStates = Array.from(new Set(centres.map((c) => c.state).filter(Boolean))).sort();
  const availableDistricts = Array.from(
    new Set(
      centres
        .filter((c) => selectedState === 'all' || c.state?.toLowerCase() === selectedState.toLowerCase())
        .map((c) => c.district)
        .filter(Boolean)
    )
  ).sort();

  // Grouped hierarchy: State -> District -> Centres
  const hierarchy = {};
  filtered.forEach((centre) => {
    const st = centre.state || 'Other State';
    const dist = centre.district || 'General District';
    if (!hierarchy[st]) hierarchy[st] = { name: st, districts: {}, totalCentres: 0, totalCapacity: 0 };
    if (!hierarchy[st].districts[dist]) hierarchy[st].districts[dist] = { name: dist, centres: [], totalCapacity: 0 };
    hierarchy[st].districts[dist].centres.push(centre);
    hierarchy[st].districts[dist].totalCapacity += Number(centre.dailyCapacity) || 0;
    hierarchy[st].totalCentres += 1;
    hierarchy[st].totalCapacity += Number(centre.dailyCapacity) || 0;
  });

  const toggleStateCollapse = (st) => {
    setCollapsedStates((prev) => ({ ...prev, [st]: !prev[st] }));
  };

  return (
    <AdminLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span>Procurement Centres</span>
            <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {filtered.length} Mandis
            </span>
          </h1>
          <p className="page-subtitle">
            Hierarchical directory arranged State-wise &rarr; District-wise &rarr; Procurement Centre-wise
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'state_officer' && (
            <Button variant="primary" onClick={() => { resetForm(); setShowForm(true); }} leftIcon={<Plus className="w-4 h-4" />}>
              Add Centre
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && user?.role === 'state_officer' && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-500" />
              {editingId ? 'Edit Centre' : 'Add New Procurement Centre'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Centre Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gorakhpur Mandi Centre" required containerClassName="col-span-2" />
              <Input label="Address *" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address of the centre" required containerClassName="col-span-2" />

              {user?.role === 'state_officer' ? (
                <>
                  <Input label="State" value={user.state} readOnly leftIcon={<Building2 className="w-4 h-4" />} />
                  <Select label="District *" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value, state: user.state })} required>
                    <option value="">Select District</option>
                    {(STATE_DISTRICTS[user.state] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </>
              ) : !user?.district ? (
                <>
                  <Select label="State *" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, district: '' })} required>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Select label="District *" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} disabled={!form.state} required>
                    <option value="">Select District</option>
                    {(STATE_DISTRICTS[form.state] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </>
              ) : (
                <>
                  <Input label="State" value={form.state} readOnly containerClassName="col-span-1" />
                  <Input label="District" value={form.district} readOnly containerClassName="col-span-1" />
                </>
              )}

              <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="e.g. 273001" />
              <Input label="Contact Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="e.g. 9876543210" />
            </div>

            {/* Operations */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Operating Details</p>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Daily Capacity (farmers)" type="number" value={form.dailyCapacity} onChange={(e) => setForm({ ...form, dailyCapacity: Number(e.target.value) })} min={1} />
                <Input label="Slot Duration (minutes)" type="number" value={form.slotDurationMinutes} onChange={(e) => setForm({ ...form, slotDurationMinutes: Number(e.target.value) })} min={15} />
                <Input label="Cancellation Cutoff (hours)" type="number" value={form.cancellationCutoffHours} onChange={(e) => setForm({ ...form, cancellationCutoffHours: Number(e.target.value) })} min={0} />
                <Input label="Opening Time" type="time" value={form.operatingHoursStart} onChange={(e) => setForm({ ...form, operatingHoursStart: e.target.value })} />
                <Input label="Closing Time" type="time" value={form.operatingHoursEnd} onChange={(e) => setForm({ ...form, operatingHoursEnd: e.target.value })} />
              </div>
            </div>

            {/* Available Crops */}
            {crops.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Available Crops at This Centre ({form.availableCrops.length} selected)
                </p>
                <div className="flex flex-wrap gap-2">
                  {crops.filter((c) => c.isActive !== false).map((crop) => {
                    const selected = form.availableCrops.includes(crop._id);
                    return (
                      <button
                        key={crop._id}
                        type="button"
                        onClick={() => toggleCrop(crop._id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          selected
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                        {crop.name}
                        <span className="text-xs opacity-75">₹{crop.mspPrice?.toLocaleString('en-IN')}/qtl</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Input label="Description (Optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this centre" />

            <div className="flex gap-3 pt-2 border-t">
              <Button type="submit" variant="primary" loading={saving}>
                {editingId ? 'Update Centre' : 'Create Centre'}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filter & Arrangement Controls ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search state, district, mandi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* State Filter (if not locked to state) */}
          {user?.role !== 'state_officer' && (
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('all');
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All States ({availableStates.length})</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          )}

          {/* District Filter */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Districts ({availableDistricts.length})</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle: Hierarchy vs Flat */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('hierarchy')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              viewMode === 'hierarchy'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            State &rarr; District &rarr; Mandi
          </button>
          <button
            type="button"
            onClick={() => setViewMode('flat')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              viewMode === 'flat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Flat Grid
          </button>
        </div>
      </div>

      {/* ── Centres Rendering ── */}
      {loading ? (
        <CardSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No procurement centres found"
          description={centres.length === 0 ? "No centres created yet. Add your first procurement centre above." : "No centres match your filter criteria."}
          className="card"
        />
      ) : viewMode === 'hierarchy' ? (
        // ── Hierarchical: State Wise -> District Wise -> Centre Wise ──
        <div className="space-y-6">
          {Object.entries(hierarchy).map(([stateName, stateObj]) => {
            const isCollapsed = collapsedStates[stateName];
            const distEntries = Object.entries(stateObj.districts);

            return (
              <div key={stateName} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                {/* State Header Bar */}
                <div
                  onClick={() => toggleStateCollapse(stateName)}
                  className="p-4 bg-slate-900 text-white flex items-center justify-between cursor-pointer hover:bg-slate-800 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">{stateName}</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                          {distEntries.length} Districts
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/30">
                          {stateObj.totalCentres} Mandis
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Total State Capacity: {stateObj.totalCapacity.toLocaleString()} qtl/day</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">
                    {isCollapsed ? 'Expand +' : 'Collapse −'}
                  </span>
                </div>

                {/* State Content (Districts and Centres) */}
                {!isCollapsed && (
                  <div className="p-5 space-y-6 divide-y divide-slate-100">
                    {distEntries.map(([districtName, distObj], dIdx) => (
                      <div key={districtName} className={`space-y-3 ${dIdx > 0 ? 'pt-5' : ''}`}>
                        {/* District Banner */}
                        <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-xs font-black text-slate-900">{districtName} District</h3>
                            <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                              {distObj.centres.length} Procurement Centre(s)
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-600">
                            District Cap: {distObj.totalCapacity} qtl
                          </span>
                        </div>

                        {/* District's Centres Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                          {distObj.centres.map((centre) => (
                            <div
                              key={centre._id}
                              className={`p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition flex flex-col justify-between shadow-xs ${
                                !centre.isActive ? 'opacity-65' : ''
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    <p className="text-xs font-bold text-slate-900 leading-tight">{centre.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{centre.centreId}</p>
                                  </div>
                                  <span
                                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                                      centre.isActive
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}
                                  >
                                    {centre.isActive ? 'Active' : 'Pending Approval'}
                                  </span>
                                </div>

                                <div className="space-y-1 text-xs text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{centre.operatingHours?.start || '09:00'} – {centre.operatingHours?.end || '17:00'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Capacity: <strong>{centre.dailyCapacity} qtl/day</strong></span>
                                  </div>
                                  {centre.address && (
                                    <p className="text-[11px] text-slate-500 truncate pt-0.5">{centre.address}</p>
                                  )}
                                  {centre.availableCrops?.length > 0 && (
                                    <div className="flex items-center gap-1 flex-wrap pt-1">
                                      <Package className="w-3.5 h-3.5 text-slate-400" />
                                      {centre.availableCrops.slice(0, 3).map((c, i) => (
                                        <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                          {c.name || c}
                                        </span>
                                      ))}
                                      {centre.availableCrops.length > 3 && (
                                        <span className="text-[9px] text-slate-400">+{centre.availableCrops.length - 3}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-2.5 mt-3 border-t border-slate-100">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(centre)} leftIcon={<Edit3 className="w-3.5 h-3.5" />}>
                                  Edit
                                </Button>
                                {centre.isActive && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => handleDelete(centre._id)}
                                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  >
                                    Deactivate
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // ── Flat Grid View ──
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((centre) => (
            <div key={centre._id} className={`card p-5 flex flex-col gap-3 ${!centre.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{centre.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{centre.centreId}</p>
                </div>
                <span className={`badge text-xs flex-shrink-0 ${
                  centre.isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {centre.isActive ? 'Active' : 'Pending Central Approval'}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" />{centre.district}, {centre.state}</div>
                <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" />{centre.operatingHours?.start || '09:00'} – {centre.operatingHours?.end || '17:00'}</div>
                <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400" />Capacity: {centre.dailyCapacity} qtl/day</div>
                {centre.availableCrops?.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    {centre.availableCrops.slice(0, 3).map((c) => c.name || c).join(', ')}
                    {centre.availableCrops.length > 3 && ` +${centre.availableCrops.length - 3}`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => openEdit(centre)} leftIcon={<Edit3 className="w-3.5 h-3.5" />}>Edit</Button>
                {centre.isActive && (
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(centre._id)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>Deactivate</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default CentreManagementPage;
