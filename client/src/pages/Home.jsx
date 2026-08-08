import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users, ClipboardList, MapPin, CheckCircle,
  CalendarDays, Ticket, Globe, Smartphone,
  ArrowRight
} from 'lucide-react';
import MapSection from '../components/MapSection';

/* ── SERVICE DATA ── */
const services = [
  { name: 'Passport', icon: '🛂', time: '~15 min', color: 'bg-blue-100' },
  { name: 'License', icon: '🚗', time: '~10 min', color: 'bg-rose-100' },
  { name: 'Birth Certificate', icon: '📄', time: '~8 min', color: 'bg-emerald-100' },
  { name: 'Property', icon: '🏠', time: '~20 min', color: 'bg-amber-100' },
  { name: 'Income Certificate', icon: '💰', time: '~10 min', color: 'bg-purple-100' },
  { name: 'Aadhaar Update', icon: '🪪', time: '~12 min', color: 'bg-cyan-100' },
];

/* ── HOW IT WORKS ── */
const howItWorks = [
  {
    title: 'Book Online',
    desc: 'Schedule your government office n anywhere, anytime.',
    Icon: Globe,
    iconBg: 'bg-blue-600',
  },
  {
    title: 'Skip the Queue',
    desc: 'No more waiting in long. virtually when you arrive.',
    Icon: Ticket,
    iconBg: 'bg-orange-500',
  },
  {
    title: 'Live Status',
    desc: 'Track your queue position and estimated t real-time.',
    Icon: Smartphone,
    iconBg: 'bg-pink-600',
  },
  {
    title: 'SMS Alerts',
    desc: "Get notified when it's almost yarn. Never miss your slot.",
    Icon: CalendarDays,
    iconBg: 'bg-green-600',
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const bookLink = isAuthenticated ? '/book' : '/login';

  return (
    <div
      className="bg-gray-50 min-h-[calc(100vh-64px)] flex flex-col w-full"
      style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}
    >
      <div className="flex-1 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">


        {/* ══════════════════════════════════════════════
            ROW 1 — STAT CARDS
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Blue — Total Citizens Served */}
          <div className="bg-gradient-to-br from-[var(--gov-gradient-end)] to-[var(--gov-gradient-start)] rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300 cursor-default group">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors duration-300">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="text-[11px] text-blue-200 font-semibold uppercase tracking-wider bg-blue-500/40 rounded-full px-2 py-0.5 inline-block">Total Citizens Served</div>
              <div className="text-4xl font-black leading-tight mt-1">50,123</div>
            </div>
          </div>

          {/* Green — Available Services */}
          <div className="bg-gradient-to-br from-[#16a34a] to-[#15803d] rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300 cursor-default group">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors duration-300">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div>
              <div className="text-[11px] text-emerald-200 font-semibold uppercase tracking-wider bg-green-500/40 rounded-full px-2 py-0.5 inline-block">Available Services</div>
              <div className="text-4xl font-black leading-tight mt-1">15</div>
            </div>
          </div>

          {/* Orange — Office Locations */}
          <div className="bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300 cursor-default group">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors duration-300">
              <MapPin className="w-8 h-8" />
            </div>
            <div>
              <div className="text-[11px] text-orange-200 font-semibold uppercase tracking-wider bg-orange-500/40 rounded-full px-2 py-0.5 inline-block">Office Locations</div>
              <div className="text-4xl font-black leading-tight mt-1">8</div>
            </div>
          </div>

          {/* Yellow-Green — Citizens' Satisfaction */}
          <div className="bg-gradient-to-br from-[#65a30d] to-[#4d7c0f] rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300 cursor-default group">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors duration-300">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="text-[11px] text-lime-200 font-semibold uppercase tracking-wider bg-lime-500/40 rounded-full px-2 py-0.5 inline-block">Citizens' Satisfaction</div>
              <div className="text-4xl font-black leading-tight mt-1">96.2%</div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            ROW 2 — ACTION BUTTONS  +  HOW IT WORKS
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left — Book Appointment & Check Queue Status */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-5">
            <Link
              to={bookLink}
              id="book-appointment-btn"
              className="bg-gradient-to-br from-[#ea580c] to-[#dc2626] hover:from-[#c2410c] hover:to-[#b91c1c] text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl shadow-lg group"
            >
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                <CalendarDays className="w-9 h-9" />
              </div>
              <div className="font-bold text-base leading-snug">Book Appointment</div>
            </Link>

            <Link
              to={isAuthenticated ? '/queue' : '/login'}
              id="check-queue-btn"
              className="bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300 text-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl shadow-md group"
            >
              <div className="w-16 h-16 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300">
                <Ticket className="w-9 h-9 text-blue-600" />
              </div>
              <div className="font-bold text-base leading-snug">Check Queue Status</div>
            </Link>
          </div>

          {/* Right — How It Works */}
          <div className="lg:col-span-8">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-7 bg-blue-600 rounded-full"></span>
              How It Works
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {howItWorks.map((f, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-default relative overflow-hidden"
                >
                  <div className={`w-12 h-12 ${f.iconBg} rounded-xl flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <f.Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 mb-1.5">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            ROW 3 — MAP  +  AVAILABLE SERVICES
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left — Map placeholder (Leaflet) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                <span className="w-1.5 h-7 bg-orange-500 rounded-full"></span>
                Find Office by Map
              </h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">8 Locations</span>
            </div>
            <div className="relative flex-1 min-h-[320px]">
              <MapSection />
            </div>
          </div>

          {/* Right — Available Services */}
          <div className="lg:col-span-8">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-7 bg-emerald-500 rounded-full"></span>
              Available Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((s, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-default"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 ${s.color} rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-base text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.time}</div>
                      <Link
                        to={bookLink}
                        className="inline-block mt-2 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold transition-all duration-200 hover:shadow-md"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CTA BANNER — full-width edge-to-edge
      ══════════════════════════════════════════════ */}
      <div className="w-full bg-gradient-to-r from-[var(--gov-primary)] via-[var(--gov-primary-light)] to-[var(--gov-gradient-end)] px-10 py-12 text-center shadow-xl relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/5 rounded-full"></div>

        <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-3 relative z-10">
          Ready to Skip the Queue?
        </h2>
        <p className="text-blue-200 text-base mb-8 max-w-lg mx-auto relative z-10">
          Book your appointment now and save hours of waiting time.
        </p>
        <Link
          to={bookLink}
          id="get-started-btn"
          className="relative z-10 inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-extrabold px-10 py-4 rounded-xl shadow-lg shadow-amber-400/30 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 text-lg border-2 border-amber-500"
        >
          Get Started Now
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-auto w-full">
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">

          <p className="text-sm text-gray-500">
            © <span className="font-bold text-gray-700">GovQueue</span> - Government Appointment &amp; Queue Management System | 2024
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="hover:text-gray-600 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-gray-600 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-gray-600 cursor-pointer transition-colors">Contact Us</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
