import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function ChangePassword() {
  const { updatePassword, loading, error } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }
    if (password === '123456') {
      setValidationError('Please choose a password different from the default.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    await updatePassword(password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-emerald-600 mb-4">
          <ShieldCheck className="w-12 h-12" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Secure Your Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          Since this is your first time logging in, please change your default password to something secure.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-xl sm:px-10 border border-slate-100">
          
          {(error || validationError) && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
              <span className="block sm:inline">{error || validationError}</span>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                New Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="password"
                  id="password"
                  required
                  minLength={6}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-10 py-3 sm:text-sm border-slate-300 rounded-lg bg-slate-50 transition-colors focus:bg-white"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Confirm New Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="password"
                  id="confirmPassword"
                  required
                  minLength={6}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-10 py-3 sm:text-sm border-slate-300 rounded-lg bg-slate-50 transition-colors focus:bg-white"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || password.length < 6 || confirmPassword.length < 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all items-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Update Password & Continue <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
