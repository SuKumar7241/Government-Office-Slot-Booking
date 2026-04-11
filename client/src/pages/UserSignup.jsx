import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function UserSignup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isValidName = (n) => n.trim().length >= 2 && /^[a-zA-Z\s.]+$/.test(n);
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isValidPhone = (p) => /^[0-9]{10}$/.test(p);
  const isValidPassword = (p) => p.length >= 6;

  const canSubmit = isValidName(form.name) && isValidEmail(form.email) && isValidPhone(form.phone)
    && isValidPassword(form.password) && form.password === form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await signup({ name: form.name, email: form.email, phone: form.phone, password: form.password }, 'user');
      toast.success('Account created! Welcome to GovQueue');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const fieldStatus = (valid, value) => {
    if (!value) return '';
    return valid ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100' : 'border-red-300 focus:border-red-400 focus:ring-red-100';
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-500/20">
            🏛️
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Join GovQueue for hassle-free appointments</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value.replace(/[0-9]/g, '') }))}
                className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all placeholder-gray-300
                  ${fieldStatus(isValidName(form.name), form.name) || 'border-gray-200 focus:border-[var(--gov-primary)] focus:ring-blue-100'}`}
              />
              {form.name && !isValidName(form.name) && <p className="text-xs text-red-500 mt-1">Min 2 characters, letters only</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all placeholder-gray-300
                  ${fieldStatus(isValidEmail(form.email), form.email) || 'border-gray-200 focus:border-[var(--gov-primary)] focus:ring-blue-100'}`}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
              <div className="flex">
                <span className="inline-flex items-center px-4 border-2 border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-500 text-sm font-semibold select-none">+91</span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  maxLength={10}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) }))}
                  className={`w-full px-4 py-3 border-2 rounded-r-xl text-gray-900 focus:outline-none focus:ring-2 transition-all placeholder-gray-300
                    ${fieldStatus(isValidPhone(form.phone), form.phone) || 'border-gray-200 focus:border-[var(--gov-primary)] focus:ring-blue-100'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all placeholder-gray-300 pr-12
                    ${fieldStatus(isValidPassword(form.password), form.password) || 'border-gray-200 focus:border-[var(--gov-primary)] focus:ring-blue-100'}`}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all placeholder-gray-300
                  ${fieldStatus(form.confirmPassword && form.password === form.confirmPassword, form.confirmPassword) || 'border-gray-200 focus:border-[var(--gov-primary)] focus:ring-blue-100'}`}
                autoComplete="new-password"
              />
              {form.confirmPassword && form.password !== form.confirmPassword && <p className="text-xs text-red-500 mt-1">Passwords don't match</p>}
            </div>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 mt-2 flex items-center justify-center gap-2
                ${canSubmit && !loading
                  ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2563eb] text-white hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {loading ? 'Creating account...' : '✨ Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--gov-primary)] font-semibold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
