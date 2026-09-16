import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, Wheat, ArrowRight, BadgeCheck, Users, KeyRound, Send, Check } from 'lucide-react';
import { useAuth, ROLES, ROLE_LABELS } from '../../context/AuthContext';
import { authService } from '../../services';
import { extractError } from '../../utils/constants';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const OFFICER_ROLES = Object.values(ROLES).filter((r) => r !== ROLES.FARMER);

const LoginPage = () => {
  const [loginMode, setLoginMode] = useState('farmer'); // 'farmer' | 'officer'
  const [form, setForm] = useState({ mobile: '', otp: '', employeeId: '', password: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentDemoOtp, setCurrentDemoOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectMap = {
        farmer: '/farmer/dashboard',
        procurement_officer: '/officer/dashboard',
        quality_staff: '/officer/dashboard',
        data_staff: '/officer/dashboard',
        gate_staff: '/officer/gate-entry',
        centre_head: '/officer/dashboard',
        district_officer: '/admin/dashboard',
        state_officer: '/admin/dashboard',
        central_admin: '/admin/dashboard',
        admin: '/admin/dashboard',
        officer: '/officer/dashboard',
      };
      navigate(from || redirectMap[user.role] || '/farmer/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setErrors({ mobile: 'Enter a valid 10-digit mobile number' });
      return;
    }
    setSendingOtp(true);
    setErrors({});
    try {
      const res = await authService.sendOtp({ mobile: form.mobile });
      setOtpSent(true);
      const demo = res.data?.data?.demoOtp;
      if (demo) setCurrentDemoOtp(demo);
      toast.success(res.data.message || `OTP dispatched to +91 ${form.mobile}`);
      setCountdown(res.data.data?.resendCooldown || 60);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (loginMode === 'farmer') {
      if (!/^[6-9]\d{9}$/.test(form.mobile)) {
        errs.mobile = 'Enter a valid 10-digit mobile number';
      }
      if (!form.otp.trim()) {
        errs.otp = 'Please enter the 6-digit OTP';
      } else if (!/^\d{6}$/.test(form.otp.trim())) {
        errs.otp = 'OTP must be exactly 6 digits';
      }
    } else {
      if (!form.employeeId.trim()) {
        errs.employeeId = 'Employee ID is required (e.g. CPO-001)';
      }
      if (!form.password) {
        errs.password = 'Password is required';
      }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const credentials =
        loginMode === 'farmer'
          ? { mobile: form.mobile.trim(), otp: form.otp.trim() }
          : { employeeId: form.employeeId.toUpperCase(), password: form.password };

      const user = await login(credentials);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);

      if (user.mustChangePassword) {
        toast('Please change your default password.', { icon: '🔐', duration: 5000 });
      }

      // Redirect to role-specific dashboard
      if (from) {
        navigate(from, { replace: true });
      } else {
        const redirectMap = {
          farmer: '/farmer/dashboard',
          procurement_officer: '/officer/dashboard',
          quality_staff: '/officer/dashboard',
          data_staff: '/officer/dashboard',
          gate_staff: '/officer/gate-entry',
          centre_head: '/officer/dashboard',
          district_officer: '/admin/dashboard',
          state_officer: '/admin/dashboard',
          central_admin: '/admin/dashboard',
        };
        navigate(redirectMap[user.role] || '/');
      }
    } catch (err) {
      toast.error(extractError(err));
      setErrors({});
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (credentials) => {
    if (credentials.mobile) {
      setLoginMode('farmer');
      setForm({ mobile: credentials.mobile, otp: '123456', employeeId: '', password: '' });
      setOtpSent(true);
      setCurrentDemoOtp('123456');
    } else {
      setLoginMode('officer');
      setForm({ mobile: '', otp: '', employeeId: credentials.employeeId, password: credentials.password });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-earth-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-700 text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Wheat className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">Kisan Procurement</p>
            <p className="text-primary-200 text-sm">Connect</p>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-6">
            Procurement without<br />the long wait.
          </h1>
          <p className="text-primary-200 text-lg leading-relaxed mb-8">
            Book your slot. Know your turn.<br />
            Track your procurement. Track your payment.
          </p>

          <div className="space-y-4">
            {[
              { num: '01', text: 'Register & add crop details' },
              { num: '02', text: 'Book a slot at your centre' },
              { num: '03', text: 'Track your live queue position' },
              { num: '04', text: 'Receive payment — digitally tracked' },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {step.num}
                </div>
                <p className="text-primary-100">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-300 text-sm">
          Government of India — Digital Agriculture Initiative
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Wheat className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Kisan Connect</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Login to your account</h2>
            <p className="text-gray-500 text-sm mt-1">
              {loginMode === 'farmer'
                ? 'Enter your mobile number to receive OTP'
                : 'Enter your Employee ID and password'}
            </p>
          </div>

          {/* ── Login Mode Toggle ── */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMode('farmer'); setErrors({}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
                ${loginMode === 'farmer'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Wheat className="w-4 h-4" />
              Farmer
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('officer'); setErrors({}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
                ${loginMode === 'officer'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <BadgeCheck className="w-4 h-4" />
              Officer / Staff
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {loginMode === 'farmer' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        id="mobile"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={form.mobile}
                        onChange={(e) => {
                          setForm({ ...form, mobile: e.target.value });
                          setErrors({ ...errors, mobile: '' });
                        }}
                        error={errors.mobile}
                        required
                        leftIcon={<Phone className="w-4 h-4" />}
                        maxLength={10}
                        inputMode="numeric"
                        autoComplete="tel"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={sendingOtp || countdown > 0 || !/^[6-9]\d{9}$/.test(form.mobile)}
                      onClick={handleSendOtp}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 h-[42px] flex-shrink-0"
                    >
                      {sendingOtp ? (
                        'Sending...'
                      ) : countdown > 0 ? (
                        `${countdown}s`
                      ) : otpSent ? (
                        'Resend OTP'
                      ) : (
                        'Get OTP'
                      )}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-2.5">
                    <Input
                      id="otp"
                      label="Enter 6-digit OTP"
                      type="text"
                      placeholder="e.g. 123456"
                      value={form.otp}
                      onChange={(e) => {
                        setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) });
                        setErrors({ ...errors, otp: '' });
                      }}
                      error={errors.otp}
                      required
                      leftIcon={<KeyRound className="w-4 h-4" />}
                      maxLength={6}
                      inputMode="numeric"
                      hint="Enter the 6-digit OTP sent to your registered phone"
                    />

                    {currentDemoOtp && (
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-[11px] text-gray-500">Active Sandbox OTP:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, otp: currentDemoOtp });
                            setErrors({ ...errors, otp: '' });
                          }}
                          className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-0.5 rounded-full transition"
                        >
                          ⚡ Fill Random OTP: {currentDemoOtp}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <Input
                  id="employeeId"
                  label="Employee ID"
                  type="text"
                  placeholder="e.g. CPO-001, SPO-PUN-001"
                  value={form.employeeId}
                  onChange={(e) => { setForm({ ...form, employeeId: e.target.value.toUpperCase() }); setErrors({ ...errors, employeeId: '' }); }}
                  error={errors.employeeId}
                  required
                  leftIcon={<BadgeCheck className="w-4 h-4" />}
                  autoComplete="username"
                />

                <Input
                  id="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
                  error={errors.password}
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  autoComplete="current-password"
                />
              </>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {loginMode === 'farmer' ? 'Verify OTP & Login' : 'Login'}
            </Button>
          </form>

          {loginMode === 'farmer' && (
            <p className="text-center text-sm text-gray-600 mt-6">
              New farmer?{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:underline">
                Register here
              </Link>
            </p>
          )}

          {loginMode === 'officer' && (
            <p className="text-center text-sm text-gray-500 mt-6">
              Officer accounts are created by your supervising officer.
              <br />Contact your supervisor if you don't have credentials.
            </p>
          )}

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Demo Credentials</p>
            <div className="space-y-2">
              {loginMode === 'farmer' ? (
                <button
                  type="button"
                  onClick={() => fillDemo({ mobile: '9751000001' })}
                  className="w-full text-left text-xs p-2.5 rounded-lg bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                >
                  <span className="font-semibold text-primary-600">Farmer</span>
                  <span className="text-gray-500 ml-2">9751000001 (Auto-fills OTP 123456)</span>
                </button>
              ) : (
                <>
                  {[
                    { label: 'Central Admin', id: 'CPO-001', pwd: 'Admin@123', color: 'text-red-600' },
                    { label: 'State Officer (Punjab)', id: 'SPO-PUN-001', pwd: 'Kisan@123', color: 'text-purple-600' },
                    { label: 'District Officer (Ludhiana)', id: 'DNO-LDH-001', pwd: 'Kisan@123', color: 'text-indigo-600' },
                    { label: 'Centre Head', id: 'PCH-LDH-001', pwd: 'Kisan@123', color: 'text-amber-600' },
                    { label: 'Procurement Officer', id: 'PO-LDH-001', pwd: 'Kisan@123', color: 'text-green-600' },
                    { label: 'Quality Staff', id: 'QWS-LDH-001', pwd: 'Kisan@123', color: 'text-teal-600' },
                    { label: 'Gate Staff', id: 'GVS-LDH-001', pwd: 'Kisan@123', color: 'text-cyan-600' },
                  ].map(({ label, id, pwd, color }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => fillDemo({ employeeId: id, password: pwd })}
                      className="w-full text-left text-xs p-2.5 rounded-lg bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                    >
                      <span className={`font-semibold ${color}`}>{label}</span>
                      <span className="text-gray-500 ml-2">{id} / {pwd}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">Click a row to auto-fill credentials</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
