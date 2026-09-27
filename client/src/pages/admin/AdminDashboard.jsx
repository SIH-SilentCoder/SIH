import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Landmark, Users, Wheat, Shield, PlusCircle, Clock,
  CheckCircle2, AlertTriangle, XCircle, Send, MessageSquare, Edit3,
  FileText, ArrowRight, RefreshCw, Layers, Check, Search, Filter,
  ShieldCheck, IndianRupee, Scale, ChevronRight, Eye, Sparkles
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { adminService, centreService, cropService, stateProposalService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, extractError } from '../../utils/constants';
import toast from 'react-hot-toast';

// ── State Level Executive Department Wings ──
const STATE_DEPARTMENTS = [
  {
    id: 'agriculture',
    name: 'Agriculture & Crop Management',
    hindiName: 'कृषि एवं फसल प्रबंधन विभाग',
    code: 'AGR',
    icon: Wheat,
    color: 'from-emerald-600 to-teal-700',
    headRole: 'Director of Agriculture',
    defaultCount: 14,
    mandate: 'Crop MSP rates, yield estimation, moisture tolerance norms & crop registrations.',
  },
  {
    id: 'procurement',
    name: 'Procurement & Mandi Board',
    hindiName: 'खरीद एवं मंडी बोर्ड विभाग',
    code: 'PRC',
    icon: Landmark,
    color: 'from-amber-600 to-orange-700',
    headRole: 'Chief Procurement Controller',
    defaultCount: 22,
    mandate: 'Procurement centre/mandi setup, daily intake capacity & slot allocation.',
  },
  {
    id: 'logistics',
    name: 'Logistics & Warehousing',
    hindiName: 'लॉजिस्टिक्स एवं भंडारण विभाग',
    code: 'LOG',
    icon: Building2,
    color: 'from-blue-600 to-indigo-700',
    headRole: 'General Manager Warehousing',
    defaultCount: 18,
    mandate: 'Warehouse capacity allocation, gunny bag dispatch & transport movement.',
  },
  {
    id: 'quality',
    name: 'Quality Assurance & Inspection',
    hindiName: 'गुणवत्ता आश्वासन एवं जांच विभाग',
    code: 'QA',
    icon: Shield,
    color: 'from-purple-600 to-violet-700',
    headRole: 'Chief Quality Assessor',
    defaultCount: 12,
    mandate: 'Moisture testing, foreign matter verification, grade certification & lab audits.',
  },
  {
    id: 'admin',
    name: 'Administration & Nodal Department',
    hindiName: 'प्रशासनिक एवं नोडल विभाग',
    code: 'ADM',
    icon: Users,
    color: 'from-slate-700 to-slate-900',
    headRole: 'State Nodal Officer (IAS)',
    defaultCount: 8,
    mandate: 'District Nodal Officer appointments, officer credentials & central workflow routing.',
  },
];

// ── Central Level Apex Executive Directorates ──
const CENTRAL_DIRECTORATES = [
  {
    id: 'c-agr',
    name: 'National Agriculture & Policy Directorate',
    hindiName: 'केंद्रीय कृषि एवं नीति प्रभाग',
    code: 'C-AGR',
    icon: Wheat,
    color: 'from-emerald-600 to-teal-700',
    headRole: 'DG Agriculture & MSP Advisor',
    mandate: 'National MSP gazetting, buffer quota allocations & central moisture tolerance norms.',
  },
  {
    id: 'c-prc',
    name: 'Central Mandi & Procurement Oversight',
    hindiName: 'केंद्रीय मंडी एवं अधिप्राप्ति प्रभाग',
    code: 'C-PRC',
    icon: Landmark,
    color: 'from-amber-600 to-orange-700',
    headRole: 'Chief Procurement Commissioner',
    mandate: 'Nationwide mandi accreditations, interstate procurement balance & capacity checks.',
  },
  {
    id: 'c-log',
    name: 'Strategic Logistics & Central Warehousing',
    hindiName: 'सामरिक लॉजिस्टिक्स एवं भंडारण प्रभाग',
    code: 'C-LOG',
    icon: Building2,
    color: 'from-blue-600 to-indigo-700',
    headRole: 'Director (Rail Logistics & CWC)',
    mandate: 'Interstate freight rake scheduling, central silo storage & gunny bag logistics.',
  },
  {
    id: 'c-qa',
    name: 'National Quality & Agmark Certification',
    hindiName: 'राष्ट्रीय गुणवत्ता एवं प्रमाणन प्रभाग',
    code: 'C-QA',
    icon: Shield,
    color: 'from-purple-600 to-violet-700',
    headRole: 'Chief Quality Assessor (GoI)',
    mandate: 'Pan-India FAQ grade standards, Central Laboratory audits & moisture certification.',
  },
  {
    id: 'c-adm',
    name: 'Apex State Nodal Governance & DBT',
    hindiName: 'शीर्ष राज्य नोडल समन्वय एवं डीबीटी',
    code: 'C-ADM',
    icon: Users,
    color: 'from-slate-700 to-slate-900',
    headRole: 'Joint Secretary (Procurement & DBT)',
    mandate: 'State proposal approvals, State Officer commissioning & PFMS treasury releases.',
  },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const isStateOfficer = user?.role === 'state_officer';
  const isDistrictOfficer = user?.role === 'district_officer';
  const isCentralAdmin = user?.role === 'central_admin' || user?.role === 'admin' || (!isStateOfficer && !isDistrictOfficer);

  const userState = user?.state || 'Punjab';
  const userDistrict = user?.district || 'District';

  // State selection for Central Admin inspection
  const [selectedStateScope, setSelectedStateScope] = useState('all');

  // Core Data States
  const [summaryData, setSummaryData] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [centres, setCentres] = useState([]);
  const [crops, setCrops] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proposalsLoading, setProposalsLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals for State Officers
  const [createModalType, setCreateModalType] = useState(null); // 'add_district', 'add_mandi', 'add_officer_staff', 'add_crop'
  const [editModalProposal, setEditModalProposal] = useState(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Modals for Central Admin
  const [centralActionModal, setCentralActionModal] = useState(null); // 'accredit_state', 'appoint_state_officer', 'gazette_crop'
  const [feedbackModalProposal, setFeedbackModalProposal] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [inspectModalProposal, setInspectModalProposal] = useState(null);

  // Fetch Dashboard Summary & Resource Lists
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, centresRes, cropsRes, statesRes] = await Promise.all([
        adminService.getDashboard().catch(() => ({ data: { data: {} } })),
        centreService.getCentres().catch(() => ({ data: { data: { centres: [] } } })),
        cropService.getCrops().catch(() => ({ data: { data: { crops: [] } } })),
        adminService.getStates().catch(() => ({ data: { data: { states: [] } } })),
      ]);

      setSummaryData(dashRes.data?.data || {});
      setCentres(centresRes.data?.data?.centres || []);
      setCrops(cropsRes.data?.data?.crops || []);
      setStatesList(statesRes.data?.data?.states || []);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Proposals List
  const fetchProposals = async () => {
    setProposalsLoading(true);
    try {
      const params = {};
      if (isStateOfficer) {
        params.state = userState;
      } else if (isDistrictOfficer) {
        params.state = userState;
      } else if (selectedStateScope !== 'all') {
        params.state = selectedStateScope;
      }

      const res = await stateProposalService.getProposals(params);
      if (res.data?.success) {
        setProposals(res.data.data?.proposals || []);
      }
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    } finally {
      setProposalsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userState]);

  useEffect(() => {
    fetchProposals();
  }, [userState, selectedStateScope, isStateOfficer, isDistrictOfficer]);

  // Handle State Officer Creating a Proposal
  const handleCreateProposal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activeState = isStateOfficer ? userState : (selectedStateScope !== 'all' ? selectedStateScope : 'Punjab');
      let title = '';
      let department = 'Procurement & Mandi Board';

      if (createModalType === 'add_district') {
        title = `New District Addition: ${formData.districtName} (${activeState})`;
        department = 'Administration & Nodal Department';
      } else if (createModalType === 'add_mandi') {
        title = `New Mandi Setup: ${formData.name} (${formData.district || 'Mandi Center'})`;
        department = 'Procurement & Mandi Board';
      } else if (createModalType === 'add_officer_staff') {
        title = `Officer Appointment: ${formData.name} (${formData.role})`;
        department = formData.department || 'Procurement & Mandi Board';
      } else if (createModalType === 'add_crop') {
        title = `State Crop Registration: ${formData.name} (MSP ₹${formData.mspPrice})`;
        department = 'Agriculture & Crop Management';
      }

      const body = {
        category: createModalType,
        title,
        description: formData.description || `Proposal submitted for ${activeState} state procurement.`,
        department,
        payload: { ...formData, state: activeState },
      };

      await stateProposalService.createProposal(body);
      toast.success('Proposal submitted to Central Officer for approval!');
      setCreateModalType(null);
      setFormData({});
      fetchProposals();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle State Officer Re-submitting after Central Feedback
  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!editModalProposal) return;
    setSubmitting(true);

    try {
      await stateProposalService.updateProposal(editModalProposal._id, {
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
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Central Admin: One-Click Approve Proposal
  const handleApproveProposal = async (proposalId) => {
    if (!window.confirm('Confirm approval of this state proposal? It will be gazetted and activated immediately.')) {
      return;
    }
    try {
      await stateProposalService.approveProposal(proposalId, { remarks: 'Approved by Central Procurement Organisation.' });
      toast.success('Proposal Approved and successfully gazetted/activated in live database!');
      fetchProposals();
      fetchDashboardData();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  // Central Admin: Send Feedback / Revision Notes to State Officer
  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackModalProposal || !feedbackMessage.trim()) return;
    setSubmitting(true);
    try {
      await stateProposalService.replyFeedback(feedbackModalProposal._id, { message: feedbackMessage.trim() });
      toast.success('Revision request & SMS feedback dispatched to State Officer!');
      setFeedbackModalProposal(null);
      setFeedbackMessage('');
      fetchProposals();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Central Admin: Reject Proposal
  const handleRejectProposal = async (proposalId) => {
    const reason = window.prompt('Enter reason for rejection:');
    if (!reason) return;
    try {
      await stateProposalService.rejectProposal(proposalId, { remarks: reason });
      toast.error('Proposal marked as Rejected.');
      fetchProposals();
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  // Central Admin: Accredit State
  const handleAccreditState = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createState(formData);
      toast.success(`State ${formData.name} accredited to national procurement network!`);
      setCentralActionModal(null);
      setFormData({});
      fetchDashboardData();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Central Admin: Appoint State Officer
  const handleAppointStateOfficer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createStateOfficer(formData);
      toast.success(`State Officer for ${formData.state} commissioned successfully!`);
      setCentralActionModal(null);
      setFormData({});
      fetchDashboardData();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Central Admin: Gazette Crop
  const handleGazetteCrop = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createCrop(formData);
      toast.success(`Crop ${formData.name} gazetted at MSP ₹${formData.mspPrice}/qtl!`);
      setCentralActionModal(null);
      setFormData({});
      fetchDashboardData();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (activeTab === 'pending' && p.status !== 'pending_central_approval') return false;
      if (activeTab === 'changes' && p.status !== 'changes_requested') return false;
      if (activeTab === 'approved' && p.status !== 'approved') return false;
      if (activeTab === 'rejected' && p.status !== 'rejected') return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          p.proposalId?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.state?.toLowerCase().includes(q) ||
          p.department?.toLowerCase().includes(q) ||
          p.proposedByName?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [proposals, activeTab, searchTerm]);

  const proposalCounts = useMemo(() => ({
    all: proposals.length,
    pending: proposals.filter((p) => p.status === 'pending_central_approval').length,
    changes: proposals.filter((p) => p.status === 'changes_requested').length,
    approved: proposals.filter((p) => p.status === 'approved').length,
    rejected: proposals.filter((p) => p.status === 'rejected').length,
  }), [proposals]);

  const summary = summaryData?.summary || {};
  const isViewingStateLevel = isStateOfficer || isDistrictOfficer || (isCentralAdmin && selectedStateScope !== 'all');
  const activeScopeStateName = isStateOfficer ? userState : (selectedStateScope !== 'all' ? selectedStateScope : 'National');

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* ── Top Governance Console Header Banner (Exact Match with Screenshot) ── */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden">
          <div className="relative z-10 max-w-4xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-3 py-1 rounded-full">
                {isCentralAdmin && selectedStateScope === 'all'
                  ? 'NATIONAL PROCUREMENT GOVERNANCE'
                  : `${activeScopeStateName.toUpperCase()} STATE PROCUREMENT GOVERNANCE`}
              </span>
              <span className="text-xs text-slate-300">
                • {isCentralAdmin && selectedStateScope === 'all'
                  ? 'Central Procurement Organization (CPO) Command'
                  : 'State Nodal & Department Administration'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {isCentralAdmin && selectedStateScope === 'all'
                ? 'Central Command & State Approval Console'
                : `${activeScopeStateName} State Departments & Central Approval Console`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              {isCentralAdmin && selectedStateScope === 'all'
                ? 'Review and approve State Proposals (Districts, Mandis/Centres, Officers/Staff & Crops) across all States. Review revisions, dispatch SMS feedback, and gazette live nationwide procurement.'
                : 'Add Districts, Mandis/Centres, Officers/Staff & Crops. All state-level proposals are submitted to the Central Officer for approval. In case of revisions, reply messages/SMS are reviewed here and re-submitted.'}
            </p>
          </div>
          <Layers className="w-64 h-64 absolute -right-10 -bottom-10 text-emerald-400/5 pointer-events-none" />
        </div>

        {/* ── Central Scope Bar (Only for Central Admin to inspect All States or a Specific State) ── */}
        {isCentralAdmin && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800">Command Level Scope:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <button
                  onClick={() => setSelectedStateScope('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedStateScope === 'all'
                      ? 'bg-[#0b1329] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  National Central Level
                </button>
                {['Punjab', 'Haryana', 'Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStateScope(st)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedStateScope === st
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st} State
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">
                Pending Central Approvals:
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                {proposalCounts.pending}
              </span>
            </div>
          </div>
        )}

        {/* ── Section 1: Executive Department Wings (5 Cards Exactly as in Screenshot) ── */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>
                  {isCentralAdmin && selectedStateScope === 'all'
                    ? `National Apex Executive Directorates (${CENTRAL_DIRECTORATES.length})`
                    : `${activeScopeStateName} State Executive Department Wings (${STATE_DEPARTMENTS.length})`}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {isCentralAdmin && selectedStateScope === 'all'
                  ? 'Central apex divisions governing nationwide food grain procurement & policy'
                  : 'Functional departments managing state-wide agricultural procurement'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {(isCentralAdmin && selectedStateScope === 'all' ? CENTRAL_DIRECTORATES : STATE_DEPARTMENTS).map((dept, idx) => {
              const Icon = dept.icon;
              return (
                <div
                  key={dept.id || idx}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div>
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
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-slate-700">
                    <span className="truncate pr-1">{dept.headRole}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {isCentralAdmin && selectedStateScope === 'all'
                        ? (idx === 0 ? `${crops.length || 4} Crops` : (idx === 1 ? `${centres.length || 39} Mandis` : 'Active Wing'))
                        : `${dept.defaultCount || 14} Staff`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 2: Resource Addition / Action Cards (4 Cards in Screenshot Style) ── */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 p-6 rounded-3xl border border-emerald-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                {isCentralAdmin && selectedStateScope === 'all' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-emerald-700" />
                )}
                <span>
                  {isCentralAdmin && selectedStateScope === 'all'
                    ? 'Central Authority Actions & State Resource Expansion'
                    : `${activeScopeStateName} State Resource Addition Proposals`}
                </span>
              </h2>
              <p className="text-xs text-slate-600">
                {isCentralAdmin && selectedStateScope === 'all'
                  ? 'Central Procurement Organization sanctions & nationwide onboarding'
                  : 'State officers initiate proposals → Sent to Central Officer for approval & live publishing'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {isCentralAdmin && selectedStateScope === 'all' ? (
              // Central Admin 4 Action Cards
              <>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('proposals-tracker-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    setActiveTab('pending');
                  }}
                  className="p-4 rounded-2xl bg-white border-2 border-emerald-300 hover:border-emerald-600 hover:shadow-md transition text-left flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">Review State Proposals</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Approve or request changes ({proposalCounts.pending} pending)
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({ name: '', code: '', zone: 'North', nodalHeadName: '', nodalHeadMobile: '', nodalHeadEmail: '', description: '' });
                    setCentralActionModal('accredit_state');
                  }}
                  className="p-4 rounded-2xl bg-white border-2 border-amber-300 hover:border-amber-600 hover:shadow-md transition text-left flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">Accredit State / UT</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Onboard new State Procurement Organization
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({ name: '', mobile: '', email: '', state: 'Punjab', department: 'Administration & Nodal Department' });
                    setCentralActionModal('appoint_state_officer');
                  }}
                  className="p-4 rounded-2xl bg-white border-2 border-blue-300 hover:border-blue-600 hover:shadow-md transition text-left flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">Appoint State Officer (SPO)</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Commission state nodal officer credentials
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({ name: '', nameHindi: '', mspPrice: 2275, category: 'Cereal', season: 'Rabi' });
                    setCentralActionModal('gazette_crop');
                  }}
                  className="p-4 rounded-2xl bg-white border-2 border-purple-300 hover:border-purple-600 hover:shadow-md transition text-left flex items-start gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Wheat className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">Gazette National MSP</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Revise and publish nationwide commodity MSP
                    </p>
                  </div>
                </button>
              </>
            ) : (
              // State Level 4 Action Cards (Exact Match with Screenshot)
              <>
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
              </>
            )}
          </div>
        </div>

        {/* ── Section 3: State Proposals Status Tracker / Approval Console ── */}
        <div id="proposals-tracker-section" className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header & Filter Controls */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>
                  {isCentralAdmin && selectedStateScope === 'all'
                    ? 'National State Proposals Approval Console'
                    : `${activeScopeStateName} State Proposals Status Tracker`}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {isCentralAdmin && selectedStateScope === 'all'
                  ? 'Review, approve, or request revisions on state-level infrastructure & staff proposals'
                  : 'Track approvals and Central Officer reply feedback messages / SMS'}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ID, title, officer, state..."
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
                <RefreshCw className={`w-4 h-4 ${proposalsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
            {[
              { key: 'all', label: `All Proposals (${proposalCounts.all})` },
              { key: 'pending', label: `Pending Central Approval (${proposalCounts.pending})` },
              { key: 'changes', label: `Changes Requested / SMS (${proposalCounts.changes})` },
              { key: 'approved', label: `Approved & Live (${proposalCounts.approved})` },
              { key: 'rejected', label: `Rejected (${proposalCounts.rejected})` },
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

          {/* Proposals Table */}
          <div className="overflow-x-auto">
            {proposalsLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading proposals data...</div>
            ) : filteredProposals.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No proposals found in this category.</p>
                <p className="text-xs text-slate-400">
                  {isCentralAdmin
                    ? 'No state proposals currently require action in this filter.'
                    : 'Use the buttons above to propose a new District, Mandi, Staff or Crop.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Ref. ID</th>
                    <th className="py-3 px-3">Title &amp; Category</th>
                    <th className="py-3 px-3">State &amp; Dept</th>
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
                            {item.category?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 font-semibold">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold mr-1">
                            {item.state}
                          </span>
                          <span className="text-xs">{item.department}</span>
                        </td>
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
                              ? 'Changes Requested'
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
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setInspectModalProposal(item)}
                              className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1"
                              title="View Proposal Details"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>

                            {/* Central Admin Approval Controls */}
                            {isCentralAdmin && item.status === 'pending_central_approval' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveProposal(item._id)}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1 shadow-xs"
                                  title="Approve and activate"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFeedbackModalProposal(item);
                                    setFeedbackMessage('');
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition flex items-center gap-1 shadow-xs"
                                  title="Request revisions with SMS feedback"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>SMS / Changes</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectProposal(item._id)}
                                  className="px-2 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition flex items-center gap-1"
                                  title="Reject proposal"
                                >
                                  <XCircle className="w-3 h-3" />
                                </button>
                              </>
                            )}

                            {/* State Officer Re-submit Control */}
                            {!isCentralAdmin && item.status === 'changes_requested' && (
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
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Key Executive Summary Indicators Footer (Subtle Live Metrics) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isCentralAdmin && selectedStateScope === 'all' ? 'National Mandis' : `${activeScopeStateName} Mandis`}
              </p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{centres.length || summary.totalCentres || 39}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Enrolled Farmers</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{(summary.totalFarmers || 31220).toLocaleString('en-IN')}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Procured Volume</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {summary.completedProcurements ? `${(summary.completedProcurements * 35 / 1000).toFixed(1)}k MT` : '132.9k MT'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total MSP Disbursed</p>
              <p className="text-xl font-black text-emerald-800 font-mono mt-0.5">
                {formatCurrency(summary.totalProcurementValue || 302330000)}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ── MODALS: State Officer Addition Modals ── */}
        {createModalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {activeScopeStateName} State Proposal
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1 capitalize">
                    Propose {createModalType.replace(/_/g, ' ')}
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
                          placeholder="e.g. Khanna Grain Mandi"
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
                        <label className="block text-slate-700 font-bold mb-1">Daily Capacity (Quintals)</label>
                        <input
                          type="number"
                          placeholder="100"
                          value={formData.dailyCapacity || ''}
                          onChange={(e) => setFormData({ ...formData, dailyCapacity: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Operating Hours</label>
                        <input
                          type="text"
                          placeholder="08:00 - 18:00"
                          value={formData.operatingHours || ''}
                          onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Full Mandi Address</label>
                      <input
                        type="text"
                        placeholder="Complete location address..."
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
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
                          placeholder="Full Name"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Mobile Number *</label>
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
                        <label className="block text-slate-700 font-bold mb-1">Officer Role *</label>
                        <select
                          value={formData.role || 'district_officer'}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="district_officer">District Nodal Officer (DNO)</option>
                          <option value="centre_head">Procurement Centre Head (PCH)</option>
                          <option value="procurement_officer">Procurement Officer (PO)</option>
                          <option value="quality_staff">Quality &amp; Weighing Staff (QWS)</option>
                          <option value="gate_staff">Gate Verification Staff (GVS)</option>
                        </select>
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
                          placeholder="e.g. Basmati Rice"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Crop Name (Hindi)</label>
                        <input
                          type="text"
                          placeholder="e.g. बासमती धान"
                          value={formData.nameHindi || ''}
                          onChange={(e) => setFormData({ ...formData, nameHindi: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Proposed MSP (₹/Quintal) *</label>
                        <input
                          type="number"
                          required
                          placeholder="2275"
                          value={formData.mspPrice || ''}
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
                          <option value="Rabi">Rabi (रबी)</option>
                          <option value="Kharif">Kharif (खरीफ)</option>
                          <option value="Zaid">Zaid (जायद)</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Justification / Proposal Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Provide details or operational reasons for this proposal..."
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalType(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit to Central Officer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODALS: Central Admin Action Modals ── */}
        {centralActionModal === 'accredit_state' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Central Governance
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">Accredit New State / UT</h3>
                </div>
                <button onClick={() => setCentralActionModal(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleAccreditState} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">State Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gujarat"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">State Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GJ"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Zone</label>
                    <select
                      value={formData.zone || 'North'}
                      onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="North">North Zone</option>
                      <option value="South">South Zone</option>
                      <option value="East">East Zone</option>
                      <option value="West">West Zone</option>
                      <option value="Central">Central Zone</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Nodal Head Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. K. Patel"
                      value={formData.nodalHeadName || ''}
                      onChange={(e) => setFormData({ ...formData, nodalHeadName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCentralActionModal(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow-xs"
                  >
                    {submitting ? 'Accrediting...' : 'Accredit State'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {centralActionModal === 'appoint_state_officer' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Central Appointment
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">Appoint State Officer (SPO)</h3>
                </div>
                <button onClick={() => setCentralActionModal(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleAppointStateOfficer} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sardar Jaspreet Singh"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Mobile Number *</label>
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
                    <label className="block text-slate-700 font-bold mb-1">State Assignment *</label>
                    <select
                      value={formData.state || 'Punjab'}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {['Punjab', 'Haryana', 'Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Gujarat'].map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="officer@state.gov.in"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCentralActionModal(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs"
                  >
                    {submitting ? 'Commissioning...' : 'Commission SPO'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {centralActionModal === 'gazette_crop' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    Central MSP Gazette
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">Gazette National Crop MSP</h3>
                </div>
                <button onClick={() => setCentralActionModal(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleGazetteCrop} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Crop Name (English) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wheat"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Crop Name (Hindi)</label>
                    <input
                      type="text"
                      placeholder="e.g. गेहूं"
                      value={formData.nameHindi || ''}
                      onChange={(e) => setFormData({ ...formData, nameHindi: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">MSP (₹/Quintal) *</label>
                    <input
                      type="number"
                      required
                      placeholder="2275"
                      value={formData.mspPrice || ''}
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
                      <option value="Rabi">Rabi (रबी)</option>
                      <option value="Kharif">Kharif (खरीफ)</option>
                      <option value="Zaid">Zaid (जायद)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCentralActionModal(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs"
                  >
                    {submitting ? 'Gazetting...' : 'Gazette Crop'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: Central Feedback / SMS Notes to State Officer ── */}
        {feedbackModalProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Central Review Feedback
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Request Changes &amp; Send Official SMS Note
                  </h3>
                </div>
                <button onClick={() => setFeedbackModalProposal(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <p className="font-bold text-slate-900">{feedbackModalProposal.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  State: <strong>{feedbackModalProposal.state}</strong> • Submitter: {feedbackModalProposal.proposedByName} ({feedbackModalProposal.proposedByEmpId})
                </p>
              </div>

              <form onSubmit={handleSendFeedback} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Official Revision Notes / SMS Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Specify the revisions required by Central Procurement Organization..."
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This note will be transmitted to the State Officer and status will be updated to "Changes Requested".
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackModalProposal(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !feedbackMessage.trim()}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Transmitting...' : 'Send SMS / Revision Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: State Officer Revise & Re-submit ── */}
        {editModalProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Revise &amp; Re-submit
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {editModalProposal.proposalId}: {editModalProposal.title}
                  </h3>
                </div>
                <button onClick={() => setEditModalProposal(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleResubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Updated Proposal Title</label>
                  <input
                    type="text"
                    value={editModalProposal.title}
                    onChange={(e) => setEditModalProposal({ ...editModalProposal, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">State Officer Revision Explanation Note *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain modifications made addressing Central Officer feedback..."
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalProposal(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !revisionNote.trim()}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Re-submitting...' : 'Re-submit to Central Officer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: Inspect Proposal Details ── */}
        {inspectModalProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {inspectModalProposal.proposalId}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">{inspectModalProposal.title}</h3>
                </div>
                <button onClick={() => setInspectModalProposal(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">STATE</span>
                    <p className="font-bold text-slate-800">{inspectModalProposal.state}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">CATEGORY</span>
                    <p className="font-bold text-slate-800 capitalize">{inspectModalProposal.category?.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">DEPARTMENT</span>
                    <p className="font-bold text-slate-800">{inspectModalProposal.department}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">SUBMITTER</span>
                    <p className="font-bold text-slate-800">{inspectModalProposal.proposedByName} ({inspectModalProposal.proposedByEmpId})</p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500">PAYLOAD PARAMETERS</span>
                  <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto mt-1">
                    <pre>{JSON.stringify(inspectModalProposal.payload, null, 2)}</pre>
                  </div>
                </div>

                {inspectModalProposal.feedbackHistory && inspectModalProposal.feedbackHistory.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500">COMMUNICATION TRAIL</span>
                    <div className="space-y-2 mt-1">
                      {inspectModalProposal.feedbackHistory.map((fb, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                          <p className="text-[10px] font-bold text-amber-900">{fb.senderRole || fb.senderName}</p>
                          <p className="text-[11px] text-slate-800 mt-0.5">{fb.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInspectModalProposal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Close
                </button>
                {isCentralAdmin && inspectModalProposal.status === 'pending_central_approval' && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = inspectModalProposal._id;
                      setInspectModalProposal(null);
                      handleApproveProposal(id);
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                  >
                    Approve Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
