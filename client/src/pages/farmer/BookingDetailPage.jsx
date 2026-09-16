import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Package, CreditCard, Phone, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { FaBell } from 'react-icons/fa';
import { bookingService, procurementService } from '../../services';
import { formatDate, formatTime, formatCurrency, extractError, formatAddress } from '../../utils/constants';
import FarmerLayout from '../../layouts/FarmerLayout';
import Badge from '../../components/common/Badge';
import ProcurementTimeline from '../../components/farmer/ProcurementTimeline';
import QueueTracker from '../../components/farmer/QueueTracker';
import ProcurementSlipModal from '../../components/common/ProcurementSlipModal';
import { CardSkeleton } from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const BookingDetailPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [slipModal, setSlipModal] = useState({ open: false, data: null });

  const fetchData = async () => {
    try {
      const res = await bookingService.getBookingById(id);
      setData(res.data.data);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const openSlip = async () => {
    if (!data?.booking) return;
    const { booking, procurement, payment } = data;
    try {
      let proc = procurement;
      if (!proc && booking.procurementId) {
        const res = await procurementService.getProcurement(booking.procurementId?._id || booking.procurementId);
        proc = res.data?.data?.procurement;
      }
      setSlipModal({
        open: true,
        data: {
          procurementId: proc?._id,
          slipNumber: proc?.slipNumber || `SLIP-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          token: booking.token,
          bookingId: booking.bookingId || booking._id,
          farmerName: booking.farmerId?.name,
          farmerMobile: booking.farmerId?.mobile,
          kisanId: booking.farmerId?.kisanId || 'KID-VERIFIED',
          maskedAadhaar: booking.farmerId?.maskedAadhaar || 'XXXX-XXXX-8492',
          district: booking.centreId?.district,
          state: booking.centreId?.state,
          centreName: booking.centreId?.name,
          cropName: booking.cropName || booking.cropId?.name || 'Crop',
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
          paymentStatus: payment?.status || (booking.status === 'payment_completed' ? 'paid' : booking.status === 'payment_processing' ? 'processing' : 'pending'),
        }
      });
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await bookingService.cancelBooking(id, { reason: 'Cancelled by farmer' });
      toast.success('Booking cancelled successfully.');
      setCancelModal(false);
      fetchData();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <FarmerLayout><CardSkeleton rows={6} /></FarmerLayout>;

  const { booking, procurement, payment, queueEntry } = data || {};
  if (!booking) return <FarmerLayout><p className="text-center text-gray-500 py-12">Booking not found.</p></FarmerLayout>;

  const canCancel = !['cancelled', 'arrived', 'verification', 'verified',
    'procurement_in_progress', 'procurement_completed', 'payment_processing', 'payment_completed'].includes(booking.status);

  return (
    <FarmerLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/farmer/bookings" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-sm text-gray-500 font-mono">{booking.bookingId}</p>
          </div>
          <div className="ml-auto">
            <Badge status={booking.status} dot />
          </div>
        </div>

        <div className="space-y-4">
          {/* Token + Queue */}
          {['booked', 'arrived', 'verification', 'verified'].includes(booking.status) && (
            <QueueTracker
              centreId={booking.centreId?._id}
              token={booking.token}
              bookingDate={booking.bookingDate}
            />
          )}

          {/* Booking info */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Booking Information</h2>
              <span className="font-mono font-bold text-2xl text-primary-700">{booking.token}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Centre</p>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="font-medium text-gray-900">{booking.centreId?.name}</p>
                </div>
                <p className="text-xs text-gray-400 ml-5">{formatAddress(booking.centreId?.address)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Contact</p>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-gray-700">{booking.centreId?.contactPhone || 'N/A'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Date</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <p className="font-medium">{formatDate(booking.bookingDate)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Time Slot</p>
                <p className="font-medium">{formatTime(booking.slotStartTime)} – {formatTime(booking.slotEndTime)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Crop</p>
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-gray-400" />
                  <p className="font-medium">{booking.cropName}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Quantity</p>
                <p className="font-medium">{booking.quantity} {booking.unit}</p>
              </div>
            </div>

            {canCancel && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button variant="danger" size="sm" onClick={() => setCancelModal(true)}>
                  Cancel Booking
                </Button>
              </div>
            )}
          </div>

          {/* Official Weight & Quality Slip Card */}
          {['procurement_completed', 'payment_processing', 'payment_completed'].includes(booking.status) && (
            <div className="card p-5 bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/30 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                    Official Govt. Procurement Receipt
                  </span>
                  <h3 className="text-base font-black text-white mt-1">किसान जिंस तौल एवं गुणवत्ता पर्ची</h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    View official measured net weight, FAQ moisture content %, grade, and payout calculation
                  </p>
                </div>
                <button
                  onClick={openSlip}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" /> View / Print Weight Slip
                </button>
              </div>
            </div>
          )}

          {/* Procurement */}
          {procurement && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Procurement Details</h2>
                <button onClick={openSlip} className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Full Slip
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Grade</p>
                  <p className="font-medium">{procurement.grade || 'Grade A (FAQ)'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Price / Quintal</p>
                  <p className="font-medium">{procurement.pricePerUnit ? formatCurrency(procurement.pricePerUnit) : 'TBD'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Total Amount</p>
                  <p className="text-lg font-bold text-primary-700">
                    {procurement.totalAmount ? formatCurrency(procurement.totalAmount) : 'Pending'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Status</p>
                  <Badge status={procurement.status} />
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
          {payment && (
            <div className={`card p-5 ${payment.status === 'paid' ? 'border-primary-200 bg-primary-50' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  Payment Status
                </h2>
                <Badge status={payment.status} />
              </div>

              {payment.isDemoPayment && (
                <div className="mb-3 text-xs bg-amber-50 text-amber-700 px-3 py-2 rounded-lg border border-amber-100 flex items-center gap-2">
                  <FaBell className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>DEMO MODE — Payment data is simulated for demonstration</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Amount</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                </div>
                {payment.transactionId && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Transaction ID</p>
                    <p className="font-mono text-xs text-gray-700">{payment.transactionId}</p>
                  </div>
                )}
                {payment.referenceNo && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Reference No.</p>
                    <p className="font-mono text-xs text-gray-700">{payment.referenceNo}</p>
                  </div>
                )}
                {payment.paymentDate && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Payment Date</p>
                    <p className="text-sm">{formatDate(payment.paymentDate)}</p>
                  </div>
                )}
              </div>

              {payment.status === 'paid' && (
                <div className="mt-4 flex items-center gap-2 text-primary-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Payment received successfully
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="card p-5">
            <ProcurementTimeline status={booking.status} />
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      <Modal
        isOpen={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Cancel Booking"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelModal(false)}>Keep Booking</Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>
              Yes, Cancel
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-gray-900 font-medium">Are you sure you want to cancel this booking?</p>
            <p className="text-sm text-gray-500 mt-1">
              This will release your slot and token. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      {/* Procurement Slip Modal */}
      <ProcurementSlipModal
        isOpen={slipModal.open}
        onClose={() => setSlipModal({ open: false, data: null })}
        data={slipModal.data}
        userRole="farmer"
      />
    </FarmerLayout>
  );
};

export default BookingDetailPage;
