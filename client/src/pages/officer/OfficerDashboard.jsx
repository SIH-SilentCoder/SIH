import { useState, useEffect, useCallback } from 'react';
import {
  Users, CheckCircle2, Clock, AlertTriangle, Play, Check, XCircle,
  Phone, Package, RefreshCw, Volume2, Search, Filter, Shield, Award, FileText, ArrowRight
} from 'lucide-react';
import { IoClose } from 'react-icons/io5';
import OfficerLayout from '../../layouts/OfficerLayout';
import { officerService, queueService, procurementService } from '../../services';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import ProcurementSlipModal from '../../components/common/ProcurementSlipModal';
import {
  formatCurrency, formatTime, formatWaitTime, extractError,
  BOOKING_STATUS_COLORS, QUEUE_STATUS_LABELS
} from '../../utils/constants';
import toast from 'react-hot-toast';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const isQualityStaff = user?.role === 'quality_staff';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedCounter, setSelectedCounter] = useState('1');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);

  // Procurement Slip Modal state
  const [slipModal, setSlipModal] = useState({
    open: false,
    data: null,
  });

  // Modal for completing procurement
  const [procurementModal, setProcurementModal] = useState({
    open: false,
    entry: null,
    booking: null,
    actualQuantity: '',
    grade: 'A',
    moisture: '11.5',
    qualityNotes: '',
    pricePerUnit: '',
    totalAmount: 0,
  });

  const { socket, joinRoom } = useSocket();

  const fetchDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await officerService.getDashboard();
      setData(res.data.data);
      setError('');
    } catch (err) {
      setError(extractError(err));
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Join centre room for live queue updates
  useEffect(() => {
    if (data?.centre?._id && socket) {
      joinRoom(`centre:${data.centre._id}`);

      const handleQueueUpdate = () => {
        fetchDashboard(true);
      };

      socket.on('queue:updated', handleQueueUpdate);
      socket.on('booking:arrived', handleQueueUpdate);
      socket.on('booking:created', handleQueueUpdate);

      return () => {
        socket.off('queue:updated', handleQueueUpdate);
        socket.off('booking:arrived', handleQueueUpdate);
        socket.off('booking:created', handleQueueUpdate);
      };
    }
  }, [data?.centre?._id, socket, joinRoom, fetchDashboard]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCallNext = async () => {
    if (!data?.centre?._id) return;
    setActionLoading(true);
    try {
      const res = await queueService.callNext(data.centre._id, selectedCounter);
      showNotification(`Token ${res.data.data?.token || 'next'} called to Counter ${selectedCounter}!`);
      await fetchDashboard(true);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallToken = async (token) => {
    if (!data?.centre?._id) return;
    setActionLoading(true);
    try {
      await queueService.callToken(token, data.centre._id, selectedCounter);
      showNotification(`Token ${token} called to Counter ${selectedCounter}`);
      await fetchDashboard(true);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkArrived = async (token) => {
    if (!data?.centre?._id) return;
    setActionLoading(true);
    try {
      await queueService.markArrived(token, data.centre._id);
      showNotification(`Token ${token} marked as arrived.`);
      await fetchDashboard(true);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openProcurementModal = (item) => {
    // Look up associated booking
    const booking = data.todayBookings?.find(
      (b) => b.token === item.token || b._id === item.bookingId?._id || b._id === item.bookingId
    );

    const defaultPrice = booking?.cropId?.mspPrice || 2275;
    const defaultQty = booking?.quantity || item.quantity || 30;

    setProcurementModal({
      open: true,
      entry: item,
      booking: booking || null,
      actualQuantity: defaultQty,
      grade: 'A',
      moisture: '11.5',
      qualityNotes: 'Grain quality meets Fair Average Quality (FAQ) norms.',
      pricePerUnit: defaultPrice,
      totalAmount: defaultQty * defaultPrice,
    });
  };

  const handleQuantityOrPriceChange = (qty, price) => {
    const q = parseFloat(qty) || 0;
    const p = parseFloat(price) || 0;
    setProcurementModal((prev) => ({
      ...prev,
      actualQuantity: qty,
      pricePerUnit: price,
      totalAmount: q * p,
    }));
  };

  const handleForwardToPayment = async (procurementId) => {
    if (!procurementId) return;
    setIsForwarding(true);
    try {
      const res = await procurementService.forwardToPayment(procurementId);
      toast.success(res.data?.message || 'Procurement slip approved & forwarded to Direct Payment Department!');
      setSlipModal((prev) => ({ ...prev, open: false }));
      await fetchDashboard(true);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setIsForwarding(false);
    }
  };

  const openSlipForBooking = async (booking) => {
    try {
      let proc = null;
      const targetProcId = booking.procurementId?._id || booking.procurementId;
      if (targetProcId) {
        try {
          const res = await procurementService.getProcurement(targetProcId);
          proc = res.data?.data?.procurement;
        } catch (e) {
          console.warn('Could not fetch procurement details', e);
        }
      }

      setSlipModal({
        open: true,
        data: {
          procurementId: proc?._id || targetProcId,
          slipNumber: proc?.slipNumber || `SLIP-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          token: booking.token,
          bookingId: booking.bookingId || booking._id,
          farmerName: booking.farmerId?.name,
          farmerMobile: booking.farmerId?.mobile,
          kisanId: booking.farmerId?.kisanId || 'KID-VERIFIED',
          maskedAadhaar: booking.farmerId?.maskedAadhaar || 'XXXX-XXXX-8492',
          district: data?.centre?.address?.district,
          state: data?.centre?.address?.state,
          centreName: data?.centre?.name,
          cropName: booking.cropName || booking.cropId?.name || 'Wheat',
          quantity: proc?.quantity || booking.quantity,
          bookedQuantity: booking.quantity,
          grade: proc?.grade || 'A',
          moisture: proc?.moisture || '11.5%',
          foreignMatter: proc?.foreignMatter || '0.5%',
          pricePerUnit: proc?.pricePerUnit || booking.cropId?.mspPrice || 2275,
          totalAmount: proc?.totalAmount || ((proc?.quantity || booking.quantity) * (booking.cropId?.mspPrice || 2275)),
          qualityNotes: proc?.qualityNotes || 'FAQ Norms Passed',
          completedAt: proc?.completedAt || booking.updatedAt,
          officerApproved: proc?.officerApproved || booking.status === 'payment_processing' || booking.status === 'payment_completed',
          officerApprovedAt: proc?.officerApprovedAt,
          paymentStatus: proc?.officerApproved || booking.status === 'payment_processing' || booking.status === 'payment_completed' ? 'processing' : 'pending',
        }
      });
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleSaveProcurement = async (e) => {
    e.preventDefault();
    if (!procurementModal.booking?._id) {
      setError('Booking reference is missing.');
      return;
    }

    setActionLoading(true);
    try {
      // 1. Create or get procurement record
      const procRes = await procurementService.createProcurement({
        bookingId: procurementModal.booking._id,
      });

      const procId = procRes.data.data.procurement._id;
      const actualQty = parseFloat(procurementModal.actualQuantity) || procurementModal.booking?.quantity;
      const priceUnit = parseFloat(procurementModal.pricePerUnit) || 2275;

      // 2. Complete procurement with verified weight and grade
      const updateRes = await procurementService.updateStatus(procId, {
        status: 'completed',
        grade: procurementModal.grade,
        quantity: actualQty,
        pricePerUnit: priceUnit,
        qualityNotes: procurementModal.qualityNotes,
        moisture: procurementModal.moisture ? `${procurementModal.moisture}%` : '11.5%',
        foreignMatter: '0.5%',
      });

      const updatedProc = updateRes.data?.data?.procurement;

      // 3. Mark queue entry completed
      if (procurementModal.entry?.token) {
        await queueService.completeToken(procurementModal.entry.token, data.centre._id);
      }

      showNotification(`Quality & Weighing Verified for Token ${procurementModal.entry.token}! Weight slip generated.`);
      setProcurementModal({ open: false, entry: null, booking: null, actualQuantity: '', grade: 'A', moisture: '', qualityNotes: '', pricePerUnit: '', totalAmount: 0 });

      // Automatically open the generated slip modal
      setSlipModal({
        open: true,
        data: {
          procurementId: updatedProc?._id || procId,
          slipNumber: updatedProc?.slipNumber || `SLIP-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          token: procurementModal.entry?.token || procurementModal.booking?.token,
          bookingId: procurementModal.booking?.bookingId || procurementModal.booking?._id,
          farmerName: procurementModal.booking?.farmerId?.name || procurementModal.entry?.farmerName,
          farmerMobile: procurementModal.booking?.farmerId?.mobile,
          kisanId: procurementModal.booking?.farmerId?.kisanId || 'KID-VERIFIED',
          maskedAadhaar: procurementModal.booking?.farmerId?.maskedAadhaar || 'XXXX-XXXX-8492',
          district: data?.centre?.address?.district,
          state: data?.centre?.address?.state,
          centreName: data?.centre?.name,
          cropName: procurementModal.booking?.cropName || procurementModal.booking?.cropId?.name || 'Wheat',
          quantity: actualQty,
          bookedQuantity: procurementModal.booking?.quantity,
          grade: procurementModal.grade,
          moisture: procurementModal.moisture ? `${procurementModal.moisture}%` : '11.5%',
          foreignMatter: '0.5%',
          pricePerUnit: priceUnit,
          totalAmount: actualQty * priceUnit,
          qualityNotes: procurementModal.qualityNotes,
          completedAt: new Date(),
          officerApproved: false,
          paymentStatus: 'pending',
        }
      });

      await fetchDashboard(true);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <OfficerLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Loading Officer Console...</p>
          </div>
        </div>
      </OfficerLayout>
    );
  }

  const { centre, stats, queue, todayBookings } = data || {};

  // Find currently serving token for this officer's counter or any counter
  const servingEntries = queue?.serving || [];
  const currentCounterServing = servingEntries.find((e) => e.counter === selectedCounter) || servingEntries[0];

  // Filtered queue items
  const allQueueItems = [
    ...(queue?.serving?.map((i) => ({ ...i, displayStatus: 'serving' })) || []),
    ...(queue?.called?.map((i) => ({ ...i, displayStatus: 'called' })) || []),
    ...(queue?.waiting?.map((i) => ({ ...i, displayStatus: 'waiting' })) || []),
  ];

  const filteredItems = allQueueItems.filter((item) => {
    if (statusFilter !== 'all' && item.displayStatus !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchToken = item.token?.toLowerCase().includes(term);
      const matchName = item.farmerName?.toLowerCase().includes(term);
      return matchToken || matchName;
    }
    return true;
  });

  return (
    <OfficerLayout>
      <div className="space-y-6">
        {/* Header with Centre Information */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full uppercase">
                {isQualityStaff ? 'Quality & Scale Station' : 'Active Mandi'}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                Daily Capacity: {centre?.dailyCapacity || 250} Qtl
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-1">{isQualityStaff ? `Grain Quality & Weighing — ${centre?.name || ''}` : centre?.name}</h1>
            <p className="text-xs text-gray-500">{isQualityStaff ? 'Quality grade inspection (A/B/FAQ), moisture testing %, net scale weighing & procurement certification' : `${centre?.address?.district || ''}, ${centre?.address?.state || ''} • ${centre?.address?.line1 || ''}`}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200 text-sm">
              <span className="text-xs font-bold text-gray-600 px-2">Active Counter:</span>
              {['1', '2', '3', '4'].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCounter(c)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                    selectedCounter === c
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  C-{c}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchDashboard(true)}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded-lg transition"><IoClose className="w-4 h-4" /></button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between min-w-0 transition-all hover:shadow-sm">
            <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate" title="Today's Bookings">
              Today's Bookings
            </p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 leading-none">
              {stats?.totalToday || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/30 shadow-xs flex flex-col justify-between min-w-0 transition-all hover:shadow-sm">
            <p className="text-[11px] sm:text-xs font-bold text-purple-700 uppercase tracking-wider truncate" title="Arrived at Mandi">
              Arrived at Mandi
            </p>
            <p className="text-2xl sm:text-3xl font-black text-purple-900 mt-2 leading-none">
              {stats?.arrived || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs flex flex-col justify-between min-w-0 transition-all hover:shadow-sm">
            <p className="text-[11px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider truncate" title="In Active Queue">
              In Active Queue
            </p>
            <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2 leading-none">
              {stats?.waiting || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs flex flex-col justify-between min-w-0 transition-all hover:shadow-sm">
            <p className="text-[11px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider truncate" title="Procured / Completed">
              Procured / Completed
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-2 leading-none">
              {stats?.completed || 0}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-xs flex flex-col justify-between min-w-0 transition-all hover:shadow-sm col-span-2 sm:col-span-1">
            <p className="text-[11px] sm:text-xs font-bold text-blue-700 uppercase tracking-wider truncate" title="Pending Procurement">
              Pending Procurement
            </p>
            <p className="text-2xl sm:text-3xl font-black text-blue-900 mt-2 leading-none">
              {stats?.pending || 0}
            </p>
          </div>
        </div>

        {/* Queue Operator Action Box */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
          {/* Main Calling Controller */}
          <div className="xl:col-span-1 bg-gradient-to-br from-gray-900 via-gray-950 to-primary-950 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 gap-2">
                <span className="text-xs uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5 truncate">
                  <Volume2 className="w-4 h-4 flex-shrink-0" /> Queue Announcer
                </span>
                <span className="text-xs bg-gray-800 px-2.5 py-1 rounded-full text-gray-300 font-mono whitespace-nowrap">
                  Counter {selectedCounter}
                </span>
              </div>

              <div className="mt-5 text-center">
                <p className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">CURRENTLY SERVING</p>
                <div className="mt-2 py-3 px-4 bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                  <span className="text-2xl sm:text-3xl xl:text-4xl font-black font-mono tracking-wider text-amber-400 break-all block">
                    {currentCounterServing?.token || 'NO TOKEN'}
                  </span>
                </div>
                {currentCounterServing && (
                  <div className="mt-3 text-left bg-white/5 p-3 rounded-xl text-xs space-y-1 border border-white/5">
                    <p className="text-gray-300 truncate">
                      <strong className="text-white">Farmer:</strong> {currentCounterServing.farmerName}
                    </p>
                    <p className="text-gray-300">
                      <strong className="text-white">Token Turn:</strong> Counter {currentCounterServing.counter || selectedCounter}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                onClick={handleCallNext}
                disabled={actionLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-black rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm sm:text-base active:scale-98 disabled:opacity-50"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current flex-shrink-0" />
                <span>Call Next Token to Counter {selectedCounter}</span>
              </button>

              {currentCounterServing && (
                <button
                  onClick={() => openProcurementModal(currentCounterServing)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md"
                >
                  <Award className="w-4 h-4 flex-shrink-0" />
                  <span>Weigh & Complete Procurement</span>
                </button>
              )}
            </div>
          </div>

          {/* Real-Time Live Queue List */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 flex flex-col min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Live Mandi Queue</h3>
                <p className="text-xs text-gray-500">Real-time turn progression & arrived farmers</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search token / farmer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 rounded-xl border border-gray-300 font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Queue</option>
                  <option value="serving">Serving</option>
                  <option value="called">Called</option>
                  <option value="waiting">Waiting</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="mt-4 flex-1 overflow-x-auto min-w-0">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No farmers in the queue matching criteria.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-2">Token</th>
                      <th className="pb-3 pr-2">Farmer</th>
                      <th className="pb-3 pr-2">Position</th>
                      <th className="pb-3 pr-2">Status</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="py-3 pr-2 font-mono font-bold text-sm text-primary-700 whitespace-nowrap">
                          {item.token}
                        </td>
                        <td className="py-3 pr-2">
                          <p className="font-semibold text-gray-900">{item.farmerName || 'Registered Farmer'}</p>
                          <span className="text-[10px] text-gray-500 block">
                            {item.bookingId?.cropName || 'Kharif/Rabi Crop'}
                          </span>
                        </td>
                        <td className="py-3 pr-2 font-semibold text-gray-700 whitespace-nowrap">
                          {item.displayStatus === 'serving'
                            ? `At C-${item.counter || selectedCounter}`
                            : `#${idx + 1} in queue`}
                        </td>
                        <td className="py-3 pr-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              item.displayStatus === 'serving'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.displayStatus === 'called'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.displayStatus}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                          {item.displayStatus === 'waiting' && (
                            <button
                              onClick={() => handleCallToken(item.token)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] shadow-xs transition"
                            >
                              Call
                            </button>
                          )}
                          {(item.displayStatus === 'called' || item.displayStatus === 'serving') && (
                            <button
                              onClick={() => openProcurementModal(item)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition"
                            >
                              Weigh & Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Today's Arrival Check-in Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-black text-gray-900">Check-in Arriving Farmers</h3>
              <p className="text-xs text-gray-500">Farmers who have booked today's slot and reached the gate</p>
            </div>
            <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
              {todayBookings?.length || 0} Total Bookings Today
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="pb-3">Token</th>
                  <th className="pb-3">Farmer</th>
                  <th className="pb-3">Crop & Qty</th>
                  <th className="pb-3">Slot Time</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayBookings?.slice(0, 10).map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50 transition">
                    <td className="py-3 font-mono font-bold text-gray-900">{b.token}</td>
                    <td className="py-3">
                      <p className="font-semibold text-gray-900">{b.farmerId?.name}</p>
                      <p className="text-[10px] text-gray-500">{b.farmerId?.mobile}</p>
                    </td>
                    <td className="py-3">
                      <span className="font-semibold">{b.cropName}</span>
                      <span className="text-gray-500 ml-1">({b.quantity} {b.unit})</span>
                    </td>
                    <td className="py-3 font-mono">
                      {formatTime(b.slotStartTime)} - {formatTime(b.slotEndTime)}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] bg-${BOOKING_STATUS_COLORS[b.status] || 'gray'}-100 text-${BOOKING_STATUS_COLORS[b.status] || 'gray'}-800`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {b.status === 'booked' && (
                        <button
                          onClick={() => handleMarkArrived(b.token)}
                          disabled={actionLoading}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs transition"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {b.status === 'arrived' && (
                        <button
                          onClick={() => handleCallToken(b.token)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs transition"
                        >
                          Call to Queue
                        </button>
                      )}
                      {(b.status === 'procurement_completed' || b.status === 'payment_processing' || b.status === 'payment_completed') && (
                        <button
                          onClick={() => openSlipForBooking(b)}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition flex items-center justify-end gap-1 ml-auto shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Weight Slip
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Procurement Weight & Quality Slip Modal */}
        <ProcurementSlipModal
          isOpen={slipModal.open}
          onClose={() => setSlipModal({ open: false, data: null })}
          data={slipModal.data}
          onForwardToPayment={handleForwardToPayment}
          isForwarding={isForwarding}
          userRole={user?.role}
        />

        {/* Modal for Recording Procurement & Initializing Payment */}
        {procurementModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">{isQualityStaff ? 'Grain Quality Inspection & Scale Weighing' : 'Record Grain Procurement'}</h3>
                  <p className="text-xs text-gray-500">Token: <span className="font-mono font-bold text-primary-700">{procurementModal.entry?.token}</span> {isQualityStaff ? '• Record official moisture %, grade & weighed quantity' : ''}</p>
                </div>
                <button
                  onClick={() => setProcurementModal({ ...procurementModal, open: false })}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <IoClose className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProcurement} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700">Measured Weight (Quintals)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={procurementModal.actualQuantity}
                      onChange={(e) => handleQuantityOrPriceChange(e.target.value, procurementModal.pricePerUnit)}
                      className="mt-1 w-full p-2 text-sm rounded-lg border border-gray-300 font-semibold focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">MSP Price per Quintal (₹)</label>
                    <input
                      type="number"
                      required
                      value={procurementModal.pricePerUnit}
                      onChange={(e) => handleQuantityOrPriceChange(procurementModal.actualQuantity, e.target.value)}
                      className="mt-1 w-full p-2 text-sm rounded-lg border border-gray-300 font-semibold focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700">Grain Quality Grade</label>
                    <select
                      value={procurementModal.grade}
                      onChange={(e) => setProcurementModal({ ...procurementModal, grade: e.target.value })}
                      className="mt-1 w-full p-2 text-sm rounded-lg border border-gray-300 font-semibold"
                    >
                      <option value="A">Grade A (Superior FAQ)</option>
                      <option value="B">Grade B (Standard)</option>
                      <option value="C">Grade C (Sub-standard)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700">Moisture Content (%)</label>
                    <input
                      type="text"
                      value={procurementModal.moisture}
                      onChange={(e) => setProcurementModal({ ...procurementModal, moisture: e.target.value })}
                      className="mt-1 w-full p-2 text-sm rounded-lg border border-gray-300"
                      placeholder="e.g. 11.5%"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Quality Inspection Notes</label>
                  <textarea
                    rows={2}
                    value={procurementModal.qualityNotes}
                    onChange={(e) => setProcurementModal({ ...procurementModal, qualityNotes: e.target.value })}
                    className="mt-1 w-full p-2 text-xs rounded-lg border border-gray-300"
                  />
                </div>

                {/* Total Payout calculation */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-emerald-800 font-bold">Total Direct Benefit Payout</p>
                    <p className="text-xs text-emerald-600">Auto-calculated: Qty × MSP</p>
                  </div>
                  <span className="text-2xl font-black text-emerald-900 font-mono">
                    {formatCurrency(procurementModal.totalAmount)}
                  </span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setProcurementModal({ ...procurementModal, open: false })}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                  >
                    {actionLoading ? 'Processing...' : 'Approve & Release Payment'}
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

export default OfficerDashboard;
