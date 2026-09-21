import { useState, useEffect } from 'react';
import {
  Sprout, Plus, Search, RefreshCw, Edit3, Trash2, X, IndianRupee
} from 'lucide-react';
import { adminService } from '../../services';
import { extractError } from '../../utils/constants';
import AdminLayout from '../../layouts/AdminLayout';
import Button from '../../components/common/Button';
import Input, { Select } from '../../components/common/Input';
import { TableSkeleton } from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

const SEASONS = ['Kharif', 'Rabi', 'Zaid', 'All'];
const CATEGORIES = ['Cereal', 'Pulse', 'Oilseed', 'Cotton', 'Sugarcane', 'Other'];
const UNITS = ['quintal', 'kg', 'tonne'];

const SEASON_COLOR = {
  Kharif: 'bg-green-100 text-green-700',
  Rabi: 'bg-amber-100 text-amber-700',
  Zaid: 'bg-orange-100 text-orange-700',
  All: 'bg-blue-100 text-blue-700',
};

const CATEGORY_COLOR = {
  Cereal: 'bg-yellow-100 text-yellow-700',
  Pulse: 'bg-purple-100 text-purple-700',
  Oilseed: 'bg-rose-100 text-rose-700',
  Cotton: 'bg-sky-100 text-sky-700',
  Sugarcane: 'bg-lime-100 text-lime-700',
  Other: 'bg-gray-100 text-gray-700',
};

const INITIAL_FORM = {
  name: '', nameHindi: '', mspPrice: '', season: 'Rabi', category: 'Cereal', unit: 'quintal', description: '',
};

const CropManagementPage = () => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => { fetchCrops(); }, []);

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const res = await adminService.getCrops();
      setCrops(res.data?.data?.crops || []);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (crop) => {
    setForm({
      name: crop.name || '',
      nameHindi: crop.nameHindi || '',
      mspPrice: crop.mspPrice || '',
      season: crop.season || 'Rabi',
      category: crop.category || 'Cereal',
      unit: crop.unit || 'quintal',
      description: crop.description || '',
    });
    setEditingId(crop._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.mspPrice) {
      toast.error('Crop name and MSP price are required.');
      return;
    }
    if (isNaN(Number(form.mspPrice)) || Number(form.mspPrice) <= 0) {
      toast.error('MSP price must be a valid positive number.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, mspPrice: Number(form.mspPrice) };
      if (editingId) {
        await adminService.updateCrop(editingId, payload);
        toast.success('Crop updated successfully.');
      } else {
        await adminService.createCrop(payload);
        toast.success('Crop added successfully.');
      }
      resetForm();
      fetchCrops();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this crop? It will no longer appear for booking.')) return;
    try {
      await adminService.deleteCrop(id);
      toast.success('Crop deactivated.');
      fetchCrops();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const filtered = crops.filter((c) => {
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.nameHindi?.includes(q) || c.category?.toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Crop Management</h1>
          <p className="page-subtitle">Add crops and set MSP (Minimum Support Prices)</p>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setShowForm(true); }} leftIcon={<Plus className="w-4 h-4" />}>
          Add Crop
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-500" />
              {editingId ? 'Edit Crop' : 'Add New Crop'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Crop Name (English) *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Wheat"
                required
              />
              <Input
                label="Crop Name (Hindi)"
                value={form.nameHindi}
                onChange={(e) => setForm({ ...form, nameHindi: e.target.value })}
                placeholder="e.g. गेहूं"
              />
              <Input
                label="MSP Price (₹ per quintal) *"
                type="number"
                value={form.mspPrice}
                onChange={(e) => setForm({ ...form, mspPrice: e.target.value })}
                placeholder="e.g. 2275"
                min={1}
                required
                leftIcon={<IndianRupee className="w-4 h-4" />}
              />
              <Select
                label="Unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
              <Select
                label="Season"
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
              >
                {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Input
                label="Description (Optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description"
                containerClassName="col-span-2"
              />
            </div>
            <div className="flex gap-3 pt-4 mt-4 border-t">
              <Button type="submit" variant="primary" loading={saving}>
                {editingId ? 'Update Crop' : 'Add Crop'}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search crops..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9 w-full" />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchCrops} leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No crops found"
          description={crops.length === 0 ? "No crops have been added yet. Add your first crop above." : "No crops match your search."}
          className="card"
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-th">Crop Name</th>
                <th className="table-th">Hindi Name</th>
                <th className="table-th">MSP Price</th>
                <th className="table-th">Season</th>
                <th className="table-th">Category</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.map((crop) => (
                <tr key={crop._id} className={`table-tr ${!crop.isActive ? 'opacity-50' : ''}`}>
                  <td className="table-td font-semibold text-gray-900">{crop.name}</td>
                  <td className="table-td text-gray-600">{crop.nameHindi || '—'}</td>
                  <td className="table-td">
                    <span className="font-semibold text-emerald-700">
                      ₹{crop.mspPrice?.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">/{crop.unit}</span>
                  </td>
                  <td className="table-td">
                    <span className={`badge text-xs ${SEASON_COLOR[crop.season] || 'bg-gray-100 text-gray-600'}`}>{crop.season}</span>
                  </td>
                  <td className="table-td">
                    <span className={`badge text-xs ${CATEGORY_COLOR[crop.category] || 'bg-gray-100 text-gray-600'}`}>{crop.category}</span>
                  </td>
                  <td className="table-td">
                    <span className={`badge text-xs ${crop.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {crop.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(crop)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {crop.isActive !== false && (
                        <button
                          onClick={() => handleDelete(crop._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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

export default CropManagementPage;
