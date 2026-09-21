// Status label and color mappings — centralized for easy Hindi translation later

export const BOOKING_STATUS_LABELS = {
  booked: 'Slot Booked',
  arrived: 'Arrived',
  verification: 'Verification',
  verified: 'Verified',
  procurement_in_progress: 'Procurement in Progress',
  procurement_completed: 'Procurement Completed',
  payment_processing: 'Payment Processing',
  payment_completed: 'Payment Received',
  cancelled: 'Cancelled',
};

export const BOOKING_STATUS_COLORS = {
  booked: 'blue',
  arrived: 'purple',
  verification: 'amber',
  verified: 'teal',
  procurement_in_progress: 'orange',
  procurement_completed: 'green',
  payment_processing: 'sky',
  payment_completed: 'green',
  cancelled: 'red',
};

export const QUEUE_STATUS_LABELS = {
  waiting: 'Waiting',
  called: 'Called',
  serving: 'Serving',
  completed: 'Completed',
  absent: 'Absent',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
};

export const PAYMENT_STATUS_COLORS = {
  pending: 'gray',
  processing: 'sky',
  paid: 'green',
  failed: 'red',
};

export const PROCUREMENT_STEPS = [
  { key: 'booked', label: 'Slot Booked' },
  { key: 'arrived', label: 'Arrived at Centre' },
  { key: 'verification', label: 'Verification' },
  { key: 'verified', label: 'Verified' },
  { key: 'procurement_in_progress', label: 'Procurement / Weighing' },
  { key: 'procurement_completed', label: 'Procurement Done' },
  { key: 'quality_checking', label: 'Quality Checking Slip' },
  { key: 'payment_processing', label: 'Payment Processing' },
  { key: 'payment_completed', label: 'Payment Received' },
];

export const STATUS_ORDER = [
  'booked', 'arrived', 'verification', 'verified',
  'procurement_in_progress', 'procurement_completed',
  'quality_checking', 'payment_processing', 'payment_completed',
];

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const formatTime = (time) => {
  if (!time) return '—';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${period}`;
};

export const formatWaitTime = (minutes) => {
  if (!minutes || minutes <= 0) return 'Less than a minute';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
};

export const getStatusStep = (status) => {
  return STATUS_ORDER.indexOf(status);
};

export const extractError = (error) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.errors?.length) {
    return error.response.data.errors.map((e) => e.message).join(', ');
  }
  if (error?.message === 'Network Error') return 'Unable to connect to the server. Please check your connection.';
  return error?.message || 'An unexpected error occurred. Please try again.';
};

export const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    return [addr.line1 || addr.street, addr.village, addr.district, addr.state, addr.pincode]
      .filter(Boolean)
      .join(', ');
  }
  return String(addr);
};

