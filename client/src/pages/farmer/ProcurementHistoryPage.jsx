import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, Package, CreditCard, ArrowRight } from 'lucide-react';
import { farmerService, paymentService } from '../../services';
import { formatDate, formatTime, formatCurrency, extractError } from '../../utils/constants';
import FarmerLayout from '../../layouts/FarmerLayout';
import Badge from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

const ProcurementHistoryPage = () => {
  const [tab, setTab] = useState('procurement'); // 'procurement' | 'payments'

  // Procurement history state
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  // Payment history state
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await farmerService.getHistory({ page, limit: 10 });
        setHistory(res.data.data.history);
        setPagination(res.data.data.pagination);
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [page]);

  const fetchPayments = async () => {
    if (paymentsLoaded) return;
    setLoadingPayments(true);
    try {
      const res = await paymentService.getMyPayments();
      setPayments(res.data?.data?.payments || []);
      setPaymentsLoaded(true);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'payments') fetchPayments();
  };

  return (
    <FarmerLayout>
      <div className="page-header">
        <h1 className="page-title">History</h1>
        <p className="page-subtitle">Your complete procurement and payment records</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200 mb-5">
        <button
          onClick={() => handleTabChange('procurement')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'procurement'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4" />
          Procurement History
        </button>
        <button
          onClick={() => handleTabChange('payments')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'payments'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment History
        </button>
      </div>

      {/* ─── PROCUREMENT HISTORY TAB ─── */}
      {tab === 'procurement' && (
        <>
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : history.length === 0 ? (
            <EmptyState
              icon={History}
              title="No procurement history"
              description="Your completed procurement records will appear here."
              className="card"
            />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-th">Date</th>
                      <th className="table-th">Crop</th>
                      <th className="table-th">Centre</th>
                      <th className="table-th">Amount</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Payment</th>
                      <th className="table-th"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {history.map(({ booking, procurement, payment }) => (
                      <tr key={booking._id} className="table-tr">
                        <td className="table-td">
                          <p className="text-sm font-medium">{formatDate(booking.bookingDate)}</p>
                          <p className="text-xs text-gray-400 font-mono">{booking.token}</p>
                        </td>
                        <td className="table-td">
                          <p className="text-sm font-medium">{booking.cropName}</p>
                          <p className="text-xs text-gray-400">{booking.quantity} {booking.unit}</p>
                        </td>
                        <td className="table-td">
                          <p className="text-sm">{booking.centreId?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{booking.centreId?.district}</p>
                        </td>
                        <td className="table-td">
                          <p className="text-sm font-bold text-gray-900">
                            {procurement?.totalAmount ? formatCurrency(procurement.totalAmount) : '—'}
                          </p>
                          {procurement?.grade && (
                            <span className="text-xs text-gray-400">Grade: {procurement.grade}</span>
                          )}
                        </td>
                        <td className="table-td">
                          <Badge status={booking.status} />
                        </td>
                        <td className="table-td">
                          {payment ? (
                            <div>
                              <Badge status={payment.status} />
                              {payment.isDemoPayment && (
                                <p className="text-xs text-amber-600 mt-0.5">Demo</p>
                              )}
                            </div>
                          ) : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                        <td className="table-td">
                          <Link
                            to={`/farmer/bookings/${booking._id}`}
                            className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs font-medium"
                          >
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="flex justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    {pagination.total} records total
                  </p>
                  <div className="flex gap-2">
                    <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                    <button className="btn-secondary btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── PAYMENT HISTORY TAB ─── */}
      {tab === 'payments' && (
        <>
          {loadingPayments ? (
            <TableSkeleton rows={5} cols={5} />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payment history"
              description="Payments received for completed procurement will appear here."
              className="card"
            />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Transaction ID</th>
                    <th className="table-th">Reference No.</th>
                    <th className="table-th">Status</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="table-tr">
                      <td className="table-td">
                        <p className="text-sm font-medium">
                          {p.paymentDate ? formatDate(p.paymentDate) : formatDate(p.createdAt)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.isDemoPayment && <span className="text-amber-600 font-medium">Demo</span>}
                        </p>
                      </td>
                      <td className="table-td">
                        <p className="text-sm font-bold text-gray-900">
                          {p.amount ? formatCurrency(p.amount) : '—'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.method || 'DBT / PFMS'}
                        </p>
                      </td>
                      <td className="table-td">
                        <p className="text-xs font-mono text-gray-700">
                          {p.transactionId || '—'}
                        </p>
                      </td>
                      <td className="table-td">
                        <p className="text-xs font-mono text-gray-700">
                          {p.referenceNo || '—'}
                        </p>
                      </td>
                      <td className="table-td">
                        <Badge status={p.status} />
                      </td>
                      <td className="table-td">
                        {p.bookingId?._id && (
                          <Link
                            to={`/farmer/bookings/${p.bookingId._id || p.bookingId}`}
                            className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs font-medium"
                          >
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </FarmerLayout>
  );
};

export default ProcurementHistoryPage;
