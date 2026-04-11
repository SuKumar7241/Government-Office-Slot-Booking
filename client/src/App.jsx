import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import BookAppointment from './pages/BookAppointment';
import BookingConfirmation from './pages/BookingConfirmation';
import MyAppointments from './pages/MyAppointments';
import QueueStatus from './pages/QueueStatus';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import UserLogin from './pages/UserLogin';
import UserSignup from './pages/UserSignup';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignup';

export default function App() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[var(--gov-bg)]">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
            padding: '14px 20px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
      <Navbar />
      <main className={isHome ? 'pb-0' : 'pt-10 pb-12'}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<UserLogin />} />
          <Route path="/signup" element={<UserSignup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />

          {/* Protected User Routes */}
          <Route path="/dashboard" element={<ProtectedRoute requiredRole="user"><UserDashboard /></ProtectedRoute>} />
          <Route path="/book" element={<ProtectedRoute requiredRole="user"><BookAppointment /></ProtectedRoute>} />
          <Route path="/confirmation/:id" element={<ProtectedRoute requiredRole="user"><BookingConfirmation /></ProtectedRoute>} />
          <Route path="/my-appointments" element={<ProtectedRoute requiredRole="user"><MyAppointments /></ProtectedRoute>} />
          <Route path="/queue" element={<ProtectedRoute requiredRole="user"><QueueStatus /></ProtectedRoute>} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}
