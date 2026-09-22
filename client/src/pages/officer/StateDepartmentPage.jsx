import { useState, useEffect } from 'react';
import {
  Building2, Landmark, Users, Wheat, Shield, PlusCircle, Clock,
  CheckCircle2, AlertTriangle, XCircle, Send, MessageSquare, Edit3,
  FileText, ArrowRight, RefreshCw, Layers, Check, Search, Filter
} from 'lucide-react';
import OfficerLayout from '../../layouts/OfficerLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATE_DEPARTMENTS = [
  {
    id: 'agriculture',
    name: 'Agriculture & Crop Management',
    hindiName: 'कृषि एवं फसल प्रबंधन विभाग',
    code: 'AGR',
    icon: Wheat,
    color: 'from-emerald-600 to-teal-700',
    borderColor: 'border-emerald-500/40',
    headRole: 'Director of Agriculture',
    activeCount: 14,
    mandate: 'Crop MSP rates, yield estimation, moisture tolerance norms & crop registrations.',
  },
  {
    id: 'procurement',
    name: 'Procurement & Mandi Board',
    hindiName: 'खरीद एवं मंडी बोर्ड विभाग',
    code: 'PRC',
    icon: Landmark,
    color: 'from-amber-600 to-orange-700',
    borderColor: 'border-amber-500/40',
    headRole: 'Chief Procurement Controller',
    activeCount: 22,
    mandate: 'Procurement centre/mandi setup, daily intake capacity & slot allocation.',
  },
  {
    id: 'logistics',
    name: 'Logistics & Warehousing',
    hindiName: 'लॉजिस्टिक्स एवं भंडारण विभाग',
    code: 'LOG',
    icon: Building2,
    color: 'from-blue-600 to-indigo-700',
    borderColor: 'border-blue-500/40',
    headRole: 'General Manager Warehousing',
    activeCount: 18,
    mandate: 'Warehouse capacity allocation, gunny bag dispatch & transport movement.',
  },
  {
    id: 'quality',
    name: 'Quality Assurance & Inspection',
    hindiName: 'गुणवत्ता आश्वासन एवं जांच विभाग',
    code: 'QA',
    icon: Shield,
    color: 'from-purple-600 to-violet-700',
    borderColor: 'border-purple-500/40',
    headRole: 'Chief Quality Assessor',
    activeCount: 12,
    mandate: 'Moisture testing, foreign matter verification, grade certification & lab audits.',
  },
  {
    id: 'admin',
    name: 'Administration & Nodal Department',
    hindiName: 'प्रशासनिक एवं नोडल विभाग',
    code: 'ADM',
    icon: Users,
    color: 'from-slate-700 to-slate-900',
    borderColor: 'border-slate-500/40',
    headRole: 'State Nodal Officer (IAS)',
    activeCount: 8,
    mandate: 'District Nodal Officer appointments, officer credentials & central workflow routing.',
  },
];

const StateDepartmentPage = () => {
  const { user } = useAuth();
  const userState = user?.state || 'Punjab';

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [createModalType, setCreateModalType] = useState(null); // 'add_district', 'add_mandi', 'add_officer_staff', 'add_crop'
  const [editModalProposal, setEditModalProposal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for creation
  const [formData, setFormData] = useState({});
  const [revisionNote, setRevisionNote] = useState('');

  // Fetch proposals from API
  const fetchProposals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/state-proposals', {
        params: { state: userState },
      });
      if (res.data?.success) {
        setProposals(res.data.data?.proposals || []);
      }
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [userState]);

  // Handle Proposal Submission by State Officer
  const handleCreateProposal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');

      let title = '';
      let department = 'Procurement & Mandi Board';

      if (createModalType === 'add_district') {
        title = `New District Addition: ${formData.districtName} (${userState})`;
        department = 'Administration & Nodal Department';
      } else if (createModalType === 'add_mandi') {
        title = `New Mandi Setup: ${formData.name} (${formData.district})`;
        department = 'Procurement & Mandi Board';
      } else if (createModalType === 'add_officer_staff') {
        title = `Officer Appointment: ${formData.name} (${formData.role})`;
        department = formData.department || 'Procurement & Mandi Board';
      } else if (createModalType === 'add_crop') {
        title = `New State Crop Registration: ${formData.name} (MSP ₹${formData.mspPrice})`;
        department = 'Agriculture & Crop Management';
      }

      const body = {
        category: createModalType,
        title,
        description: formData.description || `State Officer proposed addition for ${userState}.`,
        department,
        payload: { ...formData, state: userState },
      };

      await api.post('/state-proposals', body);

      toast.success('Proposal submitted to Central Officer for approval!');
      setCreateModalType(null);
      setFormData({});
      fetchProposals();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error submitting proposal');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Re-submitting Proposal after Central Officer SMS / Feedback
  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!editModalProposal) return;
    setSubmitting(true);

    try {
      await api.put(`/state-proposals/${editModalProposal._id}`, {
        title: editModalProposal.title,
        description: editModalProposal.description,
        payload: editModalProposal.payload,
        revisionNote,
      });

      toast.success('Revised proposal re-submitted to Central Officer!');
      setEditModalProposal(null);
      setRevisionNote('');
      fetchProposals();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error re-submitting proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProposals = proposals.filter((p) => {
    if (activeTab === 'pending' && p.status !== 'pending_central_approval') return false;
    if (activeTab === 'changes' && p.status !== 'changes_requested') return false;
    if (activeTab === 'approved' && p.status !== 'approved') return false;
    if (activeTab === 'rejected' && p.status !== 'rejected') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        p.proposalId?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q) ||
        p.department?.toLowerCase().includes(q) ||
        p.proposedByName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: proposals.length,
    pending: proposals.filter((p) => p.status === 'pending_central_approval').length,
    changes: proposals.filter((p) => p.status === 'changes_requested').length,
    approved: proposals.filter((p) => p.status === 'approved').length,
    rejected: proposals.filter((p) => p.status === 'rejected').length,
  };

  return (
    <OfficerLayout>
      <div className="space-y-6 pb-12">
        {/* State Governance Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden">
          <div className="relative z-10 max-w-4xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 rounded-full">
                {userState} State Procurement Governance
              </span>
              <span className="text-xs text-slate-300">• State Nodal &amp; Department Administration</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              State Departments &amp; Central Approval Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Add Districts, Mandis/Centres, Officers/Staff &amp; Crops. All state-level proposals are submitted to the Central Officer for approval. In case of revisions, reply messages/SMS are reviewed here and re-submitted.
            </p>
          </div>
          <Layers className="w-64 h-64 absolute -right-10 -bottom-10 text-emerald-400/5 pointer-events-none" />
        </div>

        {/* ── State Level Department Architecture ── */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>State Executive Department Wings ({STATE_DEPARTMENTS.length})</span>
              </h2>
              <p className="text-xs text-slate-500">Functional departments managing state-wide agricultural procurement</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {STATE_DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              return (
                <div key={dept.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${dept.color} text-white flex items-center justify-center shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      {dept.code}
                    </span>
                  </div>
                  <h3 className="text-xs font-black text-slate-900 leading-tight">{dept.name}</h3>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">{dept.hindiName}</p>
                  <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-tight">{dept.mandate}</p>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-700">
                    <span>{dept.headRole}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">{dept.activeCount} Staff</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── State Officer Action Buttons for Creating Proposals ── */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 p-6 rounded-3xl border border-emerald-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-700" />
                <span>State Resource Addition Proposals</span>
              </h2>
              <p className="text-xs text-slate-600">State officers initiate proposals &rarr; Sent to Central Officer for approval &amp; live publishing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => {
                setFormData({ districtName: '', nodalOfficerName: '', contactMobile: '', contactEmail: '' });
                setCreateModalType('add_district');
              }}
              className="p-4 rounded-2xl bg-white border-2 border-emerald-300 hover:border-emerald-600 hover:shadow-md transition text-left flex items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Add District &amp; Nodal</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Propose new administrative district scope</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData({ name: '', district: '', dailyCapacity: 100, address: '', operatingHours: '08:00 - 18:00' });
                setCreateModalType('add_mandi');
              }}
              className="p-4 rounded-2xl bg-white border-2 border-amber-300 hover:border-amber-600 hover:shadow-md transition text-left flex items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Add Mandi / Centre</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Setup new procurement center/mandi</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData({ name: '', mobile: '', email: '', role: 'district_officer', district: '', department: 'Procurement & Mandi Board', designation: '' });
                setCreateModalType('add_officer_staff');
              }}
              className="p-4 rounded-2xl bg-white border-2 border-blue-300 hover:border-blue-600 hover:shadow-md transition text-left flex items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Add Officer &amp; Staff</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Register district officer &amp; staff</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData({ name: '', nameHindi: '', mspPrice: 2275, category: 'Cereal', season: 'Rabi' });
                setCreateModalType('add_crop');
              }}
              className="p-4 rounded-2xl bg-white border-2 border-purple-300 hover:border-purple-600 hover:shadow-md transition text-left flex items-start gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Wheat className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Add State Crop</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Add state crop &amp; MSP parameters</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── Active Proposals Tracker ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header & Filter Tabs */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>State Proposals Status Tracker</span>
              </h2>
              <p className="text-xs text-slate-500">Track approvals and Central Officer reply feedback messages</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ID, title, officer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={fetchProposals}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                title="Refresh proposals list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
            {[
              { key: 'all', label: `All Proposals (${counts.all})` },
              { key: 'pending', label: `Pending Approval (${counts.pending})` },
              { key: 'changes', label: `Changes Requested / SMS (${counts.changes})` },
              { key: 'approved', label: `Approved & Live (${counts.approved})` },
              { key: 'rejected', label: `Rejected (${counts.rejected})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table / List */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading state proposals...</div>
            ) : filteredProposals.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No state proposals found in this category.</p>
                <p className="text-xs text-slate-400">Use the buttons above to propose a new District, Mandi, Staff or Crop.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Ref. ID</th>
                    <th className="py-3 px-3">Title &amp; Category</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Submitted By</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Central SMS / Reply Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProposals.map((item) => {
                    const latestFeedback = item.feedbackHistory && item.feedbackHistory.length > 0
                      ? item.feedbackHistory[item.feedbackHistory.length - 1]
                      : null;

                    return (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{item.proposalId}</td>
                        <td className="py-3.5 px-3 max-w-xs">
                          <p className="font-bold text-slate-900 leading-tight">{item.title}</p>
                          <span className="text-[10px] text-slate-500 capitalize bg-slate-100 px-1.5 py-0.5 rounded font-mono mt-0.5 inline-block">
                            {item.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 font-semibold">{item.department}</td>
                        <td className="py-3.5 px-3 text-slate-700">
                          <p className="font-bold text-slate-900">{item.proposedByName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{item.proposedByEmpId}</p>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full ${
                              item.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : item.status === 'changes_requested'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                : item.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {item.status === 'approved'
                              ? 'Approved (Live)'
                              : item.status === 'changes_requested'
                              ? 'Central SMS / Revision Needed'
                              : item.status === 'rejected'
                              ? 'Rejected'
                              : 'Pending Approval'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 max-w-xs text-xs">
                          {latestFeedback ? (
                            <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900 mb-0.5">
                                <MessageSquare className="w-3 h-3 text-amber-700" />
                                <span>{latestFeedback.senderRole}:</span>
                              </div>
                              <p className="text-[11px] text-slate-800 italic leading-snug">"{latestFeedback.message}"</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No feedback notes yet</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {item.status === 'changes_requested' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditModalProposal(item);
                                setRevisionNote('');
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition flex items-center gap-1 ml-auto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Revise &amp; Re-submit</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold">
                              {item.status === 'approved' ? 'Gazetted' : 'In Review'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Modal 1: Create New Proposal ── */}
        {createModalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {userState} State Proposal
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1 capitalize">
                    Propose {createModalType.replace('_', ' ')}
                  </h3>
                </div>
                <button
                  onClick={() => setCreateModalType(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateProposal} className="space-y-3 text-xs">
                {createModalType === 'add_district' && (
                  <>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">District Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ludhiana, Patiala, Bathinda"
                        value={formData.districtName || ''}
                        onChange={(e) => setFormData({ ...formData, districtName: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Nodal Officer Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Sh. Harpreet Singh"
                          value={formData.nodalOfficerName || ''}
                          onChange={(e) => setFormData({ ...formData, nodalOfficerName: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Contact Mobile</label>
                        <input
                          type="text"
                          placeholder="10 digit mobile"
                          value={formData.contactMobile || ''}
                          onChange={(e) => setFormData({ ...formData, contactMobile: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {createModalType === 'add_mandi' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Mandi / Centre Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Khanna Grain Market"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">District *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ludhiana"
                          value={formData.district || ''}
                          onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Daily Capacity (Quintal)</label>
                        <input
                          type="number"
                          value={formData.dailyCapacity || 100}
                          onChange={(e) => setFormData({ ...formData, dailyCapacity: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Operating Hours</label>
                        <input
                          type="text"
                          placeholder="e.g. 08:00 - 18:00"
                          value={formData.operatingHours || '08:00 - 18:00'}
                          onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {createModalType === 'add_officer_staff' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Officer Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Full name"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Mobile *</label>
                        <input
                          type="text"
                          required
                          placeholder="10 digit mobile"
                          value={formData.mobile || ''}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">District</label>
                        <input
                          type="text"
                          placeholder="Assigned District"
                          value={formData.district || ''}
                          onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Role Designation</label>
                        <select
                          value={formData.role || 'district_officer'}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="district_officer">District Nodal Officer (DNO)</option>
                          <option value="centre_head">Procurement Centre Head (PCH)</option>
                          <option value="procurement_officer">Procurement Officer (PO)</option>
                          <option value="quality_staff">Quality Checking Officer (QWS)</option>
                          <option value="gate_staff">Gate Officer / Verification Staff (GVS)</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {createModalType === 'add_crop' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Crop Name (English) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sharbati Wheat"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Crop Name (Hindi)</label>
                        <input
                          type="text"
                          placeholder="e.g. शरबती गेहूं"
                          value={formData.nameHindi || ''}
                          onChange={(e) => setFormData({ ...formData, nameHindi: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">MSP Rate (₹/Quintal) *</label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 2275"
                          value={formData.mspPrice || 2275}
                          onChange={(e) => setFormData({ ...formData, mspPrice: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Season</label>
                        <select
                          value={formData.season || 'Rabi'}
                          onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="Rabi">Rabi</option>
                          <option value="Kharif">Kharif</option>
                          <option value="Zaid">Zaid</option>
                          <option value="All">All Season</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Proposal Description &amp; Administrative Justification</label>
                  <textarea
                    rows={2}
                    placeholder="Enter context, expected capacity, or official order ref..."
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-snug">
                  📌 <strong>Central Approval Rule</strong>: This proposal will be routed to the Central Officer for approval. After Central review, it will be published live to the database.
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalType(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : 'Submit to Central Officer'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal 2: Edit & Re-submit Proposal (based on Central Reply SMS) ── */}
        {editModalProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {editModalProposal.proposalId}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Revise &amp; Re-submit Proposal
                  </h3>
                </div>
                <button
                  onClick={() => setEditModalProposal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleResubmit} className="space-y-3 text-xs">
                {/* Central Reply SMS / Feedback Box */}
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <MessageSquare className="w-4 h-4 text-amber-700" />
                    <span>Central Officer Reply SMS / Feedback:</span>
                  </div>
                  <p className="text-xs italic bg-white p-2.5 rounded-xl border border-amber-200 text-slate-900">
                    "{editModalProposal.feedbackHistory?.[editModalProposal.feedbackHistory.length - 1]?.message || 'Changes requested by Central Officer.'}"
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Proposal Title</label>
                  <input
                    type="text"
                    value={editModalProposal.title || ''}
                    onChange={(e) => setEditModalProposal({ ...editModalProposal, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Dynamic Payload Field Editor */}
                <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="font-bold text-slate-900 text-xs">Proposed Data Payload Fields:</p>
                  {Object.entries(editModalProposal.payload || {}).map(([key, val]) => {
                    if (typeof val === 'object' && val !== null) return null;
                    return (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        <span className="w-28 font-semibold text-slate-600 capitalize truncate">{key}:</span>
                        <input
                          type="text"
                          value={val || ''}
                          onChange={(e) => {
                            const newPayload = { ...editModalProposal.payload, [key]: e.target.value };
                            setEditModalProposal({ ...editModalProposal, payload: newPayload });
                          }}
                          className="flex-1 p-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
                        />
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">State Officer Revision Note for Central Officer</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe changes made according to Central Officer reply SMS..."
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalProposal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Re-submitting...' : 'Re-submit for Central Approval'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OfficerLayout>
  );
};

export default StateDepartmentPage;
