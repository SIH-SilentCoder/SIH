import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  Phone, 
  Lock, 
  Wheat, 
  ArrowRight, 
  BadgeCheck, 
  Users, 
  KeyRound, 
  Send, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  Landmark, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  HelpCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  Shield,
  Award,
  Smartphone
} from 'lucide-react';
import { useAuth, ROLES, ROLE_LABELS } from '../../context/AuthContext';
import { authService } from '../../services';
import { extractError } from '../../utils/constants';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const DEMO_CATEGORIES = [
  { id: 'farmer', label: '🌾 Farmer' },
  { id: 'admin', label: '👑 Admin & State' },
  { id: 'district', label: '🏢 District & Centre' },
  { id: 'staff', label: '📋 Mandi Staff' },
];

const DEMO_CREDENTIALS = {
  farmer: [
    { label: 'Farmer (Ram Singh)', mobile: '9751000001', sub: 'OTP: 123456 (Auto-filled)', tag: 'Farmer' }
  ],
  admin: [
    { label: 'Central Admin', id: 'CPO-001', pwd: 'Admin@123', sub: 'Full Governance & Settings', tag: 'Central Admin' },
    { label: 'State Officer (Punjab)', id: 'SPO-PB-001', pwd: 'Kisan@123', sub: 'Punjab State Nodal Officer', tag: 'State Admin' },
    { label: 'State Officer (UP)', id: 'SPO-UP-001', pwd: 'Kisan@123', sub: 'Uttar Pradesh State Nodal Officer', tag: 'State Admin' },
    { label: 'State Officer (MP)', id: 'SPO-MP-001', pwd: 'Kisan@123', sub: 'Madhya Pradesh State Nodal Officer', tag: 'State Admin' },
  ],
  district: [
    { label: 'District Officer (Ludhiana)', id: 'DNO-LDH-001', pwd: 'Kisan@123', sub: 'District Procurement Oversight', tag: 'District' },
    { label: 'Centre Head (Ludhiana Main)', id: 'PCH-LDH-001', pwd: 'Kisan@123', sub: 'Centre Operations Supervisor', tag: 'Centre Head' },
  ],
  staff: [
    { label: 'Procurement Officer', id: 'PO-LDH-001', pwd: 'Kisan@123', sub: 'Slot & Paddy Verification', tag: 'Officer' },
    { label: 'Quality Staff', id: 'QWS-LDH-001', pwd: 'Kisan@123', sub: 'Moisture & Quality Assessment', tag: 'QC Staff' },
    { label: 'Gate Staff', id: 'GVS-LDH-001', pwd: 'Kisan@123', sub: 'Vehicle Entry & Token Issuance', tag: 'Gate Staff' },
  ]
};

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
  const [showDemoDrawer, setShowDemoDrawer] = useState(true);
  const [activeDemoCategory, setActiveDemoCategory] = useState('farmer');

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
      setErrors({ mobile: 'Enter a valid 10-digit Indian mobile number' });
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
      setActiveDemoCategory('farmer');
      setForm({ mobile: credentials.mobile, otp: '123456', employeeId: '', password: '' });
      setOtpSent(true);
      setCurrentDemoOtp('123456');
      toast.success(`Farmer credentials loaded (${credentials.mobile})`, { icon: '🌾' });
    } else {
      setLoginMode('officer');
      setForm({ mobile: '', otp: '', employeeId: credentials.id, password: credentials.pwd });
      toast.success(`Officer ID loaded: ${credentials.id}`, { icon: '🔑' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans flex text-slate-100 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* Background Decorative Mesh & Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-10 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      </div>

      <div className="relative z-10 flex w-full min-h-screen">
        
        {/* ── LEFT PANEL: Modern Government Branding & Feature Showcase ── */}
        <div className="hidden lg:flex lg:w-7/12 bg-gradient-to-br from-slate-900 via-emerald-950/90 to-slate-900 border-r border-slate-800/80 p-12 flex-col justify-between relative">
          
          {/* Top Header & Emblem Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 p-0.5 shadow-lg shadow-emerald-900/40">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Wheat className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-white">Kisan Procurement</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Official Portal
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Digital Agriculture & MSP Queue Management</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full backdrop-blur-md">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              <span>Govt. of India Initiative</span>
            </div>
          </div>

          {/* Hero Pitch Section */}
          <div className="my-auto py-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Zero Waiting • 100% Transparency • Direct MSP Transfer</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
              Empowering Farmers with <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Smart Digital Procurement
              </span>
            </h1>

            <p className="text-slate-300 text-base lg:text-lg leading-relaxed max-w-xl mb-10">
              Book your procurement slot online, monitor live queue status at mandis, 
              verify quality assessments digitally, and receive direct MSP payments.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              {[
                {
                  icon: Clock,
                  title: 'Smart Slot Booking',
                  desc: 'Eliminate long mandi lines with scheduled gate entries.',
                  color: 'text-amber-400',
                  bg: 'bg-amber-500/10 border-amber-500/20'
                },
                {
                  icon: ShieldCheck,
                  title: 'Quality & MSP Assurance',
                  desc: 'Transparent moisture test & automated price calculation.',
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-500/10 border-emerald-500/20'
                },
                {
                  icon: CreditCard,
                  title: 'Direct Benefit Transfer',
                  desc: 'Digitally verified payment directly to linked bank accounts.',
                  color: 'text-teal-400',
                  bg: 'bg-teal-500/10 border-teal-500/20'
                },
                {
                  icon: Building2,
                  title: 'Unified Officer Suite',
                  desc: 'End-to-end state, district, and centre oversight.',
                  color: 'text-cyan-400',
                  bg: 'bg-cyan-500/10 border-cyan-500/20'
                }
              ].map((feat, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-all group"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${feat.bg} border`}>
                    <feat.icon className={`w-5 h-5 ${feat.color}`} />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-emerald-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-snug">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Trust Metrics Footer */}
          <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Real-time Queue Tracking
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                256-bit Bank Encryption
              </span>
            </div>
            <p className="text-slate-500">v2.4 Digital Krishi System</p>
          </div>
        </div>

        {/* ── RIGHT PANEL: Main Login Card & Demo Selector ── */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto bg-slate-950">
          
          {/* Mobile Header */}
          <div className="flex items-center justify-between lg:hidden mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Wheat className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <span className="font-bold text-white text-base block leading-none">Kisan Connect</span>
                <span className="text-[10px] text-slate-400 font-medium">Digital Procurement</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              Govt Portal
            </span>
          </div>

          <div className="w-full max-w-md mx-auto my-auto">
            
            {/* Title Section */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-400 mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Secure Authentication Gateway</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-slate-400 text-sm mt-1.5">
                {loginMode === 'farmer'
                  ? 'Access your slot bookings, queue tokens, and payment history.'
                  : 'Access official procurement administration & gate controls.'}
              </p>
            </div>

            {/* Login Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-900/90 border border-slate-800/90 rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => { setLoginMode('farmer'); setErrors({}); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200
                  ${loginMode === 'farmer'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                <Wheat className="w-4 h-4" />
                Farmer Login
              </button>

              <button
                type="button"
                onClick={() => { setLoginMode('officer'); setErrors({}); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200
                  ${loginMode === 'officer'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                <BadgeCheck className="w-4 h-4" />
                Officer & Staff
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {loginMode === 'farmer' ? (
                <div className="space-y-4">
                  {/* Phone Input with OTP Send Button */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                      Registered Mobile Number <span className="text-emerald-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 border-r border-slate-700 pr-2">
                          <span className="text-xs font-bold text-slate-300">+91</span>
                        </div>
                        <input
                          id="mobile"
                          type="tel"
                          placeholder="9751000001"
                          value={form.mobile}
                          onChange={(e) => {
                            setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') });
                            setErrors({ ...errors, mobile: '' });
                          }}
                          maxLength={10}
                          inputMode="numeric"
                          autoComplete="tel"
                          className={`w-full bg-slate-900/80 border text-white placeholder-slate-500 rounded-xl py-3 pl-16 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all ${
                            errors.mobile ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-800'
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={sendingOtp || countdown > 0 || !/^[6-9]\d{9}$/.test(form.mobile)}
                        onClick={handleSendOtp}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 border border-slate-700 disabled:border-slate-800 text-emerald-400 disabled:text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
                      >
                        {sendingOtp ? (
                          <span className="animate-pulse">Sending...</span>
                        ) : countdown > 0 ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {countdown}s
                          </span>
                        ) : otpSent ? (
                          'Resend OTP'
                        ) : (
                          'Get OTP'
                        )}
                      </button>
                    </div>
                    {errors.mobile && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <span>•</span> {errors.mobile}
                      </p>
                    )}
                  </div>

                  {/* OTP Input & Sandbox Auto-fill Banner */}
                  {otpSent && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                          Enter 6-Digit OTP <span className="text-emerald-400">*</span>
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="otp"
                            type="text"
                            placeholder="e.g. 123456"
                            value={form.otp}
                            onChange={(e) => {
                              setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) });
                              setErrors({ ...errors, otp: '' });
                            }}
                            maxLength={6}
                            inputMode="numeric"
                            className={`w-full bg-slate-900/80 border text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all ${
                              errors.otp ? 'border-red-500' : 'border-slate-800'
                            }`}
                          />
                        </div>
                        {errors.otp && (
                          <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                            <span>•</span> {errors.otp}
                          </p>
                        )}
                      </div>

                      {/* Active Sandbox OTP Helper */}
                      {currentDemoOtp && (
                        <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-300">
                            <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                            <span>Sandbox OTP Generated: <strong className="text-white tracking-widest">{currentDemoOtp}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setForm({ ...form, otp: currentDemoOtp });
                              setErrors({ ...errors, otp: '' });
                            }}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[11px] transition shadow"
                          >
                            Auto Fill
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Employee ID */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                      Official Employee ID <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <BadgeCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="employeeId"
                        type="text"
                        placeholder="e.g. CPO-001 or SPO-PUN-001"
                        value={form.employeeId}
                        onChange={(e) => {
                          setForm({ ...form, employeeId: e.target.value.toUpperCase() });
                          setErrors({ ...errors, employeeId: '' });
                        }}
                        autoComplete="username"
                        className={`w-full bg-slate-900/80 border text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all uppercase ${
                          errors.employeeId ? 'border-red-500' : 'border-slate-800'
                        }`}
                      />
                    </div>
                    {errors.employeeId && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <span>•</span> {errors.employeeId}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                      Password <span className="text-emerald-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={form.password}
                        onChange={(e) => {
                          setForm({ ...form, password: e.target.value });
                          setErrors({ ...errors, password: '' });
                        }}
                        autoComplete="current-password"
                        className={`w-full bg-slate-900/80 border text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all ${
                          errors.password ? 'border-red-500' : 'border-slate-800'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                        <span>•</span> {errors.password}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{loginMode === 'farmer' ? 'Verify OTP & Secure Login' : 'Sign In to Portal'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Navigation Links */}
            <div className="mt-6 text-center text-xs">
              {loginMode === 'farmer' ? (
                <p className="text-slate-400">
                  Are you a new farmer?{' '}
                  <Link to="/register" className="text-emerald-400 font-bold hover:underline">
                    Register New Account →
                  </Link>
                </p>
              ) : (
                <p className="text-slate-400">
                  Officer credentials are issued by your department administrator.
                  <br />Need assistance? Contact your supervising authority.
                </p>
              )}
            </div>

            {/* ── INTERACTIVE DEMO CREDENTIALS TOOLBAR ── */}
            <div className="mt-8 border border-slate-800 rounded-2xl bg-slate-900/60 overflow-hidden backdrop-blur-md">
              <button
                type="button"
                onClick={() => setShowDemoDrawer(!showDemoDrawer)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-300 bg-slate-900/90 border-b border-slate-800 hover:bg-slate-800/80 transition"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Interactive Demo Persona Quick-Login</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-normal">
                  <span>1-Click Fill</span>
                  {showDemoDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {showDemoDrawer && (
                <div className="p-3.5 space-y-3">
                  {/* Category Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {DEMO_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveDemoCategory(cat.id)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                          activeDemoCategory === cat.id
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800/70 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* List of Demo Cards */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                    {DEMO_CREDENTIALS[activeDemoCategory]?.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => fillDemo(item)}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 hover:border-emerald-500/40 transition flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                              {item.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              {item.mobile || item.id}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.sub || item.desc}</p>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Use <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Copyright / SSL Badge */}
          <div className="mt-8 text-center text-[11px] text-slate-500 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 
              Official Portal Encrypted
            </span>
            <span>•</span>
            <span>Government of India</span>
          </div>

        </div>

      </div>
    </div>
  );
};

export default LoginPage;

