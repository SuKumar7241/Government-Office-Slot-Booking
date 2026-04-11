# 🏛️ GovQueue – Government Appointment Booking & Queue Management System

A smart queue management system that allows citizens to book government service appointments online, track their queue position in real-time, and receive SMS notifications. Built for **CodeQuest Hackathon 2026**.

---

## ✨ Features

### Citizen Side
- 📅 **Book Appointments** – Select service, office, date & time slot
- 🎫 **Token System** – Receive a unique token number on booking
- 📊 **Live Queue Status** – Real-time queue position & estimated wait time
- 📍 **Check-in** – Virtual check-in when you arrive at the office
- 🔄 **Reschedule / Cancel** – Manage appointments easily
- 📱 **SMS Notifications** – Booking confirmation, reminders & alerts (mock)

### Admin Panel
- 📊 **Dashboard** – Total appointments, current queue, active tokens
- 📢 **Call Next** – Mark next person as "Now Serving"
- ⏭️ **Skip / Re-queue** – Skip or delay users
- 🚶 **Walk-in Registration** – Add walk-in visitors manually
- ⚙️ **Capacity Control** – Adjust slot capacity dynamically
- 📱 **SMS Log** – View all sent SMS messages

### Queue Logic
- 🔀 **Hybrid Queue** – Combines booked appointments + walk-ins
- 🎫 **Token Generation** – Unique tokens (GQ-101, GQ-102, ...)
- ⏳ **Wait Time Estimation** – Based on service average time
- 🔄 **Real-time Updates** – Socket.io + polling

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Tailwind CSS 4 (Vite) |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Database | In-memory (MVP) |
| SMS | Mock API (console + log) |

---

## 📁 Project Structure

```
CodequestHakathon/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── BookAppointment.jsx
│   │   │   ├── BookingConfirmation.jsx
│   │   │   ├── MyAppointments.jsx
│   │   │   ├── QueueStatus.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── api.js
│   │   ├── socket.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   └── package.json
│
├── server/                    # Express Backend
│   ├── data/
│   │   └── store.js          # In-memory data store
│   ├── routes/
│   │   ├── services.js       # Services & offices API
│   │   ├── appointments.js   # Appointment CRUD
│   │   ├── queue.js          # Queue status API
│   │   └── admin.js          # Admin operations
│   ├── utils/
│   │   └── sms.js            # Mock SMS service
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Start Backend (Terminal 1)

```bash
cd server
npm run dev
```

Backend runs on **http://localhost:5000**

### 3. Start Frontend (Terminal 2)

```bash
cd client
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## 🔗 API Endpoints

### Services & Offices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List all services |
| GET | `/api/offices` | List all offices |
| GET | `/api/offices/by-service/:serviceId` | Offices for a service |
| GET | `/api/slots?officeId=&serviceId=&date=` | Available time slots |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/appointments` | Book new appointment |
| GET | `/api/appointments/:id` | Get appointment by ID |
| GET | `/api/appointments/by-phone/:phone` | Lookup by phone |
| GET | `/api/appointments/by-token/:token` | Lookup by token |
| PUT | `/api/appointments/:id/reschedule` | Reschedule |
| PUT | `/api/appointments/:id/cancel` | Cancel |
| PUT | `/api/appointments/:id/checkin` | Check-in |

### Queue
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/queue/:officeId` | Live queue for office |
| GET | `/api/queue/:officeId/stats` | Queue statistics |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/call-next` | Call next token |
| POST | `/api/admin/complete` | Mark as completed |
| POST | `/api/admin/skip` | Skip a token |
| POST | `/api/admin/requeue` | Re-queue skipped token |
| POST | `/api/admin/walk-in` | Add walk-in user |
| PUT | `/api/admin/slot-capacity` | Update slot capacity |
| GET | `/api/admin/sms-log` | View SMS log |
| GET | `/api/admin/appointments/all` | All appointments |

---

## 📊 Data Models

### Appointment
```js
{ id, name, phone, serviceId, officeId, date, timeSlot, token, status, type, createdAt }
```

### QueueToken
```js
{ id, token, appointmentId, officeId, serviceId, date, timeSlot, status, type, name, phone, createdAt }
```

### Service
```js
{ id, name, description, icon, avgServiceTime }
```

### Office
```js
{ id, name, address, city, serviceIds }
```

---

## 👥 Team

Built for **CodeQuest Hackathon 2026**

---

## 📄 License

MIT
