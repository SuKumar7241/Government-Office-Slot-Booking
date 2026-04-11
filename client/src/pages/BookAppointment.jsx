import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const steps = ['Service', 'Location', 'Office', 'Date & Time', 'Details'];

export default function BookAppointment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [services, setServices] = useState([]);
  const [regions, setRegions] = useState([]);
  const [offices, setOffices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    serviceId: '',
    regionId: '',
    officeId: '',
    date: '',
    timeSlot: '',
    name: user?.name || '',
    phone: user?.phone || '',
  });

  // Load services & regions on mount
  useEffect(() => {
    api.get('/services').then(res => setServices(res.data)).catch(() => toast.error('Failed to load services'));
    api.get('/regions').then(res => setRegions(res.data)).catch(() => toast.error('Failed to load regions'));
  }, []);

  // Load offices when service AND region are selected
  useEffect(() => {
    if (form.serviceId && form.regionId) {
      api.get(`/offices/by-service/${form.serviceId}`, { params: { regionId: form.regionId } })
        .then(res => setOffices(res.data));
    }
  }, [form.serviceId, form.regionId]);

  // Load slots when date selected
  useEffect(() => {
    if (form.officeId && form.serviceId && form.date) {
      // Client-side guard: don't fetch slots for past dates
      const today = toLocalDateStr(new Date());
      if (form.date < today) {
        setSlots([]);
        toast.error('Cannot select a past date');
        setForm(f => ({ ...f, date: '', timeSlot: '' }));
        return;
      }
      api.get('/slots', { params: { officeId: form.officeId, serviceId: form.serviceId, date: form.date } })
        .then(res => setSlots(res.data));
    }
  }, [form.officeId, form.serviceId, form.date]);

  // Validation helpers
  const isValidName = (name) => name.trim().length >= 2 && /^[a-zA-Z\s.]+$/.test(name);
  const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);

  const getNameError = () => {
    if (!form.name) return '';
    if (/[0-9]/.test(form.name)) return 'Name cannot contain numbers';
    if (/[^a-zA-Z\s.]/.test(form.name)) return 'Only letters, spaces and dots allowed';
    if (form.name.trim().length < 2) return 'Name must be at least 2 characters';
    return '';
  };

  const getPhoneError = () => {
    if (!form.phone) return '';
    if (/[^0-9]/.test(form.phone)) return 'Only digits allowed';
    if (form.phone.length < 10) return `${10 - form.phone.length} more digits needed`;
    if (form.phone.length > 10) return 'Phone number must be exactly 10 digits';
    return '';
  };

  const canNext = () => {
    if (step === 0) return !!form.serviceId;
    if (step === 1) return !!form.regionId;
    if (step === 2) return !!form.officeId;
    if (step === 3) return !!form.date && !!form.timeSlot;
    if (step === 4) return isValidName(form.name) && isValidPhone(form.phone);
    return false;
  };

  const handleSubmit = async () => {
    if (!canNext()) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (user?.id) payload.bookedByUserId = user.id;
      const res = await api.post('/appointments', payload);
      toast.success('Appointment booked successfully!');
      navigate(`/confirmation/${res.data.appointment.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const toLocalDateStr = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getMinDate = () => toLocalDateStr(new Date());

  const getMaxDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toLocalDateStr(d);
  };

  const selectedService = services.find(s => s.id === form.serviceId);
  const selectedRegion = regions.find(r => r.id === form.regionId);
  const selectedOffice = offices.find(o => o.id === form.officeId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Book an Appointment</h1>
        <p className="text-gray-500 mt-2">Complete the steps below to schedule your visit</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-0 mb-10 animate-fade-in-up stagger-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                ${i === step ? 'bg-[var(--gov-primary)] text-white shadow-lg shadow-blue-500/20' :
                  i < step ? 'bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200' :
                  'bg-gray-100 text-gray-400'}`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${i === step ? 'bg-white/20' : i < step ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>
                {i < step ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 mx-1 transition-colors duration-300 ${i < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 sm:p-10 animate-fade-in-up stagger-2">

        {/* Step 0: Select Service */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Select a Service</h2>
            <p className="text-gray-500 text-sm mb-6">Choose the government service you need</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => setForm(f => ({ ...f, serviceId: s.id, regionId: '', officeId: '', date: '', timeSlot: '' }))}
                  className={`group text-left p-5 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5
                    ${form.serviceId === s.id
                      ? 'border-[var(--gov-primary)] bg-blue-50/60 shadow-md'
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-md bg-white'}`}
                >
                  <div className="text-3xl mb-3">{s.icon}</div>
                  <div className="font-semibold text-gray-900 group-hover:text-[var(--gov-primary)] transition-colors">{s.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.description}</div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <span>⏱️</span> Avg. {s.avgServiceTime} min
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Select Location / Region */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Select Your Region</h2>
            <p className="text-gray-500 text-sm mb-6">Choose your region to find the nearest office for <span className="font-semibold text-gray-700">{selectedService?.icon} {selectedService?.name}</span></p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {regions.map(r => {
                // Count available offices in this region for the selected service
                const officeCount = r._officeCount; // we'll compute below
                return (
                  <button
                    key={r.id}
                    onClick={() => setForm(f => ({ ...f, regionId: r.id, officeId: '', date: '', timeSlot: '' }))}
                    className={`group text-left p-5 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5
                      ${form.regionId === r.id
                        ? 'border-[var(--gov-primary)] bg-blue-50/60 shadow-md'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-md bg-white'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">{r.icon}</div>
                      <div>
                        <div className="font-semibold text-gray-900 text-lg group-hover:text-[var(--gov-primary)] transition-colors">{r.name}</div>
                        <div className="text-xs text-gray-400">{r.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 text-gray-500">
                        📍 {r.description.split(', ').length} cities
                      </span>
                      {form.regionId === r.id && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Helpful hint */}
            <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50/60 border border-amber-100">
              <span className="text-xl mt-0.5">💡</span>
              <div>
                <p className="text-sm font-medium text-amber-800">Choose the closest region</p>
                <p className="text-xs text-amber-600 mt-0.5">Selecting your nearest region helps you find the most convenient office location and reduces travel time.</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Office */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Select Office Location</h2>
            <p className="text-gray-500 text-sm mb-2">
              Offices in <span className="font-semibold text-gray-700">{selectedRegion?.icon} {selectedRegion?.name}</span> for <span className="font-semibold text-gray-700">{selectedService?.icon} {selectedService?.name}</span>
            </p>
            {/* Region badge */}
            <div className="mb-6 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                📍 {selectedRegion?.name}
              </span>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-[var(--gov-primary)] hover:underline font-medium"
              >
                Change region
              </button>
            </div>
            {offices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📍</div>
                <p className="font-medium text-gray-500">No offices available</p>
                <p className="text-sm mt-1">No offices in {selectedRegion?.name} offer {selectedService?.name}.</p>
                <button
                  onClick={() => setStep(1)}
                  className="mt-4 px-5 py-2 text-sm font-medium text-[var(--gov-primary)] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  ← Try another region
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {offices.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setForm(f => ({ ...f, officeId: o.id, date: '', timeSlot: '' }))}
                    className={`text-left p-5 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5
                      ${form.officeId === o.id
                        ? 'border-[var(--gov-primary)] bg-blue-50/60 shadow-md'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-md bg-white'}`}
                  >
                    <div className="font-semibold text-gray-900 text-lg">{o.name}</div>
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <span>📍</span> {o.address}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">{o.city}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Choose Date & Time</h2>
            <p className="text-gray-500 text-sm mb-6">Pick a convenient date and available time slot</p>

            {/* Date Picker */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={form.date}
                min={getMinDate()}
                max={getMaxDate()}
                onChange={e => setForm(f => ({ ...f, date: e.target.value, timeSlot: '' }))}
                className="w-full sm:w-auto px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 font-medium
                  focus:outline-none focus:border-[var(--gov-primary)] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Time Slots */}
            {form.date && (
              <div className="animate-fade-in">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Available Time Slots</label>
                {/* Filter out past slots for today */}
                {(() => {
                  const futureSlots = slots.filter(slot => !slot.isPast);
                  if (futureSlots.length === 0) {
                    const isToday = form.date === toLocalDateStr(new Date());
                    return (
                      <div className="text-center py-8 text-gray-400">
                        <div className="text-3xl mb-2">⏰</div>
                        <p className="font-medium text-gray-500">
                          {isToday ? 'No more slots available today' : 'No slots available for this date'}
                        </p>
                        <p className="text-sm mt-1">
                          {isToday
                            ? 'All time slots for today have passed. Please select a future date.'
                            : 'Please try selecting a different date.'}
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {futureSlots.map(slot => {
                        const isFull = slot.available <= 0;
                        const isSelected = form.timeSlot === slot.label;
                        return (
                          <button
                            key={slot.label}
                            disabled={isFull}
                            onClick={() => setForm(f => ({ ...f, timeSlot: slot.label }))}
                            className={`p-3 rounded-xl border-2 text-center transition-all duration-200
                              ${isFull
                                ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                : isSelected
                                  ? 'border-[var(--gov-primary)] bg-blue-50 text-[var(--gov-primary)] shadow-md'
                                  : 'border-gray-100 hover:border-gray-200 hover:shadow-sm text-gray-700 bg-white'}`}
                          >
                            <div className="font-semibold text-sm">{slot.label}</div>
                            <div className={`text-xs mt-1 ${isFull ? 'text-red-300' : slot.available <= 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {isFull ? 'Full' : `${slot.available} slots left`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Personal Details */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Your Details</h2>
            <p className="text-gray-500 text-sm mb-6">Enter your information to confirm the booking</p>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mb-8 border border-blue-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Booking Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Service:</span>
                  <div className="font-semibold text-gray-900">{selectedService?.icon} {selectedService?.name}</div>
                </div>
                <div>
                  <span className="text-gray-400">Region:</span>
                  <div className="font-semibold text-gray-900">{selectedRegion?.icon} {selectedRegion?.name}</div>
                </div>
                <div>
                  <span className="text-gray-400">Office:</span>
                  <div className="font-semibold text-gray-900">{selectedOffice?.name}</div>
                </div>
                <div>
                  <span className="text-gray-400">Slot:</span>
                  <div className="font-semibold text-gray-900">📅 {form.date} | {form.timeSlot}</div>
                </div>
              </div>
            </div>

            <div className="space-y-5 max-w-md">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={e => {
                    const val = e.target.value.replace(/[0-9]/g, '');
                    setForm(f => ({ ...f, name: val }));
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900
                    focus:outline-none focus:ring-2 transition-all placeholder-gray-300
                    ${getNameError()
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                      : form.name && isValidName(form.name)
                        ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                        : 'border-gray-200 focus:border-[var(--gov-primary)] focus:ring-blue-100'}`}
                />
                {getNameError() ? (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">⚠️ {getNameError()}</p>
                ) : form.name && isValidName(form.name) ? (
                  <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">✓ Looks good</p>
                ) : null}
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
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setForm(f => ({ ...f, phone: val }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-r-xl text-gray-900
                      focus:outline-none focus:ring-2 transition-all placeholder-gray-300
                      ${getPhoneError()
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : form.phone && isValidPhone(form.phone)
                          ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                          : 'border-gray-200 focus:border-[var(--gov-primary)] focus:ring-blue-100'}`}
                  />
                </div>
                {getPhoneError() ? (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">⚠️ {getPhoneError()}</p>
                ) : form.phone && isValidPhone(form.phone) ? (
                  <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">✓ Valid phone number</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1.5">You'll receive booking confirmation & alerts via SMS</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${step === 0 ? 'invisible' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            ← Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${canNext()
                  ? 'bg-[var(--gov-primary)] text-white hover:bg-[var(--gov-primary-light)] shadow-lg shadow-blue-500/20 hover:-translate-y-0.5'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canNext() || loading}
              className={`px-10 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2
                ${canNext() && !loading
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  Booking...
                </>
              ) : '✅ Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
