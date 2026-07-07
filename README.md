# 🏛️ GovQueue – Smart Government Queue Management System

<div align="center">

**Book. Track. Skip the Queue.**

A full-stack government appointment booking and real-time queue management platform that helps citizens skip long queues at government offices. Built with React, Node.js, MongoDB, and Socket.io.

[![Built for](https://img.shields.io/badge/Built%20for-CodeQuest%20Hackathon%202026-blue?style=for-the-badge)](https://github.com/SuKumar7241/Government-Office-Slot-Booking)
[![Tech](https://img.shields.io/badge/React%2019-Vite-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Backend](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Database](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)

</div>

---

## 🎯 Problem Statement

Citizens often spend hours waiting at government offices for services like passport renewals, driving licenses, and property registrations. There is no transparency on queue position or wait times, leading to frustration and wasted productivity.

## 💡 Our Solution

**GovQueue** digitizes the entire appointment and queue workflow:

1. **Citizens** book appointments online, selecting service → region → office → date & time slot
2. **Admin** manages the live queue, calls next in line, and handles walk-ins
3. **Real-time updates** via Socket.io keep everyone informed — no more guessing
4. **SMS notifications** (mock) alert citizens when it's their turn

---

## ✨ Key Features

### 👤 Citizen Portal
| Feature | Description |
|---------|-------------|
| 📅 **5-Step Booking Wizard** | Service → Region → Office → Date & Time → Details |
| 🗺️ **Multi-Region Support** | 4 states, 24 offices across Delhi NCR, Maharashtra, Karnataka, Rajasthan |
| 🎫 **Token System** | Unique tokens (GQ-101, GQ-102, ...) assigned on booking |
| 📊 **Live Queue Status** | Real-time queue position, estimated wait time, auto-refresh every 5s |
| ✅ **Status Tracking** | See Waiting → Called → Serving → Completed / No Show in real-time |
| 📍 **Office Map** | Interactive Leaflet map showing all office locations |
| 👤 **User Dashboard** | View upcoming & past appointments |
| 🔐 **Authentication** | Separate user signup/login with session-based auth |

### 🛡️ Admin Panel
| Feature | Description |
|---------|-------------|
| 📊 **Live Dashboard** | Real-time stats — booked, walk-ins, in queue, serving, completed |
| 📢 **Call Next** | Advance the queue — automatically marks previous as done |
| ⏭️ **Skip / Re-queue** | Skip no-shows and re-add them later |
| 🚫 **No Show** | Mark absent citizens with dedicated no-show status |
| 🚶 **Walk-In Registration** | Add walk-in visitors with time slot assignment |
| 📱 **SMS Log** | Track all sent notifications |
| ⏰ **Time Slot View** | See all appointments grouped by time slot |
| ⚙️ **Capacity Control** | Adjust slots-per-period on the fly |

### ⚡ Smart Queue Engine
- 🔀 **Hybrid Queue** — Merges booked appointments + walk-ins seamlessly
- ⏳ **Wait Time Estimation** — Calculated from service average times × queue position
- 🕐 **Smart Slot Filtering** — Past time slots auto-hidden for today's date (timezone-aware)
- 🔄 **Real-time Sync** — Socket.io events + polling for instant updates
- 📱 **SMS Alerts** — Confirmation, "you're next", and "now serving" notifications (mock)

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + Vite 8 | SPA with fast HMR |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **Routing** | React Router v7 | Client-side navigation |
| **Maps** | Leaflet + React-Leaflet | Interactive office location map |
| **Backend** | Node.js + Express 4 | REST API server |
| **Database** | MongoDB + Mongoose 9 | Persistent data storage |
| **Real-time** | Socket.io 4 | Live queue updates |
| **Auth** | Session tokens + SHA-256 | User & admin authentication |
| **SMS** | Mock API | Console-logged notifications |
| **Deployment** | Vercel (client) | Production hosting |

---

## 📁 Project Structure

```
GovQueue/
├── client/                         # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top navigation bar
│   │   │   ├── MapSection.jsx      # Leaflet map component
│   │   │   └── ProtectedRoute.jsx  # Auth route guard
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Authentication state
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Landing page with stats & services
│   │   │   ├── BookAppointment.jsx # 5-step booking wizard
│   │   │   ├── BookingConfirmation.jsx
│   │   │   ├── MyAppointments.jsx  # User's appointment list
│   │   │   ├── QueueStatus.jsx     # Live queue display
│   │   │   ├── UserDashboard.jsx   # User overview
│   │   │   ├── AdminDashboard.jsx  # Admin control panel
│   │   │   ├── UserLogin.jsx       # Citizen login
│   │   │   ├── UserSignup.jsx      # Citizen registration
│   │   │   ├── AdminLogin.jsx      # Admin login
│   │   │   └── AdminSignup.jsx     # Admin registration
│   │   ├── api.js                  # Axios API client
│   │   ├── socket.js               # Socket.io client
│   │   ├── App.jsx                 # Routes & layout
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Design system & animations
│   ├── vercel.json                 # Vercel SPA config
│   ├── vite.config.js
│   └── package.json
│
├── server/                         # Express Backend
│   ├── data/
│   │   └── store.js                # Static data, slots, helpers
│   ├── models/
│   │   ├── Appointment.js          # Appointment schema
│   │   ├── QueueToken.js           # Queue token schema
│   │   ├── User.js                 # Citizen user schema
│   │   ├── Admin.js                # Admin user schema
│   │   ├── Session.js              # Auth session schema
│   │   └── SmsLog.js               # SMS log schema
│   ├── middleware/
│   │   └── adminAuth.js            # Admin authentication guard
│   ├── routes/
│   │   ├── services.js             # Services, offices, regions, slots
│   │   ├── appointments.js         # Appointment CRUD + check-in
│   │   ├── queue.js                # Live queue & stats
│   │   ├── admin.js                # Admin operations
│   │   └── auth.js                 # User & admin auth
│   ├── utils/
│   │   └── sms.js                  # Mock SMS service
│   ├── server.js                   # Express + Socket.io entry
│   ├── .env                        # MongoDB URI & config
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 20+** (required for Tailwind CSS v4)
- **npm**
- **MongoDB** (Atlas cloud or local instance)

### 1. Clone the Repository

```bash
git clone https://github.com/SuKumar7241/Government-Office-Slot-Booking.git
cd Government-Office-Slot-Booking
```

### 2. Setup Backend

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/govqueue
PORT=5000
```

### 3. Setup Frontend

```bash
cd ../client
npm install
```

### 4. Run Development Servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```
> Server starts at **http://localhost:5000**

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```
> Client starts at **http://localhost:3000**

---

## 🔗 API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/services` | List all government services |
| `GET` | `/api/regions` | List all regions/states |
| `GET` | `/api/offices` | List all offices |
| `GET` | `/api/offices/by-service/:serviceId` | Offices for a service (filter by `regionId`) |
| `GET` | `/api/slots?officeId=&serviceId=&date=&tz=` | Available time slots (timezone-aware) |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register citizen |
| `POST` | `/api/auth/login` | Citizen login |
| `POST` | `/api/auth/admin/signup` | Register admin |
| `POST` | `/api/auth/admin/login` | Admin login |
| `GET` | `/api/auth/me` | Get current user session |
| `POST` | `/api/auth/logout` | Logout |

### Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/appointments` | Book new appointment |
| `GET` | `/api/appointments/:id` | Get by ID |
| `GET` | `/api/appointments/by-phone/:phone` | Lookup by phone |
| `GET` | `/api/appointments/by-token/:token` | Lookup by token |
| `PUT` | `/api/appointments/:id/reschedule` | Reschedule |
| `PUT` | `/api/appointments/:id/cancel` | Cancel |
| `PUT` | `/api/appointments/:id/checkin` | Check-in at office |

### Live Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/queue/:officeId` | Live queue (sorted: serving → called → waiting → completed) |
| `GET` | `/api/queue/:officeId/stats` | Queue stats (total, waiting, serving, completed, no-show) |

### Admin (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/call-next` | Call next token in queue |
| `POST` | `/api/admin/complete` | Mark token as completed |
| `POST` | `/api/admin/skip` | Skip a token |
| `POST` | `/api/admin/requeue` | Re-queue a skipped token |
| `POST` | `/api/admin/no-show` | Mark as no-show |
| `POST` | `/api/admin/walk-in` | Register walk-in visitor |
| `PUT` | `/api/admin/slot-capacity` | Update slot capacity |
| `GET` | `/api/admin/sms-log` | View SMS notification log |
| `GET` | `/api/admin/appointments/all` | All appointments (filter by date/office) |

---

## 📊 Data Models (MongoDB)

### Appointment
```js
{
  name, phone, serviceId, officeId, date, timeSlot,
  token, status, type, bookedByUserId, createdAt
}
// status: confirmed | checked-in | completed | cancelled | no-show
// type: booked | walk-in
```

### QueueToken
```js
{
  token, appointmentId, officeId, serviceId, date, timeSlot,
  status, type, name, phone, calledAt, completedAt, noShowAt
}
// status: waiting | called | serving | completed | skipped | no-show | cancelled
```

### User / Admin
```js
{ name, email, phone, passwordHash }
```

---

## 🌐 Services & Coverage

### Available Services (6)
| # | Service | Avg. Time |
|---|---------|-----------|
| 1 | 🛂 Passport | 15 min |
| 2 | 🚗 Driving License | 10 min |
| 3 | 📄 Birth Certificate | 8 min |
| 4 | 🏠 Property Registration | 20 min |
| 5 | 💰 Income Certificate | 10 min |
| 6 | 🪪 Aadhaar Update | 12 min |

### Regions (4 States, 24 Offices)
| Region | Cities | Offices |
|--------|--------|---------|
| 🏛️ Delhi NCR | New Delhi, Noida, Gurgaon, Faridabad, Ghaziabad | 6 |
| 🌆 Maharashtra | Mumbai, Pune, Nagpur, Nashik | 6 |
| 🌴 Karnataka | Bangalore, Mysore, Mangalore, Hubli | 6 |
| 🏜️ Rajasthan | Jaipur, Jodhpur, Udaipur, Kota | 6 |

---

## 🔄 Real-time Architecture

```
┌──────────────┐     WebSocket      ┌──────────────┐
│   Client A   │◄──────────────────►│              │
│  (Citizen)   │   Socket.io        │              │
└──────────────┘                    │   Express    │
                                    │   Server     │
┌──────────────┐   HTTP + WS        │              │     ┌──────────┐
│   Client B   │◄──────────────────►│              │◄───►│ MongoDB  │
│   (Admin)    │                    │              │     └──────────┘
└──────────────┘                    └──────────────┘

Events: queue-updated, token-called, appointment-booked
```

