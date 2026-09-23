import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Truck, Filter, Download, Search, Landmark, Wheat, Calendar,
  Building2, CheckCircle2, Clock, IndianRupee, Scale, ChevronRight,
  ArrowUpRight, AlertCircle, RefreshCw
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { adminService, centreService, cropService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, extractError } from '../../utils/constants';

const CONSOLIDATED_RECORDS = [
  {
    consignmentId: 'CSG-2026-0941',
    state: 'Punjab',
    district: 'Ludhiana',
    centre: 'Khanna Grain Market',
    farmerName: 'Rajveer Singh',
    farmerId: 'PB-LDH-4401',
    crop: 'Wheat (गेहूं)',
    quantityMT: 4.5,
    quantityQ: 45,
    mspValue: 102375,
    date: '14 Sep 2026',
    status: 'Verified & Accepted',
    paymentStatus: 'DBT Settled',
    qualityGrade: 'Grade A (11.2% Moisture)',
  },
  {
    consignmentId: 'CSG-2026-0940',
    state: 'Haryana',
    district: 'Karnal',
    centre: 'Karnal Central Mandi',
    farmerName: 'Harjinder Kaur',
    farmerId: 'HR-KRN-1290',
    crop: 'Rice / Paddy (धान)',
    quantityMT: 6.0,
    quantityQ: 60,
    mspValue: 130980,
    date: '14 Sep 2026',
    status: 'Verified & Accepted',
    paymentStatus: 'Bank Processing',
    qualityGrade: 'Grade A (12.8% Moisture)',
  },
  {
    consignmentId: 'CSG-2026-0939',
    state: 'Madhya Pradesh',
    district: 'Bhopal',
    centre: 'Berasia Procurement Yard',
    farmerName: 'Sukhwinder Singh',
    farmerId: 'MP-BPL-8821',
    crop: 'Mustard (सरसों)',
    quantityMT: 3.2,
    quantityQ: 32,
    mspValue: 180800,
    date: '13 Sep 2026',
    status: 'Verified & Accepted',
    paymentStatus: 'DBT Settled',
    qualityGrade: 'Standard (7.5% Moisture)',
  },
  {
    consignmentId: 'CSG-2026-0938',
    state: 'Uttar Pradesh',
    district: 'Meerut',
    centre: 'Meerut Kisan Mandi',
    farmerName: 'Baldev Prasad',
    farmerId: 'UP-MRT-3312',
    crop: 'Wheat (गेहूं)',
    quantityMT: 5.0,
    quantityQ: 50,
    mspValue: 113750,
    date: '13 Sep 2026',
    status: 'Verified & Accepted',
    paymentStatus: 'DBT Settled',
    qualityGrade: 'Grade A (10.9% Moisture)',
  },
  {
    consignmentId: 'CSG-2026-0937',
    state: 'Rajasthan',
    district: 'Kota',
    centre: 'Kota Mandi Yard',
    farmerName: 'Devendra Meena',
    farmerId: 'RJ-KTA-9014',
    crop: 'Chickpea / Gram (चना)',
    quantityMT: 2.8,
    quantityQ: 28,
    mspValue: 152320,
    date: '12 Sep 2026',
    status: 'Verified & Accepted',
    paymentStatus: 'Pending Sanction',
    qualityGrade: 'Standard (8.1% Moisture)',
  },
];

const ProcurementManagementPage = () => {
  const { user } = useAuth();
  const isStateOfficer = user?.role === 'state_officer';
  const isDistrictOfficer = user?.role === 'district_officer';

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const [selectedState, setSelectedState] = useState('All');
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(false);

  const filteredRecords = CONSOLIDATED_RECORDS.filter((rec) => {
    // Strict Jurisdictional Isolation
    if (isStateOfficer && user?.state && rec.state?.toLowerCase() !== user.state.toLowerCase()) return false;
    if (isDistrictOfficer) {
      if (user?.district && rec.district?.toLowerCase() !== user.district.toLowerCase()) return false;
      if (user?.state && rec.state?.toLowerCase() !== user.state.toLowerCase()) return false;
    }
    if (selectedState !== 'All' && rec.state !== selectedState) return false;
    if (selectedCrop !== 'All' && !rec.crop.includes(selectedCrop)) return false;
    if (selectedStatus !== 'All' && rec.paymentStatus !== selectedStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        rec.consignmentId.toLowerCase().includes(q) ||
        rec.farmerName.toLowerCase().includes(q) ||
        rec.centre.toLowerCase().includes(q) ||
        rec.district.toLowerCase().includes(q)
      );
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
              <span className="text-blue-700 font-bold">Procurement Monitoring</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
              <span>National Procurement Surveillance</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Central Monitoring
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-state consignment tracking, moisture compliance, and MSP settlement realization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Return (PDF)</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { key: 'overview', label: 'Procurement Overview' },
            { key: 'statewise', label: 'State-wise Procurement' },
            { key: 'commodity', label: 'Crop / Commodity Procurement' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSearchParams({ tab: tab.key })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                currentTab === tab.key
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Summary Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500">Target Volume</span>
            <p className="text-xl font-black text-slate-900 mt-0.5">175,000 MT</p>
            <p className="text-[10px] text-slate-500 mt-0.5">National Buffer Target</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500">Procured to Date</span>
            <p className="text-xl font-black text-emerald-800 mt-0.5">132,900 MT</p>
            <p className="text-[10px] text-emerald-700 font-bold mt-0.5">75.9% Target Realized</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500">Remaining Balance</span>
            <p className="text-xl font-black text-amber-800 mt-0.5">42,100 MT</p>
            <p className="text-[10px] text-amber-700 mt-0.5">Active Windows Open</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500">Farmers Benefited</span>
            <p className="text-xl font-black text-blue-900 mt-0.5">31,220</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Direct MSP Recipients</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500">Accredited Mandis</span>
            <p className="text-xl font-black text-slate-900 mt-0.5">82</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Centres with Weighing QA</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-slate-500">Disbursed Value</span>
            <p className="text-xl font-black text-emerald-800 mt-0.5">₹302.3 Cr</p>
            <p className="text-[10px] text-emerald-700 font-bold mt-0.5">100% DBT Transfer</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Consignment ID, farmer, centre, district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* State Filter */}
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

            {/* Crop Filter */}
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="All">All Crops</option>
              <option value="Wheat">Wheat (गेहूं)</option>
              <option value="Paddy">Rice / Paddy (धान)</option>
              <option value="Mustard">Mustard (सरसों)</option>
              <option value="Chickpea">Chickpea / Gram (चना)</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              <option value="All">All Payment Status</option>
              <option value="DBT Settled">DBT Settled</option>
              <option value="Bank Processing">Bank Processing</option>
              <option value="Pending Sanction">Pending Sanction</option>
            </select>
          </div>

          {(selectedState !== 'All' || selectedCrop !== 'All' || selectedStatus !== 'All' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedState('All');
                setSelectedCrop('All');
                setSelectedStatus('All');
                setSearchTerm('');
              }}
              className="text-xs text-rose-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Consolidated Procurement Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-700" />
              <span>Consolidated Procurement Intake Log</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredRecords.length} records • Drill-down enabled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Consignment ID</th>
                  <th className="py-3 px-3">State / District</th>
                  <th className="py-3 px-3">Mandi / Centre</th>
                  <th className="py-3 px-3">Farmer Details</th>
                  <th className="py-3 px-3">Commodity</th>
                  <th className="py-3 px-3 text-right">Volume (MT)</th>
                  <th className="py-3 px-3 text-right">MSP Value (₹)</th>
                  <th className="py-3 px-3 text-center">Quality Grade</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.map((row) => (
                  <tr key={row.consignmentId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{row.consignmentId}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{row.state}</p>
                      <p className="text-[10px] text-slate-500">{row.district}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{row.centre}</p>
                      <p className="text-[10px] text-slate-500">{row.date}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{row.farmerName}</p>
                      <p className="text-[10px] font-mono text-slate-500">{row.farmerId}</p>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{row.crop}</td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-slate-900">
                      {row.quantityMT.toFixed(1)} MT <span className="text-[10px] text-slate-500">({row.quantityQ}q)</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-right font-bold text-emerald-700">
                      {formatCurrency(row.mspValue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {row.qualityGrade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.paymentStatus === 'DBT Settled'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : row.paymentStatus === 'Bank Processing'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {row.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Central CPO Surveillance • Audit Verified against PFMS</span>
            <span className="font-medium">Total Consignments Processed: 31,220</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProcurementManagementPage;
