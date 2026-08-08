import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ChevronDown, Menu, X } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isUser, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
    navigate('/');
  };

  /* ── Nav links visible on the landing page (non-auth) ── */
  const publicLinks = [
    { path: '/', label: 'Home' },
  ];

  /* ── Auth-aware links for logged-in users ── */
  const navLinks = [
    { path: '/', label: 'Home', show: true },
  ];

  if (isUser) {
    navLinks.push(
      { path: '/dashboard', label: 'Dashboard', show: true },
      { path: '/book', label: 'Book Appointment', show: true },
      { path: '/queue', label: 'Track Queue', show: true },
    );
  }
  if (isAdmin) {
    navLinks.push(
      { path: '/admin', label: 'Admin Dashboard', show: true },
    );
  }

  const links = isAuthenticated ? navLinks.filter(l => l.show) : publicLinks;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 w-full">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10">

        <div className="flex items-center justify-between h-16">

          {/* ── LOGO ── */}
          <Link to="/" className="flex items-center gap-2 group">
            <Building2 className="w-8 h-8 text-[var(--gov-primary)] group-hover:text-blue-700 transition-colors" />
            <div>
              <span className="text-[var(--gov-primary)] font-bold text-lg tracking-tight">GovQueue</span>
              <span className="hidden sm:block text-gray-400 text-[10px] leading-tight -mt-0.5">Smart Queue Management</span>
            </div>
          </Link>

          {/* ── DESKTOP NAV ── */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.path + link.label}
                to={link.path}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${location.pathname === link.path
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-gray-600 hover:text-blue-700 hover:bg-gray-50'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── RIGHT SIDE (Auth / Profile) ── */}
          <div className="hidden lg:flex items-center">
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-700 hover:bg-gray-50 transition-all">
                  Sign In
                </Link>
                <Link to="/signup" className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--gov-primary)] text-white hover:bg-[var(--gov-primary-light)] transition-all">
                  Sign Up
                </Link>
                <Link to="/admin/login" className="px-4 py-2 rounded-lg text-sm font-medium text-amber-600 hover:bg-amber-50 transition-all border border-amber-200">
                  Admin
                </Link>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="text-left">
                    <div className="text-gray-900 text-sm font-semibold leading-tight">
                      {user?.name} <span className="text-gray-400 font-normal">({isAdmin ? 'Admin' : 'User'})</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-slide-down z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user?.role}
                      </span>
                    </div>
                    {isUser && (
                      <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        📊 Dashboard
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── MOBILE TOGGLE ── */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* ── MOBILE MENU ── */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 animate-slide-down bg-white">
          <div className="px-4 py-3 space-y-1">
            {links.map(link => (
              <Link
                key={link.path + link.label}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${location.pathname === link.path
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-700'
                  }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Auth */}
            <div className="pt-2 mt-2 border-t border-gray-200">
              {!isAuthenticated ? (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                    🔐 Sign In
                  </Link>
                  <Link to="/signup" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                    ✨ Sign Up
                  </Link>
                  <Link to="/admin/login" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-amber-600 hover:bg-amber-50">
                    ⚙️ Admin Sign In
                  </Link>
                </>
              ) : (
                <>
                  <div className="px-4 py-2 text-gray-500 text-sm">
                    👤 {user?.name} ({user?.role})
                  </div>
                  <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50">
                    🚪 Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
