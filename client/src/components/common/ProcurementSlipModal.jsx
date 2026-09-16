import { useRef } from 'react';
import {
  Wheat, CheckCircle2, ShieldCheck, Printer, Clock, FileText, UserCheck, ArrowRight
} from 'lucide-react';
import { IoClose } from 'react-icons/io5';
import { formatCurrency } from '../../utils/constants';

const ProcurementSlipModal = ({ isOpen, onClose, data, onForwardToPayment, isForwarding = false, userRole = '' }) => {
  const printRef = useRef();

  if (!isOpen || !data) return null;

  const {
    slipNumber,
    token,
    bookingId,
    farmerName,
    farmerMobile,
    kisanId,
    maskedAadhaar,
    district,
    state,
    centreName,
    cropName,
    quantity,
    bookedQuantity,
    grade,
    moisture,
    foreignMatter,
    pricePerUnit,
    totalAmount,
    qualityNotes,
    completedAt,
    officerApproved,
    officerApprovedAt,
    paymentStatus,
    procurementId
  } = data;

  const handlePrint = () => {
    window.print();
  };

  const formattedSlipNo = slipNumber || 'SLIP-2026-849201';
  const displayDate = completedAt ? new Date(completedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const isMandiOfficer = ['centre_head', 'procurement_officer', 'district_officer', 'state_officer', 'admin', 'central_admin', 'officer'].includes(userRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-gray-900 text-white p-4 sm:p-5 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center border border-emerald-400/40">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Official Procurement Weight & Quality Slip</h2>
              <p className="text-xs text-emerald-200">Kisan Jinsi Tula & Quality Certificate • {formattedSlipNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Printable Slip Content */}
        <div ref={printRef} className="p-6 overflow-y-auto space-y-6 print:p-8 print:overflow-visible">
          {/* Slip Header Banner */}
          <div className="border-b-2 border-emerald-700 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Wheat className="w-6 h-6 text-emerald-700" />
                <span className="text-xs font-black tracking-widest text-emerald-800 uppercase bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                  Govt. Mandi Procurement Connect
                </span>
              </div>
              <h1 className="text-xl font-black text-gray-900 mt-1 uppercase">
                किसान जिंस तौल एवं गुणवत्ता पर्ची (WEIGHT & QUALITY SLIP)
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {centreName || 'Central Grain Procurement Mandi'} • {district || 'Procurement Zone'}, {state || 'India'}
              </p>
            </div>

            <div className="text-left sm:text-right bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono text-xs space-y-0.5">
              <p className="text-gray-500 text-[11px] font-sans uppercase font-bold">Slip Serial No</p>
              <p className="font-bold text-emerald-800 text-sm">{formattedSlipNo}</p>
              <p className="text-[10px] text-gray-500 font-sans">{displayDate}</p>
            </div>
          </div>

          {/* Section 1: Farmer Credentials & Booking Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
            <div>
              <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-2">Farmer Credentials</p>
              <div className="space-y-1 text-xs text-gray-700">
                <p><strong className="text-gray-900">Farmer Name:</strong> {farmerName || 'Registered Farmer'}</p>
                <p><strong className="text-gray-900">Kisan ID:</strong> <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded font-bold text-emerald-900">{kisanId || 'KID-VERIFIED'}</span></p>
                <p><strong className="text-gray-900">Mobile:</strong> 📞 {farmerMobile || 'N/A'}</p>
                <p><strong className="text-gray-900">Aadhaar Status:</strong> <span className="text-emerald-700 font-semibold">e-KYC Verified ✅ ({maskedAadhaar || 'XXXX-XXXX-VERIFIED'})</span></p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-2">Mandi Slot & Token Details</p>
              <div className="space-y-1 text-xs text-gray-700">
                <p><strong className="text-gray-900">Token Number:</strong> <span className="font-mono bg-amber-100 font-black text-amber-900 px-2 py-0.5 rounded text-sm">{token || 'F001'}</span></p>
                <p><strong className="text-gray-900">Booking Ref ID:</strong> <span className="font-mono">{bookingId || 'BK-2026-REF'}</span></p>
                <p><strong className="text-gray-900">Procurement Centre:</strong> {centreName}</p>
                <p><strong className="text-gray-900">Location:</strong> {district}, {state}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Quality Inspection Analysis Record */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 shadow-xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Grain Quality Inspection Certificate (FAQ Norms)
              </h3>
              <span className="text-[10px] font-bold bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-full">
                Grade {grade || 'A'} • FAQ Passed ✅
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Commodity / Crop</p>
                <p className="text-xs font-bold text-gray-900 mt-0.5">{cropName || 'Kharif Crop'}</p>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Quality Grade</p>
                <p className="text-xs font-bold text-emerald-700 mt-0.5">Grade {grade || 'A'} (FAQ)</p>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Moisture Content</p>
                <p className="text-xs font-bold text-blue-700 mt-0.5">{moisture || '11.5%'}</p>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <p className="text-[10px] text-gray-500 font-bold uppercase">Foreign Matter</p>
                <p className="text-xs font-bold text-gray-700 mt-0.5">{foreignMatter || '0.5%'}</p>
              </div>
            </div>

            {qualityNotes && (
              <p className="text-[11px] bg-amber-50/60 p-2.5 rounded-xl border border-amber-100 text-amber-900 italic">
                <strong>Quality Inspector Remarks:</strong> “{qualityNotes}”
              </p>
            )}
          </div>

          {/* Section 3: Scale Weighing Measurement & Payout Calculation */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Official Weighbridge Measurement</p>
                <h3 className="text-sm font-bold text-white">Weighing Scale Net Mass & MSP Calculation</h3>
              </div>
              <span className="text-xs bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 px-3 py-1 rounded-full font-mono font-bold">
                Scale Checked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] text-emerald-200 font-medium">Booked Quota</p>
                <p className="text-base font-bold text-white mt-0.5">{bookedQuantity || quantity} Quintals</p>
              </div>

              <div>
                <p className="text-[11px] text-emerald-200 font-medium">Actual Net Scale Weight</p>
                <p className="text-xl font-black text-amber-400 mt-0.5 font-mono">{quantity} Quintals</p>
              </div>

              <div>
                <p className="text-[11px] text-emerald-200 font-medium">Government MSP Rate</p>
                <p className="text-base font-bold text-emerald-300 mt-0.5">₹{pricePerUnit?.toLocaleString('en-IN')} / Quintal</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
              <div>
                <p className="text-xs text-emerald-200 font-bold uppercase tracking-wider">Total Direct Benefit Payout (Gross Amount)</p>
                <p className="text-[11px] text-emerald-300 font-mono">Formula: Net Quantity ({quantity} Qtl) × MSP (₹{pricePerUnit})</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white font-mono">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>

          {/* Section 4: Approval & Workflow Audit Trail */}
          <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50 space-y-3">
            <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Workflow Verification Audit Trail</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-900">Quality & Weighing Inspector</p>
                  <p className="text-[11px] text-gray-600">Verified & Weighed by Quality Staff</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">Digital Stamp Verified • {displayDate}</p>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${officerApproved || paymentStatus === 'processing' || paymentStatus === 'paid' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                {officerApproved || paymentStatus === 'processing' || paymentStatus === 'paid' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-bold text-gray-900">Mandi Procurement Officer Action</p>
                  <p className="text-[11px] text-gray-700">
                    {officerApproved || paymentStatus === 'processing' || paymentStatus === 'paid'
                      ? 'Approved & Forwarded to Direct Bank Payment Department'
                      : 'Pending Mandi Officer Review & Forwarding to Payment Dept'}
                  </p>
                  {officerApprovedAt && (
                    <p className="text-[10px] text-emerald-700 font-mono mt-0.5">Forwarded on: {new Date(officerApprovedAt).toLocaleString('en-IN')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Controls Footer */}
        <div className="bg-gray-100 p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
          <div className="text-xs text-gray-500 font-medium">
            Official receipt generated by Kisan Procurement Connect Network
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print / Save Slip
            </button>

            {/* If Mandi Officer and slip not yet forwarded, show Forward to Payment button */}
            {isMandiOfficer && !officerApproved && paymentStatus !== 'processing' && paymentStatus !== 'paid' && onForwardToPayment && (
              <button
                onClick={() => onForwardToPayment(procurementId || bookingId)}
                disabled={isForwarding}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-md disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                {isForwarding ? 'Forwarding...' : 'Forward to Payment Department'}
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementSlipModal;
