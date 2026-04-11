import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function UserDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const services = {
    'svc-1': { name: 'Passport', icon: '🛂' },
    'svc-2': { name: 'Driving License', icon: '🚗' },
    'svc-3': { name: 'Birth Certificate', icon: '📄' },
    'svc-4': { name: 'Property Registration', icon: '🏠' },
    'svc-5': { name: 'Income Certificate', icon: '💰' },
    'svc-6': { name: 'Aadhaar Update', icon: '🪪' },
  };

  useEffect(() => {
    if (user?.id) {
      api.get(`/appointments/by-user/${user.id}`)
        .then(res => setAppointments(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const upcoming = appointments.filter(a => a.status === 'confirmed' || a.status === 'checked-in');
  const completed = appointments.filter(a => a.status === 'completed');

  const statusColor = (s) => {
    const map = {
      confirmed: 'bg-emerald-100 text-emerald-700',
      'checked-in': 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-gray-100 text-gray-600',
    };
    return map[s] || 'bg-gray-100 text-gray-600';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[var(--gov-primary)] to-[var(--gov-gradient-end)] rounded-2xl p-8 mb-8 shadow-xl shadow-blue-500/15 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="text-white">
            <p className="text-blue-200 text-sm">{getGreeting()} 👋</p>
            <h1 className="text-2xl sm:text-3xl font-bold">{user?.name || 'User'}</h1>
            <p className="text-blue-200 text-sm mt-0.5">📱 {user?.phone} &nbsp;•&nbsp; 📧 {user?.email}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in-up stagger-1">
        <Link to="/book" className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="text-3xl mb-2">📅</div>
          <h3 className="font-bold text-gray-900 group-hover:text-[var(--gov-primary)] transition-colors">Book Appointment</h3>
          <p className="text-xs text-gray-400 mt-1">Schedule a new government service visit</p>
        </Link>
        <Link to="/my-appointments" className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="text-3xl mb-2">📋</div>
          <h3 className="font-bold text-gray-900 group-hover:text-[var(--gov-primary)] transition-colors">My Appointments</h3>
          <p className="text-xs text-gray-400 mt-1">View, reschedule, or cancel appointments</p>
        </Link>
        <Link to="/queue" className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
          <div className="text-3xl mb-2">📊</div>
          <h3 className="font-bold text-gray-900 group-hover:text-[var(--gov-primary)] transition-colors">Queue Status</h3>
          <p className="text-xs text-gray-400 mt-1">Track your position in the live queue</p>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-fade-in-up stagger-2">
        {[
          { label: 'Total Bookings', val: appointments.length, color: 'text-[var(--gov-primary)]' },
          { label: 'Upcoming', val: upcoming.length, color: 'text-emerald-600' },
          { label: 'Completed', val: completed.length, color: 'text-gray-500' },
          { label: 'Cancelled', val: appointments.filter(a => a.status === 'cancelled').length, color: 'text-red-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 text-center">
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-400 mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming Appointments */}
      <div className="animate-fade-in-up stagger-3">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {upcoming.length > 0 ? '📅 Upcoming Appointments' : '📅 Recent Activity'}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-[var(--gov-primary)] rounded-full animate-spin" />
          </div>
        ) : upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{services[a.serviceId]?.icon || '📄'}</div>
                  <div>
                    <div className="font-bold text-gray-900">{services[a.serviceId]?.name || a.serviceId}</div>
                    <div className="text-sm text-gray-500 mt-0.5">📅 {a.date} &nbsp;•&nbsp; ⏰ {a.timeSlot}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColor(a.status)}`}>{a.status}</span>
                  <span className="text-lg font-extrabold text-[var(--gov-primary)]">{a.token}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-5xl mb-3">📭</div>
            <h3 className="text-lg font-bold text-gray-900">No upcoming appointments</h3>
            <p className="text-gray-500 text-sm mt-1">Book your first appointment to get started!</p>
            <Link to="/book" className="inline-block mt-4 px-6 py-2.5 bg-[var(--gov-primary)] text-white rounded-xl font-semibold hover:bg-[var(--gov-primary-light)] transition-colors shadow-lg shadow-blue-500/20">
              📅 Book Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
