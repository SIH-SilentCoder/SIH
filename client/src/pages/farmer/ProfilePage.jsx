import { useState, useEffect } from 'react';
import { User, Phone, MapPin, CreditCard, Plus, Trash2 } from 'lucide-react';
import { farmerService, cropService } from '../../services';
import { extractError } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import FarmerLayout from '../../layouts/FarmerLayout';
import Button from '../../components/common/Button';
import Input, { Select } from '../../components/common/Input';
import { CardSkeleton } from '../../components/common/Spinner';
import toast from 'react-hot-toast';

import { INDIAN_STATES, STATE_DISTRICTS } from '../../utils/locations';

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    state: '', district: '', village: '', address: '', farmerIdNumber: '',
  });
  const [myCrops, setMyCrops] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, cropsRes] = await Promise.all([
          farmerService.getProfile(),
          cropService.getCrops(),
        ]);
        const p = profileRes.data.data.profile;
        setProfile(p);
        // Handle both response structures: data.data.crops or data.data
        const cropsData = cropsRes.data?.data?.crops || cropsRes.data?.data || [];
        setCrops(Array.isArray(cropsData) ? cropsData : []);
        setForm({
          state: p.state || '',
          district: p.district || '',
          village: p.village || '',
          address: p.address || '',
          farmerIdNumber: p.farmerIdNumber || '',
        });
        setMyCrops(p.crops?.map((c) => ({
          cropId: c.cropId?._id || c.cropId,
          cropName: c.cropName || c.cropId?.name || '',
          estimatedQuantity: c.estimatedQuantity,
        })) || []);
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await farmerService.updateProfile({ ...form, crops: myCrops });
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const addCrop = () => {
    setMyCrops([...myCrops, { cropId: '', cropName: '', estimatedQuantity: '' }]);
  };

  const removeCrop = (idx) => {
    setMyCrops(myCrops.filter((_, i) => i !== idx));
  };

  const updateCrop = (idx, field, value) => {
    const updated = [...myCrops];
    if (field === 'cropId') {
      const crop = crops.find((c) => c._id === value);
      updated[idx] = { ...updated[idx], cropId: value, cropName: crop?.name || '' };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setMyCrops(updated);
  };

  if (loading) return <FarmerLayout><CardSkeleton rows={8} /></FarmerLayout>;

  return (
    <FarmerLayout>
      <div className="max-w-2xl mx-auto">
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Update your personal and crop details</p>
        </div>

        <div className="space-y-5">
          {/* Account info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Account Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Full Name</p>
                <p className="font-medium text-gray-900">{user?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Mobile Number</p>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <p className="font-medium">{user?.mobile}</p>
                </div>
              </div>
              {user?.email && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Role</p>
                <span className="badge bg-primary-100 text-primary-700">Farmer</span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              Location Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value, district: '' })}
                required
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Select
                label="District"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                required
                disabled={!form.state}
              >
                <option value="">Select district</option>
                {(STATE_DISTRICTS[form.state] || []).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
              <Input
                label="Village / Town"
                value={form.village}
                onChange={(e) => setForm({ ...form, village: e.target.value })}
              />
              <Input
                label="Farmer ID / Kisan Card"
                value={form.farmerIdNumber}
                onChange={(e) => setForm({ ...form, farmerIdNumber: e.target.value })}
                leftIcon={<CreditCard className="w-4 h-4" />}
              />
              <Input
                label="Full Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                containerClassName="col-span-2"
              />
            </div>
          </div>

          {/* Crops */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">My Crops</h2>
              <Button variant="outline" size="sm" onClick={addCrop} leftIcon={<Plus className="w-4 h-4" />}>
                Add Crop
              </Button>
            </div>

            {myCrops.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Add crops you plan to sell at the procurement centre.
              </p>
            ) : (
              <div className="space-y-3">
                {myCrops.map((c, i) => (
                  <div key={i} className="flex gap-3 items-end">
                    <Select
                      label={i === 0 ? 'Crop' : undefined}
                      value={c.cropId}
                      onChange={(e) => updateCrop(i, 'cropId', e.target.value)}
                      containerClassName="flex-1"
                    >
                      <option value="">Select crop</option>
                      {crops.map((crop) => <option key={crop._id} value={crop._id}>{crop.name}</option>)}
                    </Select>
                    <Input
                      label={i === 0 ? 'Est. Quantity (qtl)' : undefined}
                      type="number"
                      value={c.estimatedQuantity}
                      onChange={(e) => updateCrop(i, 'estimatedQuantity', e.target.value)}
                      placeholder="e.g., 50"
                      containerClassName="w-36"
                    />
                    <button
                      onClick={() => removeCrop(i)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors mb-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="primary" size="lg" onClick={handleSave} loading={saving} className="w-full">
            Save Profile
          </Button>
        </div>
      </div>
    </FarmerLayout>
  );
};

export default ProfilePage;
