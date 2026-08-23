import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Phone, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/layouts/MainLayout';

export default function Login() {
  const { signInWithOtp, verifyOtp, loading, error } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [msg, setMsg] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setMsg('');
    const { error } = await signInWithOtp(phone);
    if (!error) {
      setStep('otp');
      setMsg('OTP sent successfully to your mobile number.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setMsg('Please enter the 6-digit OTP.');
      return;
    }
    setMsg('');
    const { error } = await verifyOtp(phone, otp);
    if (error) {
      setMsg('Invalid OTP. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600 mb-4">
          <Building2 className="w-12 h-12" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          DHMS Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 uppercase tracking-widest font-semibold">
          District Health Reporting & Monitoring System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-xl sm:px-10 border border-slate-100">
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {msg && !error && (
            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-start">
              <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span className="block sm:inline">{msg}</span>
            </div>
          )}

          {step === 'phone' ? (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                  Mobile Number
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 sm:text-sm">+91</span>
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    required
                    maxLength={10}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-12 pr-3 py-3 sm:text-sm border-slate-300 rounded-lg bg-slate-50 transition-colors focus:bg-white"
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-slate-700">
                  Enter OTP sent to +91 {phone}
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="otp"
                    required
                    maxLength={6}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-3 sm:text-sm border-slate-300 rounded-lg bg-slate-50 transition-colors text-center tracking-[0.5em] text-lg font-bold focus:bg-white"
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all items-center"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>Verify & Login <ArrowRight className="ml-2 w-4 h-4" /></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setMsg('');
                  }}
                  className="w-full flex justify-center py-2 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Change mobile number
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
