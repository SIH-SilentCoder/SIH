import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Calendar, Clock, Package, CheckCircle, ArrowRight, ArrowLeft,
  Building2, Wheat, AlertCircle, Info, Search, RotateCcw, ShieldCheck, Ticket, ShieldAlert
} from 'lucide-react';
import { FaCheck } from 'react-icons/fa';
import { centreService, cropService, bookingService, farmerService } from '../../services';
import { formatTime, formatCurrency, extractError, formatAddress } from '../../utils/constants';
import FarmerLayout from '../../layouts/FarmerLayout';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';
import toast from 'react-hot-toast';

const STEPS = ['Choose Mandi', 'Select Crop', 'Produce Quantity', 'Date & Slot', 'Confirm'];
const DRAFT_KEY = 'kpc_farmer_slot_booking_draft';

const BookSlotPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Data collections
  const [centres, setCentres] = useState([]);
  const [crops, setCrops] = useState([]);
  const [slots, setSlots] = useState([]);

  // Loading states
  const [loadingCentres, setLoadingCentres] = useState(true);
  const [loadingCrops, setLoadingCrops] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [centreSearch, setCentreSearch] = useState('');

  // Post-booking confirmed state
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Errors & submission feedback
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // 14-day date range generator (local dates to avoid UTC offset issues)
  const availableDates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });
  }, []);

  // KYC verification lock state
  const [kycStatus, setKycStatus] = useState(null);
  const [kycRemarks, setKycRemarks] = useState('');
  const [loadingKyc, setLoadingKyc] = useState(true);

  // Fetch initial Centres, Crops, and Farmer KYC status
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      setLoadingCentres(true);
      setLoadingCrops(true);
      setLoadingKyc(true);
      try {
        const [centresRes, cropsRes, kycRes] = await Promise.all([
          centreService.getCentres(),
          cropService.getCrops(),
          farmerService.getKycStatus().catch(() => ({ data: { data: {} } })),
        ]);
        if (!isMounted) return;

        const allCentres = centresRes.data.data.centres || [];
        const allCrops = cropsRes.data.data.crops || [];
        const kycData = kycRes.data?.data || {};

        setCentres(allCentres);
        setCrops(allCrops);
        setKycStatus(kycData.kycStatus || 'Not Started');
        setKycRemarks(kycData.kycRemarks || '');

        // Try restoring draft from sessionStorage on page refresh
        try {
          const saved = sessionStorage.getItem(DRAFT_KEY);
          if (saved) {
            const draft = JSON.parse(saved);
            if (draft.step !== undefined && draft.step < STEPS.length) {
              setStep(draft.step);
            }
            if (draft.centreId) {
              const matchedCentre = allCentres.find((c) => c._id === draft.centreId);
              if (matchedCentre) setSelectedCentre(matchedCentre);
            }
            if (draft.cropId) {
              const matchedCrop = allCrops.find((c) => c._id === draft.cropId);
              if (matchedCrop) setSelectedCrop(matchedCrop);
            }
            if (draft.quantity) setQuantity(draft.quantity);
            if (draft.date) setSelectedDate(draft.date);
          }
        } catch {
          // ignore corrupted draft
        }
      } catch {
        toast.error('Could not load procurement centres or crops. Please refresh.');
      } finally {
        if (isMounted) {
          setLoadingCentres(false);
          setLoadingCrops(false);
        }
      }
    };

    loadInitialData();
    return () => { isMounted = false; };
  }, []);

  // Persist form draft in sessionStorage across accidental page refreshes
  useEffect(() => {
    if (confirmedBooking) {
      sessionStorage.removeItem(DRAFT_KEY);
      return;
    }
    const draft = {
      step,
      centreId: selectedCentre?._id,
      cropId: selectedCrop?._id,
      quantity,
      date: selectedDate,
      slotId: selectedSlot?._id,
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // quota exceeded or private browsing
    }
  }, [step, selectedCentre, selectedCrop, quantity, selectedDate, selectedSlot, confirmedBooking]);

  // When stepping into Date & Slot (Step 3), ensure default date is selected
  useEffect(() => {
    if (step === 3 && !selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0]);
    }
  }, [step, selectedDate, availableDates]);

  // Fetch slots whenever selectedCentre or selectedDate changes in Step 3
  useEffect(() => {
    if (step === 3 && selectedCentre && selectedDate) {
      fetchSlots();
    }
  }, [step, selectedCentre, selectedDate]);

  const fetchSlots = async () => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    setSubmitError('');
    try {
      const res = await centreService.getCentreSlots(selectedCentre._id, selectedDate);
      setSlots(res.data.data.slots || []);
    } catch {
      toast.error('Could not load time slots for this date.');
    } finally {
      setLoadingSlots(false);
    }
  };

  // Crops available at currently selected centre
  const availableCropsForCentre = useMemo(() => {
    if (!selectedCentre) return crops;
    if (!selectedCentre.availableCrops || selectedCentre.availableCrops.length === 0) {
      return crops;
    }
    // Match crops by ID or name
    const centreCropIds = new Set(
      selectedCentre.availableCrops.map((c) => (typeof c === 'object' ? c._id : c))
    );
    const centreCropNames = new Set(
      selectedCentre.availableCrops.map((c) => (typeof c === 'object' ? c.name?.toLowerCase() : ''))
    );

    const filtered = crops.filter((crop) =>
      centreCropIds.has(crop._id) || centreCropNames.has(crop.name?.toLowerCase())
    );
    return filtered.length > 0 ? filtered : crops;
  }, [selectedCentre, crops]);

  // Handle Step Validation and Advancement
  const goNext = () => {
    const errs = {};
    setSubmitError('');

    if (step === 0) {
      if (!selectedCentre) errs.centre = 'Please select a procurement centre / mandi to continue';
    } else if (step === 1) {
      if (!selectedCrop) errs.crop = 'Please select a crop to proceed';
    } else if (step === 2) {
      if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
        errs.quantity = 'Please enter a valid produce quantity in quintals (minimum 0.1)';
      }
    } else if (step === 3) {
      if (!selectedDate) errs.date = 'Please select a procurement date';
      if (!selectedSlot) errs.slot = 'Please select an available time slot';
    }

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const handleReset = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setStep(0);
    setSelectedCentre(null);
    setSelectedCrop(null);
    setQuantity('');
    setSelectedDate('');
    setSelectedSlot(null);
    setConfirmedBooking(null);
    setErrors({});
    setSubmitError('');
  };

  // Final Confirmation Submit
  const handleConfirmBooking = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        slotId: selectedSlot._id,
        cropId: selectedCrop._id,
        cropName: selectedCrop.name,
        quantity: Number(quantity),
        unit: 'quintal',
      };

      const res = await bookingService.createBooking(payload);
      const booking = res.data.data.booking;

      sessionStorage.removeItem(DRAFT_KEY);
      setConfirmedBooking(booking);
      toast.success('Slot booked successfully! Your unique token is generated.');
    } catch (err) {
      const msg = extractError(err);
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedAmount = selectedCrop && quantity && !isNaN(quantity)
    ? selectedCrop.mspPrice * Number(quantity)
    : null;

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS / CONFIRMATION SCREEN WITH UNIQUE TOKEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (confirmedBooking) {
    return (
      <FarmerLayout>
        <div className="max-w-xl mx-auto py-4">
          <div className="card p-6 sm:p-8 text-center border-2 border-emerald-200 shadow-lg bg-white">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>

            <span className="text-xs font-semibold tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase">
              Slot Reserved &amp; Confirmed
            </span>

            <h1 className="text-2xl font-bold text-gray-900 mt-3">Procurement Slot Booked!</h1>
            <p className="text-sm text-gray-600 mt-1">
              Your government procurement token has been generated and saved to the database.
            </p>

            {/* Official Token Box */}
            <div className="my-6 p-6 bg-gradient-to-br from-emerald-50 via-primary-50 to-emerald-100/50 rounded-2xl border-2 border-emerald-300 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-emerald-800 uppercase tracking-widest border-b border-emerald-200 pb-2 mb-3">
                <span className="flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-emerald-600" /> Official Token Slip
                </span>
                <span>ID: {confirmedBooking.bookingId}</span>
              </div>

              <p className="text-xs text-emerald-800 font-medium uppercase tracking-wider">Your Queue Token</p>
              <div className="text-4xl sm:text-5xl font-black text-emerald-800 tracking-wider my-2 font-mono drop-shadow-sm">
                {confirmedBooking.token}
              </div>
              <p className="text-xs text-emerald-700">
                Please present this token number when you arrive at the procurement centre.
              </p>
            </div>

            {/* Booking Details Grid */}
            <div className="bg-gray-50 rounded-xl p-4 text-left border border-gray-200 space-y-3 text-sm mb-6">
              <div className="flex items-start justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">Procurement Centre:</span>
                <span className="font-semibold text-gray-900 text-right">
                  {confirmedBooking.centreId?.name || selectedCentre?.name}
                </span>
              </div>
              <div className="flex items-start justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">Crop &amp; Quantity:</span>
                <span className="font-semibold text-gray-900">
                  {confirmedBooking.cropName} — {confirmedBooking.quantity} {confirmedBooking.unit || 'quintal'}
                </span>
              </div>
              <div className="flex items-start justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">Reserved Date:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(confirmedBooking.bookingDate).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-start justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs">Allocated Time Slot:</span>
                <span className="font-semibold text-primary-700">
                  {formatTime(confirmedBooking.slotStartTime)} – {formatTime(confirmedBooking.slotEndTime)}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-gray-500 text-xs">Estimated MSP Value:</span>
                <span className="font-bold text-emerald-700">
                  {estimatedAmount ? formatCurrency(estimatedAmount) : 'As per MSP'}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/farmer/dashboard')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Go to Dashboard
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate(`/farmer/bookings/${confirmedBooking._id}`)}
                className="w-full sm:w-auto"
              >
                View Booking Slip
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleReset}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Book Another Slot
              </Button>
            </div>
          </div>
        </div>
      </FarmerLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN MULTI-STEP BOOKING FLOW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <FarmerLayout>
      <div className="max-w-2xl mx-auto py-2">
        {/* Header with Draft Reset Option */}
        <div className="page-header flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title text-xl sm:text-2xl font-bold text-gray-900">Book Procurement Slot</h1>
            <p className="page-subtitle text-xs sm:text-sm text-gray-500">
              Center/Mandi → Crop → Quantity → Date &amp; Slot → Confirm
            </p>
          </div>
          {(selectedCentre || selectedCrop || quantity) && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 border border-gray-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start Over
            </button>
          )}
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 min-w-[70px]">
              <div
                className={`flex-1 flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all
                  ${i < step ? 'bg-primary-100 text-primary-700' : ''}
                  ${i === step ? 'bg-primary-600 text-white shadow-sm' : ''}
                  ${i > step ? 'bg-gray-100 text-gray-400' : ''}
                `}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${i < step ? 'bg-primary-600 text-white' : ''}
                  ${i === step ? 'bg-white text-primary-600' : ''}
                  ${i > step ? 'bg-gray-300 text-gray-500' : ''}
                `}>
                  {i < step ? <FaCheck className="w-2.5 h-2.5" /> : i + 1}
                </span>
                <span className="hidden sm:inline truncate">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-1.5" />}
            </div>
          ))}
        </div>

        {/* KYC Status Alert Banner — informational only, does NOT block form */}
        {!loadingKyc && kycStatus === 'Verified' && (
          <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold">KYC Verified — Slot Booking Unlocked:</span> Aadhaar Seeded & NPCI DBT Active. You can book slots freely.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-200 text-emerald-900 font-bold uppercase tracking-wide">Active</span>
          </div>
        )}

        {!loadingKyc && kycStatus === 'Pending' && (
          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-amber-900">KYC Approval Pending — Slot Confirmation Restricted</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-900">Pending</span>
                </div>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Your KYC application is submitted and awaiting approval by the District Procurement Officer.
                  You can browse mandis, crops and slots — but booking confirmation will be restricted until KYC is approved.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/farmer/kyc')}
                  className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 w-fit"
                >
                  Check KYC Status <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {!loadingKyc && kycStatus === 'Rejected' && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-2xl shadow-sm animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-red-900">KYC Rejected — Booking Blocked</h2>
                <p className="text-xs text-red-800 mt-1">
                  Your KYC was rejected. Reason: "{kycRemarks || 'Invalid details'}". Please re-submit your KYC.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/farmer/kyc')}
                  className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 w-fit"
                >
                  Re-submit KYC <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {!loadingKyc && kycStatus === 'Not Started' && (
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl shadow-sm animate-fadeIn">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-900">KYC Required to Confirm Slot Booking</p>
                <p className="text-xs text-blue-800 mt-0.5">
                  Complete Aadhaar e-KYC & Kisan ID verification to unlock slot booking and direct DBT payments.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/farmer/kyc')}
                  className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 w-fit"
                >
                  Complete KYC Now <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="card p-5 sm:p-7 shadow-sm border border-gray-200">
          {/* ────────────────────────────────────────────────────────── */}
          {/* STEP 0: CHOOSE MANDI / CENTRE                              */}
          {/* ────────────────────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Step 1: Choose Procurement Centre / Mandi</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Select the official government procurement centre where you want to bring your produce.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search mandi by name, district, or address..."
                  value={centreSearch}
                  onChange={(e) => setCentreSearch(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 pr-16 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                {centreSearch && (
                  <button
                    type="button"
                    onClick={() => setCentreSearch('')}
                    className="absolute right-3 top-2 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md"
                  >
                    Clear
                  </button>
                )}
              </div>

              {loadingCentres ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : centres.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm bg-gray-50 rounded-xl">
                  <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  No procurement centres found. Please contact the district agriculture office.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {centres
                    .filter((c) => {
                      if (!centreSearch.trim()) return true;
                      const q = centreSearch.toLowerCase();
                      const addrStr = formatAddress(c.address).toLowerCase();
                      return (
                        c.name?.toLowerCase().includes(q) ||
                        c.district?.toLowerCase().includes(q) ||
                        addrStr.includes(q)
                      );
                    })
                    .map((centre) => {
                      const isSelected = selectedCentre?._id === centre._id;
                      return (
                        <button
                          key={centre._id}
                          type="button"
                          onClick={() => {
                            setSelectedCentre(centre);
                            setErrors({ ...errors, centre: '' });
                            // If selected crop is not accepted at this new centre, reset it
                            if (selectedCrop && centre.availableCrops?.length > 0) {
                              const accepts = centre.availableCrops.some((c) => {
                                const cid = typeof c === 'object' ? c._id : c;
                                const cname = typeof c === 'object' ? c.name?.toLowerCase() : String(c).toLowerCase();
                                return cid === selectedCrop._id || cname === selectedCrop.name?.toLowerCase();
                              });
                              if (!accepts) setSelectedCrop(null);
                            }
                          }}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all
                            ${isSelected
                              ? 'border-primary-500 bg-primary-50/70 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm sm:text-base">{centre.name}</p>
                              <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                <span className="truncate">
                                  {formatAddress(centre.address)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  Capacity: {centre.dailyCapacity || 100}/day
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  Hours: {centre.operatingHours?.start || '09:00'} – {centre.operatingHours?.end || '17:00'}
                                </span>
                              </div>
                              {centre.availableCrops?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {centre.availableCrops.slice(0, 5).map((c) => (
                                    <span key={typeof c === 'object' ? c._id : c} className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                                      {typeof c === 'object' ? c.name : c}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
              {errors.centre && (
                <p className="error-text flex items-center gap-1 mt-2 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.centre}
                </p>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* STEP 1: SELECT CROP                                        */}
          {/* ────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Step 2: Select Crop to Sell</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Showing crops procured by <span className="font-semibold text-gray-800">{selectedCentre?.name}</span>
                </p>
              </div>

              {loadingCrops ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : availableCropsForCentre.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl">
                  <Wheat className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  No specific crops listed for this centre. All registered crops can be accepted.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableCropsForCentre.map((crop) => {
                    const isSelected = selectedCrop?._id === crop._id;
                    return (
                      <button
                        key={crop._id}
                        type="button"
                        onClick={() => {
                          setSelectedCrop(crop);
                          setErrors({ ...errors, crop: '' });
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all
                          ${isSelected
                            ? 'border-primary-500 bg-primary-50/80 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">{crop.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{crop.nameHindi}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            MSP: {formatCurrency(crop.mspPrice)}/{crop.unit || 'quintal'}
                          </span>
                          {crop.season && (
                            <span className="text-xs text-gray-400 capitalize">{crop.season}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.crop && (
                <p className="error-text flex items-center gap-1 mt-2 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.crop}
                </p>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* STEP 2: PRODUCE QUANTITY                                   */}
          {/* ────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Step 3: Enter Produce Quantity</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Enter approximate quantity of <span className="font-semibold text-gray-800">{selectedCrop?.name}</span> you plan to sell.
                </p>
              </div>

              {/* Crop badge */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Selected Crop</p>
                  <p className="font-semibold text-gray-900 text-sm">{selectedCrop?.name} ({selectedCrop?.nameHindi})</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Government MSP Rate</p>
                  <p className="font-bold text-emerald-700 text-sm">
                    {formatCurrency(selectedCrop?.mspPrice)}/{selectedCrop?.unit || 'quintal'}
                  </p>
                </div>
              </div>

              {/* Quantity input */}
              <div>
                <Input
                  id="quantity"
                  label="Quantity in Quintals"
                  type="number"
                  placeholder="e.g., 25"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setErrors({ ...errors, quantity: '' });
                  }}
                  error={errors.quantity}
                  required
                  min="0.1"
                  step="0.1"
                  hint="1 Quintal = 100 Kilograms"
                />

                {/* Quick preset buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">Quick add:</span>
                  {[10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setQuantity(String(preset));
                        setErrors({ ...errors, quantity: '' });
                      }}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-700 border border-gray-200 transition-all"
                    >
                      {preset} q
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Estimated Procurement Value */}
              {estimatedAmount && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                        Estimated Procurement Value
                      </p>
                      <p className="text-2xl font-bold text-emerald-800 mt-0.5">
                        {formatCurrency(estimatedAmount)}
                      </p>
                      <p className="text-xs text-emerald-700 mt-1">
                        Calculated at {quantity} quintal × {formatCurrency(selectedCrop.mspPrice)}.
                        Final amount will be determined after quality and moisture inspection at the mandi.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* STEP 3: DATE & TIME SLOT                                   */}
          {/* ────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Step 4: Choose Date &amp; Available Slot</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Select a date and an open slot at <span className="font-semibold text-gray-800">{selectedCentre?.name}</span>.
                </p>
              </div>

              {/* 14-day Date Picker */}
              <div>
                <label className="label text-xs font-medium text-gray-700 mb-2 block">
                  Select Date <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {availableDates.map((date) => {
                    const d = new Date(date);
                    const isSelected = selectedDate === date;
                    const isToday = date === availableDates[0];
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => {
                          setSelectedDate(date);
                          setErrors({ ...errors, date: '' });
                        }}
                        className={`p-2.5 rounded-xl border-2 text-center transition-all
                          ${isSelected
                            ? 'border-primary-500 bg-primary-50/80 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                      >
                        <p className="text-xs font-medium text-gray-500">
                          {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                        </p>
                        <p className="text-lg font-bold text-gray-900 leading-tight">
                          {d.getDate()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {d.toLocaleDateString('en-IN', { month: 'short' })}
                        </p>
                        {isToday && (
                          <span className="text-[10px] font-semibold text-emerald-700 block mt-0.5">Today</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {errors.date && (
                  <p className="error-text mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{errors.date}
                  </p>
                )}
              </div>

              {/* Slots List for Selected Date */}
              {selectedDate && (
                <div>
                  <label className="label text-xs font-medium text-gray-700 mb-2 block">
                    Available Time Slots <span className="text-red-500">*</span>
                  </label>

                  {loadingSlots ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                      No slots available on this date. Please select another date.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {slots.map((slot) => {
                        const isFull = slot.status === 'full' || slot.booked >= slot.capacity;
                        const availableSpots = Math.max(0, slot.capacity - slot.booked);
                        const isSelected = selectedSlot?._id === slot._id;

                        return (
                          <button
                            key={slot._id}
                            type="button"
                            disabled={isFull}
                            onClick={() => {
                              if (!isFull) {
                                setSelectedSlot(slot);
                                setErrors({ ...errors, slot: '' });
                              }
                            }}
                            className={`w-full p-3.5 rounded-xl border-2 flex items-center justify-between transition-all
                              ${isFull ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' : ''}
                              ${!isFull && isSelected ? 'border-primary-500 bg-primary-50/80 shadow-sm' : ''}
                              ${!isFull && !isSelected ? 'border-gray-200 hover:border-gray-300 bg-white' : ''}
                            `}
                          >
                            <div className="text-left">
                              <p className="font-semibold text-gray-900 text-sm">
                                {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                              </p>
                              <p className={`text-xs mt-0.5 font-medium ${isFull ? 'text-red-500' : 'text-emerald-700'}`}>
                                {isFull ? 'SLOT FULL' : `${availableSpots} spots available`}
                              </p>
                            </div>

                            <div className="text-right">
                              {/* Capacity Bar */}
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : 'bg-primary-500'}`}
                                  style={{ width: `${Math.min(100, (slot.booked / slot.capacity) * 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{slot.booked}/{slot.capacity} booked</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {errors.slot && (
                    <p className="error-text mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />{errors.slot}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* STEP 4: REVIEW & CONFIRM BOOKING                           */}
          {/* ────────────────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Step 5: Review &amp; Confirm Booking</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Please verify your procurement slot details before confirming.
                </p>
              </div>

              {/* Detailed Summary Card */}
              <div className="bg-primary-50/60 rounded-xl p-5 border border-primary-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Mandi / Centre</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{selectedCentre?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatAddress(selectedCentre?.address)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Crop to Sell</p>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {selectedCrop?.name} {selectedCrop?.nameHindi ? `(${selectedCrop.nameHindi})` : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">MSP: {formatCurrency(selectedCrop?.mspPrice)}/quintal</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Quantity</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{quantity} quintal</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Procurement Date</p>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {selectedDate
                        ? new Date(selectedDate).toLocaleDateString('en-IN', {
                            weekday: 'short', day: '2-digit', month: 'long', year: 'numeric'
                          })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Time Slot</p>
                    <p className="font-semibold text-primary-700 mt-0.5">
                      {selectedSlot ? `${formatTime(selectedSlot.startTime)} – ${formatTime(selectedSlot.endTime)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estimated Total Value</p>
                    <p className="font-bold text-emerald-700 text-base mt-0.5">
                      {formatCurrency(estimatedAmount)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Error Banner (Duplicate / Full slot) */}
              {submitError && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Booking Could Not Be Completed</p>
                    <p className="mt-0.5">{submitError}</p>
                    <p className="mt-1 text-xs text-red-600">
                      Tip: Click &apos;Back&apos; to Step 4 to select a different time slot or date.
                    </p>
                  </div>
                </div>
              )}

              {/* Guidelines checklist */}
              <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-2 border border-gray-200">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600 w-4 h-4 flex-shrink-0" />
                  <span>A unique token number will be generated immediately for queue entry.</span>
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600 w-4 h-4 flex-shrink-0" />
                  <span>You can track your real-time queue position on your Farmer Dashboard.</span>
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600 w-4 h-4 flex-shrink-0" />
                  <span>Please arrive 10–15 minutes before your time slot with your photo ID.</span>
                </p>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* NAVIGATION BUTTONS                                         */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className={`flex gap-3 mt-6 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
            {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSubmitError('');
                  setStep((s) => s - 1);
                }}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            )}

            {step < 4 ? (
              <Button
                type="button"
                variant="primary"
                onClick={goNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            ) : (
              <>
                {kycStatus !== 'Verified' && (
                  <div className="w-full mb-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>KYC approval required:</strong> Your slot booking confirmation is pending KYC verification by the District Officer.
                      {' '}<button type="button" onClick={() => navigate('/farmer/kyc')} className="underline font-bold text-amber-800">Check KYC Status →</button>
                    </span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="primary"
                  loading={submitting}
                  onClick={handleConfirmBooking}
                  size="lg"
                  rightIcon={<CheckCircle className="w-4 h-4" />}
                  disabled={kycStatus === 'Rejected'}
                >
                  {kycStatus === 'Verified' ? 'Confirm Booking' : 'Submit Booking (Pending KYC)'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
};

export default BookSlotPage;
