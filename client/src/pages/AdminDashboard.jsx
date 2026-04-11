import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import socket from '../socket';

const sidebarNav = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'slots', label: 'Time Slots' },
  { key: 'walkin', label: 'Walk-Ins' },
  { key: 'sms', label: 'SMS Log' },
];

export default function AdminDashboard() {
  const [offices, setOffices] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState('off-1');
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [smsLog, setSmsLog] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const [walkIn, setWalkIn] = useState({ name: '', phone: '', serviceId: '', timeSlot: '' });
  const [walkInSlots, setWalkInSlots] = useState([]);
  const [capacity, setCapacity] = useState(5);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [serviceFilter, setServiceFilter] = useState('');

  useEffect(() => {
    api.get('/offices').then(res => setOffices(res.data));
    api.get('/services').then(res => setServices(res.data));
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedOffice) return;
    try {
      const [qRes, sRes, aRes] = await Promise.all([
        api.get(`/queue/${selectedOffice}`, { params: { date: selectedDate } }),
        api.get(`/queue/${selectedOffice}/stats`, { params: { date: selectedDate } }),
        api.get('/admin/appointments/all', { params: { date: selectedDate, officeId: selectedOffice } }),
      ]);
      setQueue(qRes.data);
      setStats(sRes.data);
      setAppointments(aRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedOffice, selectedDate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    socket.on('queue-updated', () => fetchData());
    socket.on('appointment-booked', () => fetchData());
    return () => {
      clearInterval(interval);
      socket.off('queue-updated');
      socket.off('appointment-booked');
    };
  }, [fetchData]);

  const callNext = async () => {
    try {
      const res = await api.post('/admin/call-next', { officeId: selectedOffice, date: selectedDate });
      toast.success(res.data.message);
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const completeToken = async (tokenId) => {
    try { await api.post('/admin/complete', { tokenId }); toast.success('Completed'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const skipToken = async (tokenId) => {
    try { await api.post('/admin/skip', { tokenId }); toast.success('Skipped'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const requeueToken = async (tokenId) => {
    try { await api.post('/admin/requeue', { tokenId }); toast.success('Re-queued'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const noShowToken = async (tokenId) => {
    try { await api.post('/admin/no-show', { tokenId }); toast.success('Marked as no-show'); fetchData(); }
    catch { toast.error('Failed'); }
  };

  const cancelAppointment = async (appointmentId) => {
    try { await api.put(`/appointments/${appointmentId}/cancel`); toast.success('Appointment cancelled'); fetchData(); }
    catch { toast.error('Failed to cancel'); }
  };

  const addWalkIn = async () => {
    if (!walkIn.name || !walkIn.phone || !walkIn.serviceId) { toast.error('Fill all fields'); return; }
    try {
      const res = await api.post('/admin/walk-in', { ...walkIn, officeId: selectedOffice });
      toast.success(`Walk-in added: ${res.data.queueToken.token}`);
      setWalkIn({ name: '', phone: '', serviceId: '', timeSlot: '' });
      setWalkInSlots([]);
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const updateCapacity = async () => {
    try { await api.put('/admin/slot-capacity', { capacity: Number(capacity) }); toast.success(`Capacity: ${capacity}`); }
    catch { toast.error('Failed'); }
  };

  const fetchSmsLog = async () => { const res = await api.get('/admin/sms-log'); setSmsLog(res.data); };

  useEffect(() => { if (activeTab === 'sms') fetchSmsLog(); }, [activeTab]);

  // Fetch available slots for walk-in when service changes
  useEffect(() => {
    if (walkIn.serviceId && selectedOffice && selectedDate) {
      api.get('/slots', { params: { officeId: selectedOffice, serviceId: walkIn.serviceId, date: selectedDate } })
        .then(res => setWalkInSlots(res.data))
        .catch(() => setWalkInSlots([]));
    } else {
      setWalkInSlots([]);
    }
  }, [walkIn.serviceId, selectedOffice, selectedDate]);

  const serving = queue.filter(t => t.status === 'serving');
  const called = queue.filter(t => t.status === 'called');
  const waiting = queue.filter(t => t.status === 'waiting');
  const activeQueue = queue.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'no-show');
  const nextToken = waiting.sort((a, b) => a.createdAt - b.createdAt)[0] || null;
  const currentlyServing = serving[0] || called[0] || null;
  const selectedOfficeName = offices.find(o => o.id === selectedOffice)?.name || '';
  const filteredAppointments = serviceFilter
    ? appointments.filter(a => a.serviceId === serviceFilter)
    : appointments;

  const badgeClass = (status) => {
    const m = {
      serving: 'bg-emerald-100 text-emerald-700',
      called: 'bg-amber-100 text-amber-700',
      waiting: 'bg-blue-50 text-blue-600',
      completed: 'bg-gray-100 text-gray-500',
      skipped: 'bg-red-100 text-red-600',
      confirmed: 'bg-emerald-50 text-emerald-600',
      'checked-in': 'bg-blue-50 text-blue-600',
      cancelled: 'bg-red-50 text-red-500',
      'no-show': 'bg-orange-100 text-orange-600',
    };
    return m[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">

      {/* ── SIDEBAR ── */}
      <aside className="w-56 bg-[#0f1d36] flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-white font-black text-lg">G</div>
            <div>
              <div className="text-white font-bold text-sm">GovQueue</div>
              <div className="text-blue-400/50 text-[10px]">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {sidebarNav.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                ${activeTab === item.key
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
            >
              {item.label}
            </button>
          ))}

          <div className="my-3 border-t border-white/10" />

          {/* Location */}
          <div className="px-3 py-2">
            <label className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Location</label>
            <select
              value={selectedOffice}
              onChange={e => { setSelectedOffice(e.target.value); setLoading(true); }}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
            >
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          {/* Date */}
          <div className="px-3 py-2">
            <label className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setLoading(true); }}
              className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
            />
          </div>
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <button onClick={() => setActiveTab('settings')} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
            Settings
          </button>
          <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
            <div className="text-gray-400 text-xs">Admin</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">Government Appointment & Queue Management — {selectedOfficeName}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ═══ DASHBOARD ═══ */}
            {(activeTab === 'dashboard' || activeTab === 'queue') && (
              <>
                {/* Stat Cards */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-blue-500 rounded-xl p-4 text-white">
                    <div className="text-xs font-medium text-blue-100">Today's Appointments</div>
                    <div className="text-3xl font-black mt-1">{stats?.booked || 0}</div>
                  </div>
                  <div className="bg-emerald-500 rounded-xl p-4 text-white">
                    <div className="text-xs font-medium text-emerald-100">Walk-In Visitors</div>
                    <div className="text-3xl font-black mt-1">{stats?.walkIn || 0}</div>
                  </div>
                  <div className="bg-amber-400 rounded-xl p-4 text-white">
                    <div className="text-xs font-medium text-amber-100">In Queue</div>
                    <div className="text-3xl font-black mt-1">{stats?.waiting || 0}</div>
                  </div>
                  <div className="bg-orange-500 rounded-xl p-4 text-white">
                    <div className="text-xs font-medium text-orange-100">Now Serving</div>
                    <div className="text-2xl font-black mt-1">{currentlyServing ? currentlyServing.token : '—'}</div>
                  </div>
                  <div className="bg-purple-500 rounded-xl p-4 text-white">
                    <div className="text-xs font-medium text-purple-100">Completed</div>
                    <div className="text-3xl font-black mt-1">{stats?.completed || 0}</div>
                  </div>
                </div>

                {/* Two Column */}
                <div className="grid grid-cols-3 gap-5">
                  {/* Queue Table */}
                  <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="font-bold text-gray-900">Live Queue Status</h2>
                      <span className="text-xs text-gray-400">{activeQueue.length} active</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-400 uppercase">
                          <th className="px-5 py-2.5 text-left font-semibold">Token</th>
                          <th className="px-5 py-2.5 text-left font-semibold">Name</th>
                          <th className="px-5 py-2.5 text-left font-semibold">Status</th>
                          <th className="px-5 py-2.5 text-left font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {activeQueue.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-2.5 font-bold text-blue-700">{t.token}</td>
                            <td className="px-5 py-2.5 text-gray-800">{t.name}</td>
                            <td className="px-5 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badgeClass(t.status)}`}>{t.status}</span>
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex gap-1">
                                {(t.status === 'serving' || t.status === 'called') && (
                                  <button onClick={() => completeToken(t.id)} className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-semibold rounded hover:bg-emerald-600">Done</button>
                                )}
                                {t.status === 'called' && (
                                  <button onClick={() => noShowToken(t.id)} className="px-2 py-1 bg-orange-500 text-white text-[10px] font-semibold rounded hover:bg-orange-600">No Show</button>
                                )}
                                {t.status === 'waiting' && (
                                  <button onClick={() => skipToken(t.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] font-semibold rounded hover:bg-red-600">Skip</button>
                                )}
                                {t.status === 'skipped' && (
                                  <button onClick={() => requeueToken(t.id)} className="px-2 py-1 bg-blue-500 text-white text-[10px] font-semibold rounded hover:bg-blue-600">Re-queue</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {activeQueue.length === 0 && (
                      <div className="text-center py-10 text-gray-400 text-sm">Queue is empty</div>
                    )}
                    <div className="px-5 py-3 border-t border-gray-100 flex justify-center">
                      <button onClick={fetchData} className="px-5 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors">
                        Refresh Queue
                      </button>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                    <h3 className="font-bold text-gray-900 text-sm">Controls</h3>

                    <button
                      onClick={callNext}
                      disabled={waiting.length === 0}
                      className={`w-full py-3.5 rounded-lg font-bold text-base transition-colors
                        ${waiting.length > 0 ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                      Call Next: {nextToken ? nextToken.token : '—'}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { if (nextToken) skipToken(nextToken.id); }}
                        disabled={!nextToken}
                        className={`py-2.5 rounded-lg text-sm font-semibold transition-colors
                          ${nextToken ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        Skip to Next
                      </button>
                      <button
                        onClick={() => setActiveTab('walkin')}
                        className="py-2.5 rounded-lg text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      >
                        Add Walk-In
                      </button>
                    </div>

                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                    >
                      Adjust Slots
                    </button>
                  </div>
                </div>

                {/* Footer Summary */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">Appointment Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Scheduled</div>
                      <div className="text-2xl font-black text-blue-600">{stats?.booked || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Completed</div>
                      <div className="text-2xl font-black text-emerald-600">{stats?.completed || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Cancelled</div>
                      <div className="text-2xl font-black text-red-500">{appointments.filter(a => a.status === 'cancelled').length}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ APPOINTMENTS ═══ */}
            {activeTab === 'appointments' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">All Appointments</h2>
                    <p className="text-xs text-gray-400">{filteredAppointments.length} of {appointments.length} for {selectedDate}</p>
                  </div>
                  <select
                    value={serviceFilter}
                    onChange={e => setServiceFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:border-blue-400"
                  >
                    <option value="">All Services</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase">
                      <th className="px-5 py-2.5 text-left font-semibold">Token</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Name</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Phone</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Service</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Slot</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Type</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Status</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAppointments.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-2.5 font-bold text-blue-700">{a.token}</td>
                        <td className="px-5 py-2.5 text-gray-800">{a.name}</td>
                        <td className="px-5 py-2.5 text-gray-500">{a.phone}</td>
                        <td className="px-5 py-2.5 text-gray-600">{a.serviceName}</td>
                        <td className="px-5 py-2.5 text-gray-600">{a.timeSlot}</td>
                        <td className="px-5 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${a.type === 'walk-in' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>{a.type}</span>
                        </td>
                        <td className="px-5 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${badgeClass(a.status)}`}>{a.status}</span></td>
                        <td className="px-5 py-2.5">
                          {(a.status === 'confirmed' || a.status === 'checked-in') && (
                            <button onClick={() => cancelAppointment(a.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] font-semibold rounded hover:bg-red-600">Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAppointments.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No appointments</div>}
              </div>
            )}

            {/* ═══ WALK-IN ═══ */}
            {activeTab === 'walkin' && (
              <div className="max-w-lg">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-1">Add Walk-in Visitor</h3>
                  <p className="text-xs text-gray-400 mb-5">Register and assign to an available time slot</p>
                  <div className="space-y-3">
                    <input type="text" placeholder="Full name" value={walkIn.name} onChange={e => setWalkIn(w => ({ ...w, name: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder-gray-300" />
                    <input type="tel" placeholder="Phone number (10 digits)" maxLength={10} value={walkIn.phone}
                      onChange={e => setWalkIn(w => ({ ...w, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 placeholder-gray-300" />
                    <select value={walkIn.serviceId} onChange={e => setWalkIn(w => ({ ...w, serviceId: e.target.value, timeSlot: '' }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100">
                      <option value="">Select service</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                    </select>

                    {/* Time Slot Selector */}
                    {walkIn.serviceId && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Assign Time Slot</label>
                        {walkInSlots.length === 0 ? (
                          <div className="text-center py-4 text-gray-400 text-xs border border-dashed border-gray-200 rounded-lg">No slots available today</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {walkInSlots.filter(s => s.available > 0).map(slot => (
                              <button key={slot.label} onClick={() => setWalkIn(w => ({ ...w, timeSlot: slot.label }))}
                                className={`p-2.5 rounded-lg border-2 text-center transition-all duration-150 text-xs
                                  ${walkIn.timeSlot === slot.label
                                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                                    : 'border-gray-100 hover:border-gray-200 text-gray-600 bg-white'}`}>
                                <div className="font-semibold">{slot.label}</div>
                                <div className={`mt-0.5 ${slot.available <= 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                  {slot.available}/{slot.capacity} left
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {walkInSlots.filter(s => s.available > 0).length > 0 && (
                          <button onClick={() => setWalkIn(w => ({ ...w, timeSlot: '' }))}
                            className={`w-full mt-2 p-2 rounded-lg border-2 text-xs font-medium transition-all
                              ${!walkIn.timeSlot
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                            No slot — Add as Walk-in
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={addWalkIn} className="w-full mt-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition-colors">
                    Add to Queue{walkIn.timeSlot ? ` (${walkIn.timeSlot})` : ''}
                  </button>
                </div>
              </div>
            )}

            {/* ═══ TIME SLOTS VIEW ═══ */}
            {activeTab === 'slots' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="font-bold text-gray-900 mb-0.5">Time Slot Overview</h2>
                  <p className="text-xs text-gray-400">All appointments organized by time slot for {selectedDate}</p>
                </div>

                {(() => {
                  const groups = {};
                  appointments.forEach(a => {
                    const slot = a.timeSlot || 'Unassigned';
                    if (!groups[slot]) groups[slot] = [];
                    groups[slot].push(a);
                  });
                  const sortedSlots = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

                  if (sortedSlots.length === 0) {
                    return <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">No appointments for this date</div>;
                  }

                  return sortedSlots.map(([slot, appts]) => (
                    <div key={slot} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⏰</span>
                          <h3 className="font-bold text-gray-900">{slot}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${appts.filter(a => a.status === 'completed').length === appts.length ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {appts.length} booked
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                            {appts.filter(a => a.status === 'completed').length} done
                          </span>
                        </div>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-400 uppercase">
                            <th className="px-5 py-2 text-left font-semibold">Token</th>
                            <th className="px-5 py-2 text-left font-semibold">Name</th>
                            <th className="px-5 py-2 text-left font-semibold">Service</th>
                            <th className="px-5 py-2 text-left font-semibold">Type</th>
                            <th className="px-5 py-2 text-left font-semibold">Status</th>
                            <th className="px-5 py-2 text-left font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {appts.map(a => {
                            const qToken = queue.find(q => q.appointmentId === a.id);
                            return (
                              <tr key={a.id} className="hover:bg-gray-50/50">
                                <td className="px-5 py-2.5 font-bold text-blue-700">{a.token}</td>
                                <td className="px-5 py-2.5 text-gray-800">{a.name}</td>
                                <td className="px-5 py-2.5 text-gray-600">{a.serviceName}</td>
                                <td className="px-5 py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${a.type === 'walk-in' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>{a.type}</span>
                                </td>
                                <td className="px-5 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${badgeClass(a.status)}`}>{a.status}</span></td>
                                <td className="px-5 py-2.5">
                                  <div className="flex gap-1">
                                    {qToken && (qToken.status === 'serving' || qToken.status === 'called') && (
                                      <button onClick={() => completeToken(qToken.id)} className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-semibold rounded hover:bg-emerald-600">Done</button>
                                    )}
                                    {qToken && qToken.status === 'called' && (
                                      <button onClick={() => noShowToken(qToken.id)} className="px-2 py-1 bg-orange-500 text-white text-[10px] font-semibold rounded hover:bg-orange-600">No Show</button>
                                    )}
                                    {qToken && qToken.status === 'waiting' && (
                                      <button onClick={() => skipToken(qToken.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] font-semibold rounded hover:bg-red-600">Skip</button>
                                    )}
                                    {qToken && qToken.status === 'skipped' && (
                                      <button onClick={() => requeueToken(qToken.id)} className="px-2 py-1 bg-blue-500 text-white text-[10px] font-semibold rounded hover:bg-blue-600">Re-queue</button>
                                    )}
                                    {(a.status === 'confirmed' || a.status === 'checked-in') && (
                                      <button onClick={() => cancelAppointment(a.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] font-semibold rounded hover:bg-red-600">Cancel</button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* ═══ SMS LOG ═══ */}
            {activeTab === 'sms' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">SMS Log</h3>
                  <button onClick={fetchSmsLog} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">Refresh</button>
                </div>
                <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                  {smsLog.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">No SMS sent yet</div>
                  ) : smsLog.map(sms => (
                    <div key={sms.id} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900">{sms.phone}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium
                          ${sms.type === 'confirmation' ? 'bg-emerald-100 text-emerald-700' : sms.type === 'alert' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{sms.type}</span>
                      </div>
                      <p className="text-xs text-gray-500">{sms.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(sms.createdAt || sms.sentAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ SETTINGS ═══ */}
            {activeTab === 'settings' && (
              <div className="max-w-md">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slot Capacity</label>
                      <div className="flex gap-2">
                        <input type="number" min={1} max={20} value={capacity} onChange={e => setCapacity(e.target.value)}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center font-bold focus:outline-none focus:border-blue-400" />
                        <button onClick={updateCapacity} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                          Update
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
                      <select value={selectedOffice} onChange={e => { setSelectedOffice(e.target.value); setLoading(true); }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400">
                        {offices.map(o => <option key={o.id} value={o.id}>{o.name} – {o.city}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
