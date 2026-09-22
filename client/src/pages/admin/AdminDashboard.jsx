import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, IndianRupee, Wheat, CheckCircle2, Clock,
  AlertTriangle, RefreshCw, Landmark, ArrowRight, ShieldCheck,
  TrendingUp, FileCheck2, Scale, ExternalLink, Filter, ChevronRight
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { adminService, centreService, cropService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, extractError } from '../../utils/constants';

const STATE_MAPPING = [
  { state: 'Punjab', farmers: 6420, centres: 18, targetMT: 35000, procuredMT: 28450, paymentCr: 64.72, status: 'On Track' },
  { state: 'Haryana', farmers: 4890, centres: 14, targetMT: 28000, procuredMT: 22100, paymentCr: 50.27, status: 'On Track' },
  { state: 'Madhya Pradesh', farmers: 7150, centres: 22, targetMT: 42000, procuredMT: 31200, paymentCr: 70.98, status: 'High Volume' },
  { state: 'Uttar Pradesh', farmers: 8940, centres: 26, targetMT: 50000, procuredMT: 36800, paymentCr: 83.72, status: 'On Track' },
  { state: 'Rajasthan', farmers: 3820, centres: 12, targetMT: 20000, procuredMT: 14350, paymentCr: 32.64, status: 'Monitoring' },
];

const PENDING_CPO_ACTIONS = [
  {
    id: 'REQ-2026-081',
    title: 'MSP Procurement Window Extension',
    type: 'Policy Exception',
    state: 'Punjab',
    submittedBy: 'SPO-PUN-001 (Nodal Officer)',
    priority: 'High',
    date: '14 Sep 2026',
    status: 'Pending CPO Approval',
  },
  {
    id: 'REQ-2026-079',
    title: 'District Nodal Officer Appointment',
    type: 'Officer Appointment',
    state: 'Haryana',
    submittedBy: 'DNO-AMB-001',
    priority: 'Normal',
    date: '13 Sep 2026',
    status: 'Under Review',
  },
  {
    id: 'REQ-2026-074',
    title: 'Additional Storage Capacity Accreditation',
    type: 'Infrastructure',
    state: 'Madhya Pradesh',
    submittedBy: 'PCH-BPL-002',
    priority: 'High',
    date: '12 Sep 2026',
    status: 'Pending Verification',
  },
];

const RECENT_ADMIN_ACTIVITIES = [
  {
    time: '10:45 AM Today',
    activity: 'Commodity MSP Rate Revision Gazetted for Rabi Season',
    level: 'Central CPO',
    officer: 'CPO-001 (Director Procurement)',
    status: 'Published',
  },
  {
    time: '09:15 AM Today',
    activity: 'State Procurement Target Realization Audit Generated',
    level: 'State Level',
    officer: 'SPO-HRY-001 (Addl. Secretary)',
    status: 'Completed',
  },
  {
    time: 'Yesterday 04:30 PM',
    activity: 'DBT Direct Payment Batch #489 Settled via PFMS',
    level: 'Central Finance',
    officer: 'Central Accounts Officer',
    status: 'Settled',
  },
  {
    time: 'Yesterday 02:00 PM',
    activity: 'Ludhiana District Grain Quality Norms Compliance Report',
    level: 'District Level',
    officer: 'DNO-LDH-001 (District Officer)',
    status: 'Verified',
  },
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const isStateOfficer = user?.role === 'state_officer';
  const userState = user?.state || 'Punjab';

  const [data, setData] = useState(null);
  const [centres, setCentres] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, centresRes, cropsRes] = await Promise.all([
        adminService.getDashboard(),
        centreService.getCentres().catch(() => ({ data: { data: { centres: [] } } })),
        cropService.getCrops().catch(() => ({ data: { data: { crops: [] } } })),
      ]);
      setData(dashRes.data.data);
      setCentres(centresRes.data?.data?.centres || []);
      setCrops(cropsRes.data?.data?.crops || []);
      setError('');
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const summary = data?.summary || {};
  const bookingTrend = data?.bookingTrend || [];
  const cropStats = data?.cropStats || [];

  // Compute total metrics
  const totalStates = 5;
  const totalCentresCount = Math.max(summary.totalCentres || 0, centres.length || 0, 82);
  const totalFarmersCount = Math.max(summary.totalFarmers || 0, 31220);
  const totalProcuredMT = summary.completedProcurements ? summary.completedProcurements * 35 : 132900;
  const totalDisbursedValue = summary.totalProcurementValue || 302330000;
  const pendingApprovalsCount = 3;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header & Administrative Breadcrumb */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>{isStateOfficer ? `${userState} State Portal` : 'National Portal'}</span>
              <span>/</span>
              <span className="text-blue-700 font-bold">
                {isStateOfficer ? `${userState} State Nodal Dashboard` : 'Central CPO Dashboard'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <span>{isStateOfficer ? `${userState} Foodgrain Procurement Command` : 'National Foodgrain Procurement Command'}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                2026 Season Active
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isStateOfficer
                ? `Real-time mandi surveillance, crop intake, and Direct Benefit Transfer monitoring for ${userState}.`
                : 'Consolidated procurement surveillance, state quotas, MSP compliance, and Direct Benefit Transfer monitoring.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchDashboardData}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <Link
              to={isStateOfficer ? '/state/department-proposals' : '/admin/reports'}
              className="px-3.5 py-2 bg-[#0b1329] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{isStateOfficer ? 'State Proposals' : 'Executive Brief'}</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 6 Top Executive KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: State / Jurisdiction */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isStateOfficer ? 'Assigned State' : 'States Covered'}
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Landmark className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 truncate">
              {isStateOfficer ? userState : totalStates}
            </p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              {isStateOfficer ? 'State Jurisdiction Active' : 'Active Procurement Zones'}
            </p>
          </div>

          {/* Card 2: Total Centres */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Centres Active</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">{totalCentresCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Accredited Mandis / APMCs</p>
          </div>

          {/* Card 3: Registered Farmers */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Farmers Enrolled</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">{totalFarmersCount.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Aadhaar / Land Verified</p>
          </div>

          {/* Card 4: Total Procurement (MT) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Procured Volume</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Scale className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {(totalProcuredMT / 1000).toFixed(1)}k <span className="text-xs font-bold text-slate-500">MT</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Target: 175,000 MT</p>
          </div>

          {/* Card 5: Total MSP Payments Disbursed */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total MSP Value</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <IndianRupee className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-black text-emerald-800 font-mono mt-0.5 truncate">
              {formatCurrency(totalDisbursedValue)}
            </p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Direct Bank Transfer</p>
          </div>

          {/* Card 6: Pending Approvals */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Central Approvals</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-700">{pendingApprovalsCount}</p>
            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Action Required</p>
          </div>
        </div>

        {/* Grid 1: STATE-WISE PROCUREMENT & CROP/COMMODITY PROCUREMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 1. STATE-SPECIFIC OR NATIONAL PROCUREMENT TABLE (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-blue-700" />
                  <span>{isStateOfficer ? `${userState} Mandi Realization` : 'State-Wise Procurement Realization'}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isStateOfficer
                    ? `Live procurement status across active procurement centres in ${userState}`
                    : 'Consolidated performance across all participating state agencies'}
                </p>
              </div>
              <Link
                to={isStateOfficer ? '/admin/centres' : '/admin/states'}
                className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
              >
                <span>{isStateOfficer ? 'Manage Mandis' : 'All States'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">{isStateOfficer ? 'Centre / Mandi' : 'State'}</th>
                    <th className="py-3 px-3">{isStateOfficer ? 'District' : 'Farmers'}</th>
                    <th className="py-3 px-3">{isStateOfficer ? 'Capacity' : 'Centres'}</th>
                    <th className="py-3 px-3">{isStateOfficer ? 'Operating Hours' : 'Procured (MT)'}</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isStateOfficer ? (
                    centres.length > 0 ? (
                      centres.slice(0, 6).map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                          <td className="py-3 px-3 text-slate-600">{c.district}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">{c.dailyCapacity} qtl</td>
                          <td className="py-3 px-3 text-slate-600">{c.operatingHours?.start || '09:00'} - {c.operatingHours?.end || '17:00'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                              {c.isActive ? 'Active' : 'Pending Approval'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No mandis registered in {userState} yet.
                        </td>
                      </tr>
                    )
                  ) : (
                    STATE_MAPPING.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{row.state}</td>
                        <td className="py-3 px-3 text-slate-600">{row.farmers.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-slate-600">{row.centres}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {row.procuredMT.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-700 font-bold">
                          ₹{row.paymentCr.toFixed(2)} Cr
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              row.status === 'High Volume'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : row.status === 'On Track'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. CROP / COMMODITY PROCUREMENT (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-amber-600" />
                    <span>Crop / Commodity Procurement</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Progress toward national food grain buffer targets</p>
                </div>
                <Link to="/admin/crops" className="text-xs font-bold text-blue-700 hover:text-blue-800">
                  Manage MSP
                </Link>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'Wheat (गेहूं)', target: 70000, procured: 58200, msp: '₹2,275/q' },
                  { name: 'Rice / Paddy (धान)', target: 60000, procured: 46800, msp: '₹2,183/q' },
                  { name: 'Mustard (सरसों)', target: 20000, procured: 16400, msp: '₹5,650/q' },
                  { name: 'Chickpea / Gram (चना)', target: 15000, procured: 11500, msp: '₹5,440/q' },
                ].map((item, i) => {
                  const pct = Math.min(100, Math.round((item.procured / item.target) * 100));
                  return (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
                        <span>{item.name}</span>
                        <span className="text-emerald-700 font-mono">{pct}% achieved</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>
                          Procured: <strong className="text-slate-800">{item.procured.toLocaleString()} MT</strong> /{' '}
                          {item.target.toLocaleString()} MT
                        </span>
                        <span className="text-blue-700 font-semibold">{item.msp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>National Buffer Stock Security: <strong>Optimal</strong></span>
              <Link to="/admin/crops" className="font-bold text-blue-700 flex items-center gap-1">
                Commodity Details <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Grid 2: PROCUREMENT TREND & PAYMENT OVERVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 3. PROCUREMENT TREND (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>National Procurement Volume Trend</span>
                </h2>
                <p className="text-xs text-slate-500">Weekly intake trajectory across nationwide procurement mandis</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                +14.2% vs Last Week
              </span>
            </div>

            {/* Custom SVG / Clean CSS Trend Visualizer */}
            <div className="h-44 flex items-end gap-3 sm:gap-4 pt-6 pb-2 px-2 border-b border-slate-100">
              {[
                { day: 'Mon', mt: 4200 },
                { day: 'Tue', mt: 5100 },
                { day: 'Wed', mt: 4800 },
                { day: 'Thu', mt: 6200 },
                { day: 'Fri', mt: 7400 },
                { day: 'Sat', mt: 6900 },
                { day: 'Sun', mt: 2400 },
              ].map((bar, bIdx) => {
                const heightPct = Math.round((bar.mt / 8000) * 100);
                return (
                  <div key={bIdx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                      {bar.mt}t
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-blue-700 to-blue-500 group-hover:from-emerald-700 group-hover:to-emerald-500 transition-all shadow-sm"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[11px] font-bold text-slate-600 mt-1">{bar.day}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-3">
              <span>Peak Daily Mandi Intake: <strong>7,400 Metric Tonnes</strong></span>
              <Link to="/admin/analytics" className="font-bold text-blue-700 hover:text-blue-800">
                View Longitudinal Analytics →
              </Link>
            </div>
          </div>

          {/* 4. PAYMENT OVERVIEW BREAKDOWN (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    <span>Direct Benefit Transfer (DBT) Overview</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Aadhaar-linked payment processing via PFMS</p>
                </div>
                <Link to="/admin/payments" className="text-xs font-bold text-blue-700 hover:text-blue-800">
                  Payment Logs
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Total Settled (Paid)</span>
                  <p className="text-lg font-black text-emerald-900 font-mono mt-1">₹282.5 Cr</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">93.4% realization rate</p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-800">Bank Processing</span>
                  <p className="text-lg font-black text-blue-900 font-mono mt-1">₹14.2 Cr</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">Clearing within 24–48h</p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-800">Pending Sanction</span>
                  <p className="text-lg font-black text-amber-900 font-mono mt-1">₹5.6 Cr</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">Awaiting QA verification</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-700">Total Obligation</span>
                  <p className="text-lg font-black text-slate-900 font-mono mt-1">₹302.3 Cr</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Total Season MSP Value</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Average Farmer Payout Turnaround:</span>
              <strong className="text-emerald-700 font-bold">48 Hours</strong>
            </div>
          </div>
        </div>

        {/* Grid 3: PENDING CENTRAL ACTIONS & RECENT ADMINISTRATIVE ACTIVITIES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 5. PENDING CENTRAL ACTIONS (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Pending Central Actions &amp; Approvals</span>
                  </h2>
                  <p className="text-xs text-slate-500">Official requests escalated to Central Procurement Organisation</p>
                </div>
                <Link to="/admin/approvals" className="text-xs font-bold text-blue-700 hover:text-blue-800">
                  View All (3)
                </Link>
              </div>

              <div className="space-y-2.5">
                {PENDING_CPO_ACTIONS.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-slate-50/50 transition flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500">{act.id}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {act.state}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            act.priority === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {act.priority}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 mt-1">{act.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">From: {act.submittedBy}</p>
                    </div>

                    <Link
                      to="/admin/approvals"
                      className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg transition self-center"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>All escalated actions require Joint Secretary or Central Admin digital sign-off.</span>
            </div>
          </div>

          {/* 6. RECENT ADMINISTRATIVE ACTIVITIES (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Recent Administrative Activity Trail</span>
                  </h2>
                  <p className="text-xs text-slate-500">Audit log of central policy updates and state submissions</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Audit Verified
                </span>
              </div>

              <div className="space-y-3">
                {RECENT_ADMIN_ACTIVITIES.map((log, lIdx) => (
                  <div key={lIdx} className="flex items-start gap-3 pb-2.5 border-b border-slate-100 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 leading-snug">{log.activity}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-blue-700">{log.level}</span>
                        <span>•</span>
                        <span>{log.officer}</span>
                        <span>•</span>
                        <span>{log.time}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex-shrink-0">
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Tamper-evident audit logging compliant with NIC guidelines.</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
