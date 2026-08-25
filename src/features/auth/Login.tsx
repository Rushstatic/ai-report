import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Phone, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const { loginWithPassword, loading, error } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return;
    await loginWithPassword(phone, password);
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
          
          <form className="space-y-6" onSubmit={handleLogin}>
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="password"
                  id="password"
                  required
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-10 py-3 sm:text-sm border-slate-300 rounded-lg bg-slate-50 transition-colors focus:bg-white"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Default password for new accounts is <strong>123456</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10 || password.length < 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all items-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Sign In <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
