import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function BookingConfirmation() {
  const { id } = useParams();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/appointments/${id}`)
      .then(res => setAppt(res.data))
      .catch(() => setAppt(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-[var(--gov-primary)] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">Loading confirmation...</p>
        </div>
      </div>
    );
  }

  if (!appt) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😔</div>
        <h2 className="text-2xl font-bold text-gray-900">Appointment Not Found</h2>
        <p className="text-gray-500 mt-2">The appointment you're looking for doesn't exist.</p>
        <Link to="/book" className="mt-6 inline-block bg-[var(--gov-primary)] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[var(--gov-primary-light)] transition-colors">
          Book a New Appointment
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Success Banner */}
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
        <p className="text-gray-500 mt-2">Your appointment has been successfully booked</p>
      </div>

      {/* Token Card */}
      <div className="bg-gradient-to-br from-[var(--gov-primary)] to-[var(--gov-gradient-end)] rounded-2xl p-8 text-center text-white shadow-xl shadow-blue-500/20 mb-6 animate-fade-in-up stagger-1">
        <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-2">Your Token Number</p>
        <div className="text-5xl sm:text-6xl font-extrabold tracking-wider mb-4">{appt.token}</div>
        <div className="flex items-center justify-center gap-6 text-sm text-blue-100">
          <div className="flex items-center gap-1.5">
            <span>📅</span> {appt.date}
          </div>
          <div className="flex items-center gap-1.5">
            <span>⏰</span> {appt.timeSlot}
          </div>
        </div>
        {appt.queuePosition && (
          <div className="mt-5 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-5 py-2 text-sm">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Queue Position: #{appt.queuePosition} | Wait: ~{appt.estimatedWaitMinutes} min
          </div>
        )}
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden animate-fade-in-up stagger-2">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Appointment Details</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { label: 'Full Name', value: appt.name, icon: '👤' },
            { label: 'Phone', value: appt.phone, icon: '📱' },
            { label: 'Status', value: appt.status?.toUpperCase(), icon: '📌', badge: true },
            { label: 'Type', value: appt.type, icon: '🏷️' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <span className="text-gray-500 text-sm flex items-center gap-2">
                <span>{item.icon}</span> {item.label}
              </span>
              {item.badge ? (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                  ${appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    appt.status === 'checked-in' ? 'bg-blue-100 text-blue-700' :
                      appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'}`}>
                  {item.value}
                </span>
              ) : (
                <span className="font-semibold text-gray-900">{item.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6 animate-fade-in-up stagger-3">
        <Link
          to="/my-appointments"
          className="flex-1 text-center bg-[var(--gov-primary)] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[var(--gov-primary-light)] transition-all duration-200 shadow-lg shadow-blue-500/20"
        >
          📋 My Appointments
        </Link>
        <Link
          to="/queue"
          className="flex-1 text-center bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
        >
          📊 Live Queue Status
        </Link>
      </div>

      {/* SMS Notice */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in-up stagger-4">
        <span className="text-xl">📱</span>
        <div className="text-sm">
          <p className="font-semibold text-amber-900">SMS Confirmation Sent</p>
          <p className="text-amber-700 mt-0.5">A confirmation message has been sent to {appt.phone}. You'll also receive a reminder before your appointment.</p>
        </div>
      </div>
    </div>
  );
}
