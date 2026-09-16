import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Phone, User, MapPin, Wheat, ArrowRight, CheckCircle2,
  ShieldCheck, RefreshCw, KeyRound, AlertCircle, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { extractError } from '../../utils/constants';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Input, { Select } from '../../components/common/Input';
import { INDIAN_STATES, STATE_DISTRICTS } from '../../utils/locations';

const RegisterPage = () => {
  // ONLY the 5 required fields + OTP verification state
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    otp: '',
    state: '',
    district: '',
    address: '',
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentDemoOtp, setCurrentDemoOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Post-registration screen state
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [registeredFarmer, setRegisteredFarmer] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Resend countdown timer
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Step 1: Send OTP to Mobile
  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setErrors((prev) => ({ ...prev, mobile: 'Enter a valid 10-digit Indian mobile number' }));
      return;
    }

    setOtpSending(true);
    try {
      const res = await authService.sendOtp({ mobile: form.mobile, purpose: 'register' });
      setOtpSent(true);
      setIsMobileVerified(false);
      const cooldown = res.data?.data?.resendCooldown || 60;
      setTimer(cooldown);
      const demoCode = res.data?.data?.demoOtp;
      if (demoCode) setCurrentDemoOtp(demoCode);
      toast.success(res.data?.message || `Verification OTP sent to +91 ${form.mobile}`);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: Verify OTP strictly with backend
  const handleVerifyOtp = async () => {
    const cleanOtp = form.otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: 'Please enter the 6-digit OTP' }));
      return;
    }

    setVerifyingOtp(true);
    try {
      await authService.verifyOtp({
        mobile: form.mobile.trim(),
        otp: cleanOtp,
      });
      setIsMobileVerified(true);
      setErrors((prev) => ({ ...prev, otp: '', mobile: '' }));
      toast.success('Mobile Number Verified Successfully ✓');
    } catch (err) {
      setIsMobileVerified(false);
      const errMsg = extractError(err);
      setErrors((prev) => ({ ...prev, otp: errMsg }));
      toast.error(errMsg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Reset verification if mobile changes
  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    update('mobile', val);
    if (isMobileVerified || otpSent) {
      setIsMobileVerified(false);
      setOtpSent(false);
      update('otp', '');
    }
  };

  const hasValidOtp = form.otp.trim().length === 6;

  const isFormValid = !!(
    form.name.trim() &&
    form.mobile.trim().length === 10 &&
    form.state.trim() &&
    form.district.trim() &&
    form.address.trim()
  );

  const canRegister = (isMobileVerified || (otpSent && hasValidOtp)) && isFormValid && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error('Please fill in all 5 required fields.');
      return;
    }

    if (!otpSent && !isMobileVerified) {
      toast.error('Please click "Send OTP" to verify your mobile number.');
      return;
    }

    setLoading(true);
    try {
      // Auto-verify OTP if 6 digits provided but not verified yet
      if (!isMobileVerified && hasValidOtp) {
        await authService.verifyOtp({
          mobile: form.mobile.trim(),
          otp: form.otp.trim(),
        });
        setIsMobileVerified(true);
      }

      await register({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        otp: form.otp.trim(),
        state: form.state.trim(),
        district: form.district.trim(),
        address: form.address.trim(),
      });

      setRegisteredFarmer({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        state: form.state.trim(),
        district: form.district.trim(),
      });
      setRegisteredSuccess(true);
      toast.success('Account created successfully!');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Render Post-Registration "Complete KYC" Screen ──
  if (registeredSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-primary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden animate-fadeIn">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-700 via-primary-700 to-teal-800 p-6 text-white text-center relative">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Farmer Registration Complete!</h1>
            <p className="text-emerald-100 text-sm mt-1">
              Welcome, {registeredFarmer?.name}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Registration Summary Card */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Registered Mobile:</span>
                <span className="font-semibold text-gray-900">+91 {registeredFarmer?.mobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">State / District:</span>
                <span className="font-semibold text-gray-900">
                  {registeredFarmer?.district}, {registeredFarmer?.state}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Basic Registration:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Active
                </span>
              </div>
            </div>

            {/* Complete KYC Action Callout */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border-2 border-amber-300/80 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Complete Your Farmer KYC</h2>
                  <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                    Verify your <strong>Aadhaar</strong> and verify your <strong>Government Kisan ID</strong> to unlock MSP slot booking and enable Direct Benefit Transfer (DBT) payments.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/farmer/kyc')}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-200" />
                  <span>Complete KYC Now (Recommended)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/farmer/dashboard')}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 rounded-xl font-medium text-xs border border-gray-300 transition-all"
                >
                  Skip & Go to Dashboard (Complete KYC Later)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render 5-Field Registration Form (Mobile Entered First) ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-earth-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <Wheat className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Farmer Registration</h1>
          <p className="text-gray-500 text-sm mt-1">
            Mobile verification is mandatory before registration
          </p>
        </div>

        <div className="card p-6 sm:p-8 bg-white border border-gray-200 rounded-3xl shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Mobile Number (Entered First with Mandatory OTP Verification) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-800">
                  1. Mobile Number <span className="text-red-500">*</span>
                </label>
                {isMobileVerified && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Mobile Number Verified
                  </span>
                )}
              </div>

              {isMobileVerified ? (
                /* Verified Mobile Card */
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-semibold shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-gray-600 font-normal">Verified Number: </span>
                      <span className="font-mono text-sm font-bold text-gray-900">+91 {form.mobile}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileVerified(false);
                      setOtpSent(false);
                      update('otp', '');
                    }}
                    className="text-primary-700 hover:text-primary-800 underline text-xs font-semibold px-2 py-1"
                  >
                    Change Number
                  </button>
                </div>
              ) : (
                /* Unverified Mobile Input + Send OTP */
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 text-xs font-medium">
                        +91
                      </div>
                      <input
                        type="tel"
                        id="mobile"
                        name="mobile"
                        placeholder="10-digit mobile number"
                        value={form.mobile}
                        onChange={handleMobileChange}
                        maxLength={10}
                        className={`w-full pl-11 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                          errors.mobile ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:ring-primary-200 focus:border-primary-500'
                        }`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || timer > 0 || form.mobile.length !== 10}
                      className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {otpSending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : timer > 0 ? (
                        <span>{timer}s</span>
                      ) : otpSent ? (
                        <span>Resend OTP</span>
                      ) : (
                        <span>Send OTP</span>
                      )}
                    </button>
                  </div>

                  {errors.mobile && (
                    <p className="text-xs text-red-500">{errors.mobile}</p>
                  )}

                  {/* Quick Demo Helper */}
                  {!isMobileVerified && currentDemoOtp && (
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[11px] text-gray-500 font-medium">Sandbox Generated OTP:</span>
                      <button
                        type="button"
                        onClick={() => {
                          update('otp', currentDemoOtp);
                          toast.success(`Active OTP ${currentDemoOtp} filled. Click Verify to confirm.`);
                        }}
                        className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                      >
                        ⚡ Fill Active Random OTP ({currentDemoOtp})
                      </button>
                    </div>
                  )}

                  {/* OTP Entry & Verification Box */}
                  {otpSent && !isMobileVerified && (
                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-emerald-700" /> Enter 6-Digit OTP:
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">
                          Valid for 5 mins
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="otp"
                          name="otp"
                          placeholder="e.g., 123456"
                          value={form.otp}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            update('otp', val);
                          }}
                          maxLength={6}
                          className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm text-center font-mono tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={verifyingOtp || form.otp.length !== 6}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          {verifyingOtp ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Verify OTP</span>
                          )}
                        </button>
                      </div>

                      {/* Demo OTP quick fill */}
                      <div className="flex items-center justify-between pt-0.5 text-xs text-emerald-800">
                        <span className="text-[11px] text-gray-500">Testing Demo:</span>
                        <button
                          type="button"
                          onClick={() => {
                            update('otp', '123456');
                            setErrors((prev) => ({ ...prev, otp: '' }));
                          }}
                          className="text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-0.5 rounded-full transition"
                        >
                          Use Demo OTP: 123456
                        </button>
                      </div>

                      {errors.otp && (
                        <p className="text-xs text-red-600 font-medium">{errors.otp}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Full Name */}
            <Input
              id="name"
              label="2. Full Name"
              placeholder="e.g., Harpreet Singh"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              error={errors.name}
              required
              leftIcon={<User className="w-4 h-4 text-gray-400" />}
              autoComplete="name"
            />

            {/* 3. State */}
            <Select
              id="state"
              label="3. State"
              value={form.state}
              onChange={(e) => {
                update('state', e.target.value);
                update('district', ''); // reset district when state changes
              }}
              error={errors.state}
              required
            >
              <option value="">Select your State</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>

            {/* 4. District */}
            <Select
              id="district"
              label="4. District"
              value={form.district}
              onChange={(e) => update('district', e.target.value)}
              error={errors.district}
              required
              disabled={!form.state}
            >
              <option value="">
                {form.state ? 'Select your District' : 'First select State above'}
              </option>
              {(STATE_DISTRICTS[form.state] || []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>

            {/* 5. Full Address */}
            <div className="space-y-1">
              <label htmlFor="address" className="block text-xs font-semibold text-gray-700">
                5. Full Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                rows={2}
                placeholder="House / Plot No., Village / Town, Tehsil, Landmark"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                  errors.address ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:ring-primary-200 focus:border-primary-500'
                }`}
              />
              {errors.address && (
                <p className="text-xs text-red-500">{errors.address}</p>
              )}
            </div>

            {/* Register Button + Conditional Status Note */}
            <div className="pt-3 space-y-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={!canRegister}
                className={`w-full shadow-md font-bold transition-all ${
                  !canRegister
                    ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400 border-gray-400'
                    : ''
                }`}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Register Account
              </Button>

              {/* Status explanation when Register button is disabled */}
              {!isMobileVerified && !hasValidOtp ? (
                <div className="flex items-center justify-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 font-medium animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Please send and enter the 6-digit OTP to enable registration.</span>
                </div>
              ) : !isFormValid ? (
                <p className="text-xs text-center text-gray-500">
                  Please fill in all 5 required fields to complete registration.
                </p>
              ) : (
                <p className="text-xs text-center text-emerald-700 font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  All requirements met. Ready to register!
                </p>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
