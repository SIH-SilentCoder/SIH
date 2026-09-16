import { useState, useEffect, useCallback } from 'react';
import {
  QrCode, Search, CheckCircle2, ShieldCheck, Clock, UserCheck, AlertTriangle,
  Wheat, RefreshCw, XCircle, ArrowRight, BarChart3, Truck, Ticket, ChevronRight, Check,
  Wifi, Layers
} from 'lucide-react';
import OfficerLayout from '../../layouts/OfficerLayout';
import { queueService } from '../../services';
import { extractError } from '../../utils/constants';
import { useSocket } from '../../context/SocketContext';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const GateEntryVerificationPage = () => {
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const { isConnected, socket, joinOfficerCentre } = useSocket();

  const [data, setData] = useState({
    centre: null,
    metrics: {
      currentToken: 'F001',
      verifiedTodayCount: 0,
      pendingVerificationCount: 0,
      totalBookingsToday: 0,
      totalCapacity: 100,
      bookedCapacity: 0,
      filledCapacity: 0,
      remainingCapacity: 100,
      waitingCount: 0,
    },
    entries: [],
  });

  // Search & Token Inspection State
  const [searchQuery, setSearchQuery] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [inspectedData, setInspectedData] = useState(null);
  const [verifyingGate, setVerifyingGate] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const fetchGateMetrics = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await queueService.getGateMetrics();
      if (res.data?.data) {
        setData(res.data.data);
        setLastRefreshed(new Date());
        if (res.data.data.centre?._id) {
          joinOfficerCentre(res.data.data.centre._id);
        }
      }
    } catch (err) {
      if (!silent) toast.error(extractError(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [joinOfficerCentre]);

  useEffect(() => {
    fetchGateMetrics();
  }, [fetchGateMetrics]);

  // Real-time Socket Listener & Polling Fallback (10s)
  useEffect(() => {
    const handleUpdate = () => {
      fetchGateMetrics(true);
    };

    if (socket) {
      socket.on('queue:updated', handleUpdate);
      socket.on('booking:updated', handleUpdate);
      socket.on('booking:created', handleUpdate);
    }

    const interval = setInterval(() => {
      fetchGateMetrics(true);
    }, 10000);

    return () => {
      if (socket) {
        socket.off('queue:updated', handleUpdate);
        socket.off('booking:updated', handleUpdate);
        socket.off('booking:created', handleUpdate);
      }
      clearInterval(interval);
    };
  }, [socket, fetchGateMetrics]);

  // Handle Token Inspection
  const handleInspectToken = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a Token Number, Booking ID, or Mobile number.');
      return;
    }

    setInspecting(true);
    setInspectedData(null);
    try {
      const res = await queueService.lookupGateToken({ tokenQuery: searchQuery.trim() });
      setInspectedData(res.data?.data);
      toast.success('Token verified in Mandi Database!');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setInspecting(false);
    }
  };

  // Handle Verify & Grant Gate Entry
  const handleConfirmGateEntry = async (tokenToVerify) => {
    const targetToken = tokenToVerify || inspectedData?.booking?.token || inspectedData?.booking?.bookingId;
    if (!targetToken) return;

    setVerifyingGate(true);
    try {
      const res = await queueService.verifyGateEntry(targetToken);
      toast.success(res.data?.message || `Token ${targetToken} verified! Gate Entry GRANTED.`);
      setInspectedData(null);
      setSearchQuery('');
      await fetchGateMetrics();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setVerifyingGate(false);
    }
  };

  const getTurnStatusBadge = (status) => {
    switch (status) {
      case 'CURRENT_TURN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-ping"></span>
            CURRENT TURN (Call Now)
          </span>
        );
      case 'ON_TIME':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> On Time Arrival
          </span>
        );
      case 'EARLY':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Early Arrival
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Late Arrival
          </span>
        );
      case 'ALREADY_VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Already Inside Mandi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            Scheduled
          </span>
        );
    }
  };

  const filteredEntries = data.entries.filter((entry) => {
    if (activeTab === 'verified') {
      return ['arrived', 'verification', 'verified', 'procurement_in_progress', 'procurement_completed'].includes(entry.status);
    }
    if (activeTab === 'pending') {
      return entry.status === 'booked';
    }
    return true;
  });

  const tokenProgressPercentage = Math.min(100, Math.round((data.metrics.verifiedTodayCount / Math.max(1, data.metrics.totalBookingsToday)) * 100));
  const capacityProgressPercentage = Math.min(100, Math.round((data.metrics.filledCapacity / Math.max(1, data.metrics.totalCapacity)) * 100));

  return (
    <OfficerLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <QrCode className="w-3 h-3" /> Gate & Verification Portal
              </span>
              <span className="text-xs text-gray-500">• {data.centre?.name || 'Mandi Procurement Centre'}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Mandi Gate Token Verification Dashboard</h1>
            <p className="text-gray-500 text-sm">
              Real-time Token Scans, Identity Verification, Live Token Counts (Total, Verified & Pending), and Mandi Capacity Control
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Socket Sync Badge */}
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <Wifi className="w-3.5 h-3.5" /> Live Sync Active
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => fetchGateMetrics(false)} loading={loading}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Live Token Verification Metrics Summary (Row 1: 3 Big Metric Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Today's Total Scheduled Tokens */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Tokens Scheduled Today</p>
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mt-2">
              {data.metrics.totalBookingsToday} <span className="text-xs font-normal text-gray-500">Tokens</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Booked slots scheduled for arrival at this Mandi today
            </p>
          </div>

          {/* Card 2: Tokens Verified at Gate Today */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">Tokens Verified Today</p>
              <div className="w-9 h-9 bg-emerald-500/40 text-white rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-white mt-2">
              {data.metrics.verifiedTodayCount} <span className="text-xs font-normal text-emerald-100">Verified</span>
            </h2>
            <p className="text-xs text-emerald-100 mt-1">
              Farmers verified & granted entry inside Mandi
            </p>
          </div>

          {/* Card 3: Tokens Pending Verification */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Tokens Pending Gate Verification</p>
              <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-amber-600 mt-2">
              {data.metrics.pendingVerificationCount} <span className="text-xs font-normal text-gray-500">Pending</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Farmers scheduled for arrival, awaiting gate scan
            </p>
          </div>
        </div>

        {/* Live Progress Meters (Row 2: Token Verification Progress & Mandi Capacity Progress) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Progress 1: Live Token Verification Progress Meter */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Live Token Verification Progress</p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  {data.metrics.verifiedTodayCount} / {data.metrics.totalBookingsToday} <span className="text-xs font-medium text-gray-500">Tokens Verified ({tokenProgressPercentage}%)</span>
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                {data.metrics.pendingVerificationCount} Pending Arrival
              </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden flex p-0.5 border border-gray-200">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${tokenProgressPercentage}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>• Verified & Granted Entry: <strong className="text-emerald-700">{data.metrics.verifiedTodayCount} Tokens</strong></span>
              <span>• Awaiting Gate Scan: <strong className="text-amber-700">{data.metrics.pendingVerificationCount} Tokens</strong></span>
            </div>
          </div>

          {/* Progress 2: Mandi Daily Capacity Meter */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Mandi Material Capacity Record</p>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  {data.metrics.filledCapacity} / {data.metrics.totalCapacity} <span className="text-xs font-medium text-gray-500">Quintals Filled ({capacityProgressPercentage}%)</span>
                </h3>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                {data.metrics.remainingCapacity} Quintals Khali
              </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden flex p-0.5 border border-gray-200">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${capacityProgressPercentage}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>• Filled Capacity Inside Mandi: <strong className="text-teal-700">{data.metrics.filledCapacity} Qtl</strong></span>
              <span>• Remaining Capacity Khali: <strong className="text-blue-700">{data.metrics.remainingCapacity} Qtl</strong></span>
            </div>
          </div>
        </div>

        {/* Token Inspection & Scan Box */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" /> Token Inspection & Gate Entry Verification
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Enter or Scan farmer Token No. (e.g. F001), Booking ID, or Mobile number to check true identity & turn status
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                Active Turn Token: {data.metrics.currentToken || 'F001'}
              </span>
            </div>
          </div>

          <form onSubmit={handleInspectToken} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type Token No (e.g. F001, BKG-1001) or Farmer Mobile Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
              />
            </div>
            <Button type="submit" loading={inspecting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold">
              <Search className="w-4 h-4 mr-2" /> Inspect Token & Identity
            </Button>
          </form>

          {/* Inspected Token Result Modal / Card */}
          {inspectedData && (
            <div className="mt-4 p-5 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white bg-emerald-700 px-2.5 py-0.5 rounded-md">
                      TOKEN: {inspectedData.booking?.token}
                    </span>
                    <span className="text-xs text-gray-600 font-mono">BKG ID: {inspectedData.booking?.bookingId}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 mt-1">
                    {inspectedData.booking?.farmerId?.name}
                  </h3>
                  <p className="text-xs text-gray-600 flex items-center gap-2 mt-0.5">
                    <span>📞 {inspectedData.booking?.farmerId?.mobile}</span>
                    <span>• {inspectedData.booking?.farmerId?.district}, {inspectedData.booking?.farmerId?.state}</span>
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1">
                  {getTurnStatusBadge(inspectedData.turnStatus)}
                  <p className="text-xs text-gray-600 font-medium mt-1">{inspectedData.turnMessage}</p>
                </div>
              </div>

              {/* Identity & Verification Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Aadhaar KYC Verification */}
                <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inspectedData.farmerProfile?.kycStatus === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {inspectedData.farmerProfile?.kycStatus === 'Verified' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium">Farmer Identity & KYC Status</p>
                    <p className="text-xs font-bold text-gray-900">
                      {inspectedData.farmerProfile?.kycStatus === 'Verified' ? 'True Verified Person ✅' : 'District KYC Pending ⚠️'}
                    </p>
                  </div>
                </div>

                {/* Farmer Registration ID */}
                <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium">Verified Kisan ID</p>
                    <p className="text-xs font-bold text-gray-900 font-mono">
                      {inspectedData.farmerProfile?.kisanId || 'KID-VERIFIED'}
                    </p>
                  </div>
                </div>

                {/* Crop & Quantity Material */}
                <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                    <Wheat className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium">Crop Material Bring</p>
                    <p className="text-xs font-bold text-gray-900">
                      {inspectedData.booking?.cropId?.name || 'Wheat'} — <strong className="text-emerald-700">{inspectedData.booking?.quantity} Quintals</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60">
                <span className="text-xs text-gray-500">
                  Slot Time: <strong className="text-gray-800">{inspectedData.booking?.slotStartTime} - {inspectedData.booking?.slotEndTime}</strong>
                </span>

                {inspectedData.canEnterGate ? (
                  <Button
                    type="button"
                    loading={verifyingGate}
                    onClick={() => handleConfirmGateEntry(inspectedData.booking?.token)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm"
                  >
                    <Check className="w-4 h-4 mr-2" /> Verify & Grant Gate Entry
                  </Button>
                ) : (
                  <button
                    disabled
                    className="bg-gray-200 text-gray-500 font-bold px-5 py-2 rounded-xl text-xs cursor-not-allowed"
                  >
                    {inspectedData.turnStatus === 'ALREADY_VERIFIED' ? 'Already Granted Entry' : 'Entry Blocked: District Officer KYC Pending'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today's Gate Entries Log Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Today's Mandi Gate Arrivals & Log Records</h3>
              <p className="text-xs text-gray-500">Live real-time records of all tokens scanned and verified at the entry gate today</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                All ({data.entries.length})
              </button>
              <button
                onClick={() => setActiveTab('verified')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'verified' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Verified ({data.metrics.verifiedTodayCount})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-sm font-bold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Pending Gate ({data.metrics.pendingVerificationCount})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Token No</th>
                  <th className="py-3 px-4">Farmer Details</th>
                  <th className="py-3 px-4">Crop Material</th>
                  <th className="py-3 px-4">Slot Time</th>
                  <th className="py-3 px-4">Gate Verification</th>
                  <th className="py-3 px-4 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                      Loading today's gate entry records...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      No gate entry records found for selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const isInside = ['arrived', 'verification', 'verified', 'procurement_in_progress', 'procurement_completed'].includes(entry.status);
                    return (
                      <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded text-xs font-bold">
                            {entry.token}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-gray-900 text-sm">{entry.farmerId?.name || 'Farmer'}</p>
                          <p className="text-xs text-gray-500 font-mono">📞 {entry.farmerId?.mobile}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-gray-800">{entry.cropId?.name || 'Crop'}</p>
                          <p className="text-xs font-bold text-emerald-700">{entry.quantity} Quintals</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-gray-600">
                          {entry.slotStartTime} - {entry.slotEndTime}
                        </td>
                        <td className="py-3.5 px-4">
                          {isInside ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified at Gate
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3.5 h-3.5" /> Pending Gate Scan
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!isInside ? (
                            <Button
                              type="button"
                              size="xs"
                              onClick={() => handleConfirmGateEntry(entry.token)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              Verify Entry
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">Inside Mandi</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </OfficerLayout>
  );
};

export default GateEntryVerificationPage;
