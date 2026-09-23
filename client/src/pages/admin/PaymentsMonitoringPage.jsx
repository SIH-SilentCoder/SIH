import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard, IndianRupee, CheckCircle2, Clock, AlertTriangle,
  Download, Search, Filter, Landmark, FileText, ArrowUpRight
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/constants';

const PAYMENT_BATCHES = [
  {
    batchRef: 'PFMS-DBT-2026-0881',
    state: 'Punjab',
    district: 'Ludhiana',
    farmersCount: 1420,
    amount: 32450000,
    settlementDate: '14 Sep 2026',
    status: 'Completed',
    utrCount: 1420,
    gateway: 'PFMS / NPCI Aadhaar Bridge',
  },
  {
    batchRef: 'PFMS-DBT-2026-0880',
    state: 'Haryana',
    district: 'Karnal',
    farmersCount: 980,
    amount: 21340000,
    settlementDate: '13 Sep 2026',
    status: 'Completed',
    utrCount: 980,
    gateway: 'PFMS / NPCI Aadhaar Bridge',
  },
  {
    batchRef: 'PFMS-DBT-2026-0879',
    state: 'Madhya Pradesh',
    district: 'Bhopal',
    farmersCount: 1150,
    amount: 28900000,
    settlementDate: '13 Sep 2026',
    status: 'Processing',
    utrCount: 820,
    gateway: 'RBI NEFT/RTGS Batch',
  },
  {
    batchRef: 'PFMS-DBT-2026-0878',
    state: 'Uttar Pradesh',
    district: 'Meerut',
    farmersCount: 1840,
    amount: 41800000,
    settlementDate: '12 Sep 2026',
    status: 'Completed',
    utrCount: 1840,
    gateway: 'PFMS / NPCI Aadhaar Bridge',
  },
  {
    batchRef: 'PFMS-DBT-2026-0877',
    state: 'Rajasthan',
    district: 'Kota',
    farmersCount: 620,
    amount: 14250000,
    settlementDate: '12 Sep 2026',
    status: 'Pending Sanction',
    utrCount: 0,
    gateway: 'Awaiting Central Treasury Sign-off',
  },
];

const PaymentsMonitoringPage = () => {
  const { user } = useAuth();
  const isStateOfficer = user?.role === 'state_officer';
  const isDistrictOfficer = user?.role === 'district_officer';

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All');

  const filteredBatches = PAYMENT_BATCHES.filter((b) => {
    // Strict Jurisdictional Isolation
    if (isStateOfficer && user?.state && b.state?.toLowerCase() !== user.state.toLowerCase()) return false;
    if (isDistrictOfficer) {
      if (user?.district && b.district?.toLowerCase() !== user.district.toLowerCase()) return false;
      if (user?.state && b.state?.toLowerCase() !== user.state.toLowerCase()) return false;
    }
    if (selectedState !== 'All' && b.state !== selectedState) return false;
    if (currentTab === 'pending' && b.status === 'Completed') return false;
    if (currentTab === 'completed' && b.status !== 'Completed') return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return b.batchRef.toLowerCase().includes(q) || b.district.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb & Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>CPO Portal</span>
              <span>/</span>
              <span className="text-blue-700 font-bold">Financial Surveillance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <span>Direct Benefit Transfer (DBT) Oversight</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                100% PFMS Integrated
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Public Financial Management System integration, UTR tracking, and direct bank realization audits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Financial Audit Return</span>
            </button>
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total MSP Obligation</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">₹302.3 Cr</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Across 132,900 MT Procured</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Settled to Bank (Paid)</span>
            <p className="text-2xl font-black text-emerald-800 font-mono mt-0.5">₹282.5 Cr</p>
            <p className="text-[10px] text-emerald-700 font-bold mt-0.5">93.4% DBT Success Rate</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-blue-700">In Bank Clearing</span>
            <p className="text-2xl font-black text-blue-800 font-mono mt-0.5">₹14.2 Cr</p>
            <p className="text-[10px] text-blue-700 font-bold mt-0.5">Within 24–48h window</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-amber-700">Pending Sanction</span>
            <p className="text-2xl font-black text-amber-800 font-mono mt-0.5">₹5.6 Cr</p>
            <p className="text-[10px] text-amber-700 font-bold mt-0.5">QA Sign-off pending</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          {[
            { key: 'overview', label: 'Payment Overview' },
            { key: 'pending', label: 'Pending DBT Disbursals' },
            { key: 'completed', label: 'Settled Payments' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSearchParams({ tab: tab.key })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === tab.key
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search batch ref or district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="All">All States</option>
            <option value="Punjab">Punjab</option>
            <option value="Haryana">Haryana</option>
            <option value="Madhya Pradesh">Madhya Pradesh</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Rajasthan">Rajasthan</option>
          </select>
        </div>

        {/* Payment Batches Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-700" />
              <span>Consolidated DBT Disbursement Batches</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              PFMS Direct Credit Protocol Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Batch Reference</th>
                  <th className="py-3 px-3">State / District</th>
                  <th className="py-3 px-3 text-right">Beneficiary Farmers</th>
                  <th className="py-3 px-3 text-right">Batch Value (₹)</th>
                  <th className="py-3 px-3">Settlement Date</th>
                  <th className="py-3 px-3">Clearing Channel</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBatches.map((row) => (
                  <tr key={row.batchRef} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-800">{row.batchRef}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{row.state}</p>
                      <p className="text-[10px] text-slate-500">{row.district}</p>
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-slate-900">
                      {row.farmersCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-emerald-700">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{row.settlementDate}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {row.gateway}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : row.status === 'Processing'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PaymentsMonitoringPage;
