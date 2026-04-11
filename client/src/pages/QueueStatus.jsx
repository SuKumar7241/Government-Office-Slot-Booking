import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import socket from '../socket';

export default function QueueStatus() {
  const [offices, setOffices] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState('off-1');
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    api.get('/offices').then(res => setOffices(res.data));
  }, []);

  const fetchQueue = useCallback(async () => {
    if (!selectedOffice) return;
    try {
      const [qRes, sRes] = await Promise.all([
        api.get(`/queue/${selectedOffice}`, { params: { date: selectedDate } }),
        api.get(`/queue/${selectedOffice}/stats`, { params: { date: selectedDate } }),
      ]);
      setQueue(qRes.data);
      setStats(sRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedOffice, selectedDate]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // Polling every 5s

    socket.on('queue-updated', (data) => {
      if (data.officeId === selectedOffice) fetchQueue();
    });

    return () => {
      clearInterval(interval);
      socket.off('queue-updated');
    };
  }, [selectedOffice, fetchQueue]);

  const statusStyles = {
    serving: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '🟢 Serving', pulse: true },
    called: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🔔 Called' },
    waiting: { bg: 'bg-blue-100', text: 'text-blue-700', label: '⏳ Waiting' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-500', label: '✅ Done' },
    skipped: { bg: 'bg-red-100', text: 'text-red-600', label: '⏭️ Skipped' },
  };

  const serving = queue.filter(t => t.status === 'serving');
  const called = queue.filter(t => t.status === 'called');
  const waiting = queue.filter(t => t.status === 'waiting');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Live Queue Status</h1>
        <p className="text-gray-500 mt-2">Real-time queue tracking • Auto-refreshes every 5 seconds</p>
      </div>

      {/* Office Selector */}
      <div className="flex items-center justify-center mb-8 animate-fade-in-up stagger-1">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm w-full sm:w-auto">
          <span className="text-sm font-semibold text-gray-600 shrink-0">📍 Location:</span>
          <select
            value={selectedOffice}
            onChange={e => { setSelectedOffice(e.target.value); setLoading(true); }}
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-100 transition-all bg-white min-w-[250px]"
          >
            {offices.map(o => (
              <option key={o.id} value={o.id}>{o.name} — {o.city}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-[var(--gov-primary)] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in-up stagger-2">
              {[
                { label: 'Total Today', value: stats.totalToday, icon: '📊', color: 'from-blue-500 to-blue-600' },
                { label: 'Waiting', value: stats.waiting, icon: '⏳', color: 'from-amber-500 to-amber-600' },
                { label: 'Now Serving', value: stats.serving + stats.called, icon: '🟢', color: 'from-emerald-500 to-emerald-600' },
                { label: 'Completed', value: stats.completed, icon: '✅', color: 'from-gray-400 to-gray-500' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                  <div className={`w-12 h-12 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center text-xl mx-auto mb-3 shadow-lg`}>
                    {s.icon}
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Now Serving Banner */}
          {serving.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 mb-8 shadow-lg shadow-emerald-500/20 animate-fade-in-up stagger-3">
              <p className="text-emerald-100 text-sm font-semibold uppercase tracking-widest mb-2">Now Serving</p>
              <div className="flex flex-wrap gap-4">
                {serving.map(t => (
                  <div key={t.id} className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 text-white">
                    <span className="text-2xl font-extrabold">{t.token}</span>
                    <span className="block text-sm text-emerald-100 mt-0.5">{t.name} • {t.serviceName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Called Banner */}
          {called.length > 0 && (
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl p-5 mb-6 shadow-lg shadow-amber-400/20 animate-fade-in-up stagger-3">
              <p className="text-amber-900 text-sm font-semibold uppercase tracking-widest mb-2">🔔 Called – Please Proceed</p>
              <div className="flex flex-wrap gap-3">
                {called.map(t => (
                  <div key={t.id} className="bg-white/30 backdrop-blur-sm rounded-lg px-5 py-2 text-amber-900 font-bold">
                    {t.token} – {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queue Table */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden animate-fade-in-up stagger-4">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Queue ({waiting.length} waiting)</h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-medium">No one in queue right now</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-gray-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 font-semibold">#</th>
                      <th className="px-6 py-3 font-semibold">Token</th>
                      <th className="px-6 py-3 font-semibold">Name</th>
                      <th className="px-6 py-3 font-semibold">Service</th>
                      <th className="px-6 py-3 font-semibold">Type</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Est. Wait</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {queue.filter(t => t.status !== 'completed' && t.status !== 'cancelled').map((t, i) => {
                      const style = statusStyles[t.status] || statusStyles.waiting;
                      return (
                        <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5 text-gray-400 font-medium">{t.position || '—'}</td>
                          <td className="px-6 py-3.5 font-bold text-[var(--gov-primary)]">{t.token}</td>
                          <td className="px-6 py-3.5 font-medium text-gray-900">{t.name}</td>
                          <td className="px-6 py-3.5 text-gray-600">{t.serviceName}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.type === 'walk-in' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-gray-500">
                            {t.status === 'waiting' ? `~${t.estimatedWaitMinutes} min` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
