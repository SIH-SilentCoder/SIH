import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ArrowRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { paymentService } from '../../services';
import { formatDate, formatCurrency, extractError } from '../../utils/constants';
import FarmerLayout from '../../layouts/FarmerLayout';
import Badge from '../../components/common/Badge';
import { TableSkeleton } from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

const PaymentHistoryPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await paymentService.getMyPayments();
        setPayments(res.data?.data?.payments || []);
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  // Summary stats
  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingCount = payments.filter((p) => ['pending', 'processing'].includes(p.status)).length;
  const paidCount = payments.filter((p) => p.status === 'paid').length;

  return (
    <FarmerLayout>
      <div className="page-header">
        <h1 className="page-title">Payment History</h1>
        <p className="page-subtitle">All DBT / PFMS payment records for your procurements</p>
      </div>

      {/* Summary Cards */}
      {!loading && payments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Received</p>
                <p className="text-2xl font-bold mt-1 text-emerald-700">{formatCurrency(totalPaid)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{paidCount} payment(s)</p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payments</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{payments.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">All time</p>
              </div>
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <CreditCard className="w-5 h-5 text-primary-600" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold mt-1 text-amber-700">{pendingCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Awaiting processing</p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment records yet"
          description="Payments received for completed procurement will appear here. Complete your KYC and book a slot to get started."
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
                <th className="table-th">Method</th>
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
                    {p.isDemoPayment && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        DEMO
                      </span>
                    )}
                  </td>
                  <td className="table-td">
                    <p className="text-sm font-bold text-gray-900">
                      {p.amount ? formatCurrency(p.amount) : '—'}
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
                    <p className="text-xs text-gray-600">
                      {p.method || 'DBT / PFMS'}
                    </p>
                  </td>
                  <td className="table-td">
                    <Badge status={p.status} dot />
                  </td>
                  <td className="table-td">
                    {(p.bookingId?._id || p.bookingId) && (
                      <Link
                        to={`/farmer/bookings/${p.bookingId?._id || p.bookingId}`}
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
    </FarmerLayout>
  );
};

export default PaymentHistoryPage;
