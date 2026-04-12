import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import socket from '../socket';
import {
  LayoutDashboard, Clock, UserPlus, MessageSquare, Settings,
  Phone, ChevronRight, RefreshCw, UserCheck, SkipForward,
  RotateCcw, Ban, XCircle, ArrowRight, Building2, Calendar,
  Users, ClipboardList, CheckCircle, AlertTriangle, Activity
} from 'lucide-react';

const sidebarNav = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'slots', label: 'Time Slots', Icon: Clock },
  { key: 'walkin', label: 'Walk-Ins', Icon: UserPlus },
  { key: 'sms', label: 'SMS Log', Icon: MessageSquare },
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
      api.get('/slots', { params: { officeId: selectedOffice, serviceId: walkIn.serviceId, date: selectedDate, tz: new Date().getTimezoneOffset() * -1 } })
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

  const statusConfig = {
    serving:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Serving', dot: 'bg-emerald-500' },
    called:      { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Called', dot: 'bg-amber-500' },
    waiting:     { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Waiting', dot: 'bg-blue-500' },
    completed:   { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', label: 'Completed', dot: 'bg-gray-400' },
    skipped:     { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: 'Skipped', dot: 'bg-red-500' },
    confirmed:   { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', label: 'Confirmed', dot: 'bg-emerald-500' },
    'checked-in':{ bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', label: 'Checked In', dot: 'bg-blue-500' },
    cancelled:   { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200', label: 'Cancelled', dot: 'bg-red-400' },
    'no-show':   { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', label: 'No Show', dot: 'bg-orange-500' },
  };

  const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig.waiting;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'serving' ? 'animate-pulse' : ''}`} />
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f8f9fb]">

      {/* ── SIDEBAR ── */}
      <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--gov-primary)] to-[#1a4480] rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">G</div>
            <div>
              <div className="text-gray-900 font-bold text-sm tracking-tight">GovQueue</div>
              <div className="text-gray-400 text-[11px] font-medium">Admin Console</div>
            </div>
          </div>
        </div>

        {/* Nav Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="px-3 pb-2">
            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Menu</span>
          </div>
          {sidebarNav.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200
                ${activeTab === item.key
                  ? 'bg-[var(--gov-primary)] text-white font-semibold shadow-md shadow-blue-500/15'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'}`}
            >
              <item.Icon className="w-[18px] h-[18px]" />
              {item.label}
            </button>
          ))}

          {/* Divider */}
          <div className="my-4 border-t border-gray-100" />

          {/* Location Selector */}
          <div className="px-3 py-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Location</label>
            </div>
            <select
              value={selectedOffice}
              onChange={e => { setSelectedOffice(e.target.value); setLoading(true); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-medium focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-50 transition-all"
            >
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          {/* Date Selector */}
          <div className="px-3 py-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <label className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Date</label>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setLoading(true); }}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-medium focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-50 transition-all"
            />
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-gray-100 space-y-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200
              ${activeTab === 'settings'
                ? 'bg-[var(--gov-primary)] text-white font-semibold shadow-md shadow-blue-500/15'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'}`}
          >
            <Settings className="w-[18px] h-[18px]" />
            Settings
          </button>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">A</div>
            <div>
              <div className="text-xs font-semibold text-gray-800">Admin</div>
              <div className="text-[10px] text-gray-400">Super Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-7 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'slots' && 'Time Slots'}
              {activeTab === 'walkin' && 'Walk-In Registration'}
              {activeTab === 'sms' && 'SMS Log'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              {selectedOfficeName}
              <span className="text-gray-300">•</span>
              {selectedDate}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700">Live</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-blue-200 border-t-[var(--gov-primary)] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-gray-400 mt-3">Loading data...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">

            {/* ═══ DASHBOARD ═══ */}
            {(activeTab === 'dashboard' || activeTab === 'queue') && (
              <>
                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Booked Today', value: stats?.booked || 0, Icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
                    { label: 'Walk-Ins', value: stats?.walkIn || 0, Icon: UserPlus, color: 'text-violet-600', bg: 'bg-violet-50', iconBg: 'bg-violet-100' },
                    { label: 'In Queue', value: stats?.waiting || 0, Icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', iconBg: 'bg-amber-100' },
                    { label: 'Now Serving', value: currentlyServing ? currentlyServing.token : '—', Icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', isToken: true },
                    { label: 'Completed', value: stats?.completed || 0, Icon: CheckCircle, color: 'text-gray-600', bg: 'bg-gray-50', iconBg: 'bg-gray-100' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</span>
                        <div className={`w-9 h-9 ${s.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <s.Icon className={`w-[18px] h-[18px] ${s.color}`} />
                        </div>
                      </div>
                      <div className={`${s.isToken ? 'text-2xl' : 'text-3xl'} font-extrabold text-gray-900 tracking-tight`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                  {/* Queue Table */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-gray-900 text-sm">Live Queue</h2>
                        <p className="text-[11px] text-gray-400 mt-0.5">{activeQueue.length} active • Auto-refreshing</p>
                      </div>
                      <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg text-xs font-medium transition-colors">
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                      </button>
                    </div>
                    {activeQueue.length === 0 ? (
                      <div className="text-center py-14">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Users className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="font-semibold text-gray-400 text-sm">Queue is empty</p>
                        <p className="text-xs text-gray-300 mt-1">No one is currently in the queue</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50/80">
                              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Token</th>
                              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service</th>
                              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {activeQueue.map(t => (
                              <tr key={t.id} className={`transition-colors ${t.status === 'serving' || t.status === 'called' ? 'bg-emerald-50/30' : 'hover:bg-gray-50/50'}`}>
                                <td className="px-6 py-3.5">
                                  <span className="font-bold text-[var(--gov-primary)] text-sm">{t.token}</span>
                                </td>
                                <td className="px-6 py-3.5">
                                  <div className="font-medium text-gray-800">{t.name}</div>
                                  <div className="text-[10px] text-gray-400">{t.type === 'walk-in' ? '🚶 Walk-in' : '📅 Booked'}</div>
                                </td>
                                <td className="px-6 py-3.5 text-gray-600 text-xs">{t.serviceName}</td>
                                <td className="px-6 py-3.5">
                                  <StatusBadge status={t.status} />
                                </td>
                                <td className="px-6 py-3.5">
                                  <div className="flex gap-1.5">
                                    {(t.status === 'serving' || t.status === 'called') && (
                                      <button onClick={() => completeToken(t.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold rounded-lg transition-colors shadow-sm shadow-emerald-500/20">
                                        <UserCheck className="w-3 h-3" /> Done
                                      </button>
                                    )}
                                    {t.status === 'called' && (
                                      <button onClick={() => noShowToken(t.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-semibold rounded-lg transition-colors shadow-sm shadow-orange-500/20">
                                        <Ban className="w-3 h-3" /> No Show
                                      </button>
                                    )}
                                    {t.status === 'waiting' && (
                                      <button onClick={() => skipToken(t.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[11px] font-semibold rounded-lg transition-colors shadow-sm shadow-red-500/20">
                                        <SkipForward className="w-3 h-3" /> Skip
                                      </button>
                                    )}
                                    {t.status === 'skipped' && (
                                      <button onClick={() => requeueToken(t.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-semibold rounded-lg transition-colors shadow-sm shadow-blue-500/20">
                                        <RotateCcw className="w-3 h-3" /> Re-queue
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Controls Panel */}
                  <div className="space-y-5">
                    {/* Call Next Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        Queue Controls
                      </h3>

                      {/* Currently Serving */}
                      {currentlyServing && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4">
                          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Now Serving</div>
                          <div className="text-xl font-extrabold text-emerald-700">{currentlyServing.token}</div>
                          <div className="text-xs text-emerald-600 mt-0.5">{currentlyServing.name}</div>
                        </div>
                      )}

                      <button
                        onClick={callNext}
                        disabled={waiting.length === 0}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2
                          ${waiting.length > 0
                            ? 'bg-gradient-to-r from-[var(--gov-primary)] to-[#1a4480] text-white hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        <Phone className="w-4 h-4" />
                        Call Next{nextToken ? `: ${nextToken.token}` : ''}
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-2 gap-2.5 mt-3">
                        <button
                          onClick={() => { if (nextToken) skipToken(nextToken.id); }}
                          disabled={!nextToken}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5
                            ${nextToken
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                              : 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'}`}
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                          Skip Next
                        </button>
                        <button
                          onClick={() => setActiveTab('walkin')}
                          className="py-2.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-all duration-200 flex items-center justify-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Walk-In
                        </button>
                      </div>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-gray-400" />
                        Today's Summary
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Scheduled', value: stats?.booked || 0, color: 'bg-blue-500' },
                          { label: 'Walk-ins', value: stats?.walkIn || 0, color: 'bg-violet-500' },
                          { label: 'Completed', value: stats?.completed || 0, color: 'bg-emerald-500' },
                          { label: 'No Shows', value: stats?.noShow || 0, color: 'bg-orange-500' },
                          { label: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length, color: 'bg-red-500' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2.5 h-2.5 ${item.color} rounded-full`} />
                              <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-800">{item.value}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">Total</span>
                          <span className="text-sm font-extrabold text-gray-900">{stats?.totalToday || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ TIME SLOTS ═══ */}
            {activeTab === 'slots' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 text-sm">Appointments by Time Slot</h2>
                  <p className="text-xs text-gray-400 mt-0.5">All appointments organized by slot for {selectedDate}</p>
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
                    return (
                      <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
                        <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="font-semibold text-gray-400">No appointments for this date</p>
                      </div>
                    );
                  }

                  return sortedSlots.map(([slot, appts]) => (
                    <div key={slot} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-6 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Clock className="w-4 h-4 text-blue-500" />
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm">{slot}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            {appts.length} booked
                          </span>
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                            {appts.filter(a => a.status === 'completed').length} done
                          </span>
                        </div>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50/50">
                            <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Token</th>
                            <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service</th>
                            <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {appts.map(a => {
                            const qToken = queue.find(q => q.appointmentId === a.id);
                            return (
                              <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-3 font-bold text-[var(--gov-primary)] text-sm">{a.token}</td>
                                <td className="px-6 py-3 font-medium text-gray-800">{a.name}</td>
                                <td className="px-6 py-3 text-gray-500 text-xs">{a.serviceName}</td>
                                <td className="px-6 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${a.type === 'walk-in' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{a.type}</span>
                                </td>
                                <td className="px-6 py-3"><StatusBadge status={a.status} /></td>
                                <td className="px-6 py-3">
                                  <div className="flex gap-1.5">
                                    {qToken && (qToken.status === 'serving' || qToken.status === 'called') && (
                                      <button onClick={() => completeToken(qToken.id)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold rounded-lg transition-colors">
                                        <UserCheck className="w-3 h-3" /> Done
                                      </button>
                                    )}
                                    {qToken && qToken.status === 'called' && (
                                      <button onClick={() => noShowToken(qToken.id)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-semibold rounded-lg transition-colors">
                                        <Ban className="w-3 h-3" /> No Show
                                      </button>
                                    )}
                                    {qToken && qToken.status === 'waiting' && (
                                      <button onClick={() => skipToken(qToken.id)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-semibold rounded-lg transition-colors">
                                        <SkipForward className="w-3 h-3" /> Skip
                                      </button>
                                    )}
                                    {qToken && qToken.status === 'skipped' && (
                                      <button onClick={() => requeueToken(qToken.id)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-semibold rounded-lg transition-colors">
                                        <RotateCcw className="w-3 h-3" /> Re-queue
                                      </button>
                                    )}
                                    {(a.status === 'confirmed' || a.status === 'checked-in') && (
                                      <button onClick={() => cancelAppointment(a.id)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-semibold rounded-lg transition-colors">
                                        <XCircle className="w-3 h-3" /> Cancel
                                      </button>
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

            {/* ═══ WALK-IN ═══ */}
            {activeTab === 'walkin' && (
              <div className="max-w-xl">
                <div className="bg-white rounded-2xl border border-gray-100 p-7">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">Register Walk-In</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Add a new visitor and assign to a time slot</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
                      <input type="text" placeholder="Enter visitor's name" value={walkIn.name} onChange={e => setWalkIn(w => ({ ...w, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-50 placeholder-gray-300 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-4 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-500 text-xs font-semibold">+91</span>
                        <input type="tel" placeholder="10-digit number" maxLength={10} value={walkIn.phone}
                          onChange={e => setWalkIn(w => ({ ...w, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-r-xl text-sm font-medium focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-50 placeholder-gray-300 transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Service</label>
                      <select value={walkIn.serviceId} onChange={e => setWalkIn(w => ({ ...w, serviceId: e.target.value, timeSlot: '' }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-50 transition-all">
                        <option value="">Select a service</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                      </select>
                    </div>

                    {/* Time Slot Selector */}
                    {walkIn.serviceId && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Assign Time Slot</label>
                        {walkInSlots.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-gray-300 mx-auto mb-2" />
                            <p className="text-xs text-gray-400 font-medium">No slots available today</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {walkInSlots.filter(s => s.available > 0).map(slot => (
                              <button key={slot.label} onClick={() => setWalkIn(w => ({ ...w, timeSlot: slot.label }))}
                                className={`p-3 rounded-xl border-2 text-center transition-all duration-150 text-xs
                                  ${walkIn.timeSlot === slot.label
                                    ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-sm'
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
                            className={`w-full mt-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all
                              ${!walkIn.timeSlot
                                ? 'border-violet-400 bg-violet-50 text-violet-700'
                                : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                            No slot — Add as Walk-in
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={addWalkIn}
                    className="w-full mt-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-violet-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add to Queue{walkIn.timeSlot ? ` (${walkIn.timeSlot})` : ''}
                  </button>
                </div>
              </div>
            )}

            {/* ═══ SMS LOG ═══ */}
            {activeTab === 'sms' && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">SMS Notifications</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Recent SMS sent to citizens</p>
                  </div>
                  <button onClick={fetchSmsLog}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg text-xs font-medium transition-colors">
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
                <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                  {smsLog.length === 0 ? (
                    <div className="text-center py-14">
                      <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="font-semibold text-gray-400 text-sm">No SMS sent yet</p>
                    </div>
                  ) : smsLog.map(sms => (
                    <div key={sms.id || sms._id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-sm text-gray-800">{sms.phone}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border
                          ${sms.type === 'confirmation' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            sms.type === 'alert' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'}`}>{sms.type}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{sms.message}</p>
                      <p className="text-[10px] text-gray-300 mt-1.5">{new Date(sms.createdAt || sms.sentAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ SETTINGS ═══ */}
            {activeTab === 'settings' && (
              <div className="max-w-lg">
                <div className="bg-white rounded-2xl border border-gray-100 p-7">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center">
                      <Settings className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">Settings</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Manage slot capacity and office configuration</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Slot Capacity (per slot)</label>
                      <div className="flex gap-2">
                        <input type="number" min={1} max={20} value={capacity} onChange={e => setCapacity(e.target.value)}
                          className="w-24 px-4 py-2.5 border border-gray-200 rounded-xl text-center font-bold text-gray-800 focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-50 transition-all" />
                        <button onClick={updateCapacity}
                          className="px-5 py-2.5 bg-[var(--gov-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--gov-primary-light)] transition-colors shadow-sm">
                          Update
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5">Maximum number of appointments allowed per 30-min slot</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Active Office</label>
                      <select value={selectedOffice} onChange={e => { setSelectedOffice(e.target.value); setLoading(true); }}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-50 transition-all">
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
