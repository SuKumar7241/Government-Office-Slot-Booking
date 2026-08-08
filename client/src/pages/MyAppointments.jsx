import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

export default function MyAppointments() {
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [searchMode, setSearchMode] = useState('phone'); // phone | token
  const [appointments, setAppointments] = useState([]);
  const [singleAppt, setSingleAppt] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reschedule modal state
  const [showReschedule, setShowReschedule] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [slots, setSlots] = useState([]);

  const services = { 'svc-1': '🛂 Passport', 'svc-2': '🚗 Driving License', 'svc-3': '📄 Birth Certificate', 'svc-4': '🏠 Property Registration', 'svc-5': '💰 Income Certificate', 'svc-6': '🪪 Aadhaar Update' };

  const searchByPhone = async () => {
    if (!phone) return;
    setLoading(true);
    setSingleAppt(null);
    try {
      const res = await api.get(`/appointments/by-phone/${phone}`);
      setAppointments(res.data);
      setSearched(true);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const searchByToken = async () => {
    if (!token) return;
    setLoading(true);
    setAppointments([]);
    try {
      const res = await api.get(`/appointments/by-token/${token}`);
      setSingleAppt(res.data);
      setSearched(true);
    } catch {
      toast.error('Token not found');
      setSingleAppt(null);
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.put(`/appointments/${id}/cancel`);
      toast.success('Appointment cancelled');
      searchMode === 'phone' ? searchByPhone() : searchByToken();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  const checkin = async (id) => {
    try {
      await api.put(`/appointments/${id}/checkin`);
      toast.success('Checked in successfully!');
      searchMode === 'phone' ? searchByPhone() : searchByToken();
    } catch {
      toast.error('Check-in failed');
    }
  };

  const openReschedule = async (appt) => {
    setShowReschedule(appt);
    setNewDate('');
    setNewSlot('');
    setSlots([]);
  };

  const loadSlots = async (date) => {
    setNewDate(date);
    setNewSlot('');
    const res = await api.get('/slots', { params: { officeId: showReschedule.officeId, serviceId: showReschedule.serviceId, date } });
    setSlots(res.data);
  };

  const doReschedule = async () => {
    if (!newDate || !newSlot) return;
    try {
      await api.put(`/appointments/${showReschedule.id}/reschedule`, { date: newDate, timeSlot: newSlot });
      toast.success('Appointment rescheduled!');
      setShowReschedule(null);
      searchMode === 'phone' ? searchByPhone() : searchByToken();
    } catch {
      toast.error('Reschedule failed');
    }
  };

  const apptList = singleAppt ? [singleAppt] : appointments;
  const getMinDate = () => new Date().toISOString().split('T')[0];

  const statusColor = (s) => {
    if (s === 'confirmed') return 'bg-emerald-100 text-emerald-700';
    if (s === 'checked-in') return 'bg-blue-100 text-blue-700';
    if (s === 'cancelled') return 'bg-red-100 text-red-700';
    if (s === 'completed') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">My Appointments</h1>
        <p className="text-gray-500 mt-2">Find, manage, or reschedule your appointments</p>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 mb-8 animate-fade-in-up stagger-1">
        {/* Toggle */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => { setSearchMode('phone'); setSingleAppt(null); setSearched(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${searchMode === 'phone' ? 'bg-[var(--gov-primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            📱 Search by Phone
          </button>
          <button
            onClick={() => { setSearchMode('token'); setAppointments([]); setSearched(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${searchMode === 'token' ? 'bg-[var(--gov-primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            🎫 Search by Token
          </button>
        </div>

        <div className="flex gap-3">
          {searchMode === 'phone' ? (
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchByPhone()}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-300"
            />
          ) : (
            <input
              type="text"
              placeholder="Enter token (e.g. GQ-101)"
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchByToken()}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-100 transition-all placeholder-gray-300"
            />
          )}
          <button
            onClick={searchMode === 'phone' ? searchByPhone : searchByToken}
            disabled={loading}
            className="px-6 py-3 bg-[var(--gov-primary)] text-white rounded-xl font-semibold hover:bg-[var(--gov-primary-light)] transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? '...' : '🔍 Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {searched && apptList.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-5xl mb-3">📭</div>
          <h3 className="text-xl font-bold text-gray-900">No Appointments Found</h3>
          <p className="text-gray-500 mt-1">Try a different phone number or token</p>
          <Link to="/book" className="mt-4 inline-block text-[var(--gov-primary)] font-semibold hover:underline">Book a new appointment →</Link>
        </div>
      )}

      {apptList.length > 0 && (
        <div className="space-y-4">
          {apptList.map((a, i) => (
            <div key={a.id || i} className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-extrabold text-[var(--gov-primary)]">{a.token}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${statusColor(a.status)}`}>{a.status}</span>
                  {a.type === 'walk-in' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Walk-in</span>}
                </div>
                <span className="text-gray-400 text-sm">{services[a.serviceId] || a.serviceId}</span>
              </div>

              <div className="px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-gray-400">Name</span><div className="font-semibold text-gray-900 mt-0.5">{a.name}</div></div>
                  <div><span className="text-gray-400">Date</span><div className="font-semibold text-gray-900 mt-0.5">{a.date}</div></div>
                  <div><span className="text-gray-400">Time Slot</span><div className="font-semibold text-gray-900 mt-0.5">{a.timeSlot}</div></div>
                  {a.queuePosition && (
                    <div>
                      <span className="text-gray-400">Queue Position</span>
                      <div className="font-semibold text-amber-600 mt-0.5">#{a.queuePosition} (~{a.estimatedWaitMinutes} min)</div>
                    </div>
                  )}
                </div>
              </div>

              {(a.status === 'confirmed' || a.status === 'checked-in') && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2">
                  {a.status === 'confirmed' && (
                    <button onClick={() => checkin(a.id)} className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors">
                      📍 Check In
                    </button>
                  )}
                  <button onClick={() => openReschedule(a)} className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors">
                    📅 Reschedule
                  </button>
                  <button onClick={() => cancel(a.id)} className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors">
                    ❌ Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reschedule Modal */}
      {showReschedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📅 Reschedule Appointment</h3>
            <p className="text-gray-500 text-sm mb-4">Token: <strong>{showReschedule.token}</strong></p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">New Date</label>
                <input
                  type="date"
                  min={getMinDate()}
                  value={newDate}
                  onChange={e => loadSlots(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {slots.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Available Slots</label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {slots.filter(s => s.available > 0).map(s => (
                      <button
                        key={s.label}
                        onClick={() => setNewSlot(s.label)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition-all
                          ${newSlot === s.label ? 'border-[var(--gov-primary)] bg-blue-50 text-[var(--gov-primary)]' : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReschedule(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={doReschedule}
                disabled={!newDate || !newSlot}
                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all
                  ${newDate && newSlot ? 'bg-[var(--gov-primary)] text-white hover:bg-[var(--gov-primary-light)]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

