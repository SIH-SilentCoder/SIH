import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Search, Filter } from 'lucide-react';
import { bookingService } from '../../services';
import { formatDate, formatTime, formatCurrency, extractError } from '../../utils/constants';
import FarmerLayout from '../../layouts/FarmerLayout';
import Badge from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import { Select } from '../../components/common/Input';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'booked', label: 'Slot Booked' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'verification', label: 'Verification' },
  { value: 'procurement_in_progress', label: 'In Progress' },
  { value: 'procurement_completed', label: 'Completed' },
  { value: 'payment_processing', label: 'Payment Processing' },
  { value: 'payment_completed', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingService.getBookings({ status: statusFilter || undefined, page, limit: 10 });
      setBookings(res.data?.data?.bookings || []);
      setPagination(res.data?.data?.pagination || {});
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [statusFilter, page]);

  return (
    <FarmerLayout>
      <div className="page-header">
        <h1 className="page-title">My Bookings</h1>
        <p className="page-subtitle">Track all your procurement slot bookings</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          containerClassName="w-48"
        >
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bookings found"
          description={statusFilter ? 'No bookings with this status.' : 'You have no procurement bookings yet.'}
          action={
            <Link to="/farmer/book" className="btn-primary">Book a Slot</Link>
          }
          className="card"
        />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Token</th>
                  <th className="table-th">Centre</th>
                  <th className="table-th">Date & Time</th>
                  <th className="table-th">Crop</th>
                  <th className="table-th">Status</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {bookings.map((b) => (
                  <tr key={b._id} className="table-tr">
                    <td className="table-td">
                      <span className="font-mono font-bold text-primary-700">{b.token}</span>
                    </td>
                    <td className="table-td">
                      <p className="font-medium text-gray-900 text-sm">{b.centreId?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{b.centreId?.district}</p>
                    </td>
                    <td className="table-td">
                      <p className="text-sm">{formatDate(b.bookingDate)}</p>
                      <p className="text-xs text-gray-400">{formatTime(b.slotStartTime)}</p>
                    </td>
                    <td className="table-td">
                      <p className="text-sm font-medium">{b.cropName}</p>
                      <p className="text-xs text-gray-400">{b.quantity} {b.unit}</p>
                    </td>
                    <td className="table-td">
                      <Badge status={b.status} dot />
                    </td>
                    <td className="table-td">
                      <Link
                        to={`/farmer/bookings/${b._id}`}
                        className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium"
                      >
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary btn-sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary btn-sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </FarmerLayout>
  );
};

export default MyBookingsPage;
