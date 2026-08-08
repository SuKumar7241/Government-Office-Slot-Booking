# 🏛️ GovQueue – Smart Government Queue Management System

<div align="center">

**Book. Track. Skip the Queue.**

A modern, full-stack government appointment booking and real-time queue management platform that eliminates long physical lines at government offices. Built with **React 19**, **Node.js**, **Express**, **MongoDB (Mongoose)**, and **Socket.io**.

[![Built for CodeQuest Hackathon](https://img.shields.io/badge/Hackathon-CodeQuest%202026-blue?style=for-the-badge&logo=codeforces)](https://github.com/SuKumar7241/Government-Office-Slot-Booking)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%208-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%2B%20Mongoose-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![Socket.io](https://img.shields.io/badge/Realtime-Socket.io%204-010101?style=for-the-badge&logo=socket.io)](https://socket.io)


</div>

---

## 📋 Table of Contents
1. [Project Overview & Core Mission](#-project-overview--core-mission)
2. [Key Architecture & Features Summary](#-key-architecture--features-summary)
3. [Deep-Dive: Authentication System](#-deep-dive-authentication-system)
4. [Deep-Dive: Real-Time Live Queue Engine](#-deep-dive-real-time-live-queue-engine)
5. [Exhaustive File-by-File Codebase Analysis](#-exhaustive-file-by-file-codebase-analysis)
   - [Root Files](#1-root-workspace-files)
   - [Server / Backend Files](#2-server--backend-files)
   - [Client / Frontend Files](#3-client--frontend-files)
6. [Data Schema & Models](#-data-schema--models)
7. [API Endpoints Reference](#-api-endpoints-reference)
8. [Relevant vs. Non-Relevant / Extra Files Context](#-relevant-vs-non-relevant--extra-files-context)
9. [Installation & Local Setup Guide](#-installation--local-setup-guide)

---

## 🎯 Project Overview & Core Mission

Government offices (Passport Kendras, RTOs, Municipalities, Property Registrations) frequently suffer from overcrowded waiting areas, long physical queues, unpredictable waiting times, and inefficient manual ticketing.

**GovQueue** solves these problems by providing:
- 📅 **Online Appointment Scheduling**: Citizens can select a government service, state/region, specific office, and a 30-minute time slot to get a guaranteed token (`GQ-xxx`).
- ⚡ **Real-Time Live Queue Tracking**: Citizens and administrators see instantaneous status updates (`waiting`, `called`, `serving`, `completed`, `skipped`, `no-show`) driven by WebSockets (Socket.io) and REST fallbacks.
- 🚶 **Hybrid Walk-In & Appointment Queue**: Administrators can register walk-in visitors on-site while seamlessly integrating them into the active scheduled queue.
- 📱 **Automated SMS Notification Service**: Citizens receive mock SMS alerts on booking, when they are next in line, and when their token is called.

---

## 💡 Key Architecture & Features Summary

```
                 ┌────────────────────────────────────────────────────────┐
                 │                 React 19 + Vite 8 SPA                  │
                 │   (Tailwind CSS 4, React Router 7, React-Leaflet)      │
                 └───────────────┬────────────────────────┬───────────────┘
                                 │                        │
                    HTTP / REST  │                        │ WebSockets
                    (Axios API)  │                        │ (Socket.io)
                                 ▼                        ▼
                 ┌────────────────────────────────────────────────────────┐
                 │             Node.js / Express Backend Server           │
                 │   (Auth, Appointments, Queue Management, Admin, SMS)   │
                 └───────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
                 ┌────────────────────────────────────────────────────────┐
                 │             MongoDB Database (via Mongoose 9)          │
                 │   (Users, Admins, Sessions, Appointments, Tokens, SMS) │
                 └────────────────────────────────────────────────────────┘
```

---

## 🔐 Deep-Dive: Authentication System

GovQueue features a **dual-role, session-based authentication system** built from scratch without external opaque auth services.

### 1. Dual Roles & Account Types
- **Citizens (`role: 'user'`)**: Registered citizens can book appointments, track personal queues, view history, check in, and reschedule.
- **Administrators (`role: 'admin'`)**: Office admins assigned to a specific office (`officeId`) can advance queues ("Call Next"), skip no-shows, register walk-ins, and adjust office capacities.

### 2. Password Security & Hashing
- Passwords are never stored in plain text.
- Standardized SHA-256 password hashing is executed via Node's native `crypto` module:
  ```js
  function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
  ```

### 3. Session Token Architecture & Persistence
- Upon successful login or signup, a unique session token is generated using a combination of UUID v4 and a base-36 timestamp:
  ```js
  function generateSessionToken() {
    return uuidv4() + '-' + Date.now().toString(36);
  }
  ```
- **MongoDB Session Model** stores `{ token, userId, role }` with a unique index on `token`.
- **Client Storage**: The token is saved in the browser's `localStorage` (`govqueue_token`) along with basic user details (`govqueue_user`).

### 4. Axios Request & Response Interceptors ([client/src/api.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/api.js))
- **Request Interceptor**: Automatically attaches `Authorization: Bearer <token>` to every outgoing HTTP request header.
- **Response Interceptor**: Intercepts HTTP `401 Unauthorized` responses. If a session expires or is invalidated on the server, the interceptor clears `localStorage` and smoothly redirects the user to `/login`.

### 5. React Auth Context & State Management ([client/src/context/AuthContext.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/context/AuthContext.jsx))
- Wraps the entire application tree.
- On initial page load/mount, fires a session validation request (`GET /api/auth/me`).
- Exposes `user`, `loading`, `login()`, `signup()`, `logout()`, `isAuthenticated`, `isAdmin`, and `isUser` helper methods across the React component tree.

### 6. Route Protection ([client/src/components/ProtectedRoute.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/components/ProtectedRoute.jsx))
- Protects private routes (`/dashboard`, `/book`, `/my-appointments`, `/queue`, `/admin`).
- Verifies session state and role permissions before rendering target components; redirects unauthorized users to `/login` or `/admin/login`.

---

## ⚡ Deep-Dive: Real-Time Live Queue Engine

The Live Queue Engine is the core innovation of GovQueue, keeping citizens informed without physical standing.

### 1. Hybrid Queue Management (Booked + Walk-Ins)
- Both scheduled appointments (`type: 'booked'`) and walk-in visitors registered by admins (`type: 'walk-in'`) are assigned sequential tokens (e.g., `GQ-101`, `GQ-102`).
- Each token creates a corresponding `QueueToken` document in MongoDB.

### 2. State Machine Lifecycle
Each queue token transitions through a precise state machine:
```
 [ booked / walk-in ]
          │
          ▼
      ( waiting ) ──► [ skipped ] ──► ( requeue )
          │                                │
          ▼ (call-next)                    │
      ( called ) ◄─────────────────────────┘
          │
          ▼ (call-next / serve)
      ( serving )
          │
          ├──► ( completed )  [ Successful Service ]
          └──► ( no-show )    [ Citizen Absent ]
```

### 3. Real-Time Socket.io Synchronization & Event Pipeline
- The backend mounts Socket.io onto the HTTP server.
- Clients connect via WebSocket (with polling fallback) and join room channels based on office location (`socket.join('office-off-1')`).
- **Events Emitted**:
  - `queue-updated`: Fired whenever an admin calls next, completes, skips, re-queues, or adds a walk-in, triggering instant queue re-fetches for all viewing clients.
  - `token-called`: Fired with details of the specific token called.
  - `appointment-booked`: Broadcasts new bookings across office channels.
- **Client Fallback**: `QueueStatus.jsx` and `AdminDashboard.jsx` execute a 5-second polling interval alongside Socket.io listeners to ensure 100% data freshness even during network degradation.

### 4. Dynamic Wait Time & Slot Capacity Algorithms
- **Estimated Wait Time Calculation**:
  $$\text{Wait Time (mins)} = \text{Queue Position} \times \text{Average Service Duration}$$
  Service averages vary by type (e.g., Passport: 15 mins, Driving License: 10 mins, Birth Certificate: 8 mins, Property Registration: 20 mins).
- **Timezone-Aware Past Slot Filtering**:
  When citizens select today's date, `store.getAvailableSlots()` accepts the client's timezone offset (`tz` parameter) to calculate current local minutes and automatically suppress time slots that have already passed in the citizen's timezone.

---

## 📁 Exhaustive File-by-File Codebase Analysis

### 1. Root Workspace Files

#### `README.md`
- **Path**: [README.md](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/README.md)
- **Purpose**: Comprehensive technical documentation, architecture explanation, API guide, and setup instructions for the entire project.

#### `.gitignore`
- **Path**: [.gitignore](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/.gitignore)
- **Purpose**: Standard root Git configuration excluding `node_modules`, build outputs (`dist/`), environment variable files (`.env`), OS artifacts, and log files from source control.

#### `full_app_test_1775744319395.webp`
- **Path**: [full_app_test_1775744319395.webp](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/full_app_test_1775744319395.webp)
- **Purpose**: Visual media artifact recorded during full end-to-end user flow automated testing sessions.

---

### 2. Server / Backend Files (`server/`)

#### `server/server.js`
- **Path**: [server/server.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/server.js)
- **Purpose**: Core application entrypoint for the backend.
- **Key Responsibilities**:
  - Initializes Express application and HTTP server.
  - Attaches Socket.io server instance with CORS wildcard configuration (`*`).
  - Sets global Mongoose JSON transformation rules to automatically transform `_id` into virtual `id` and remove `__v`.
  - Mounts API routers (`/api`, `/api/appointments`, `/api/queue`, `/api/admin`, `/api/auth`).
  - Implements Socket.io connection listeners and `join-office` channel joining logic.
  - Seeds default Super Admin account (`admin@govqueue.com` / `admin123`) on startup if not present.
  - Connects to MongoDB via Mongoose and starts HTTP server on port 5000 (or `process.env.PORT`).

#### `server/.env`
- **Path**: [server/.env](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/.env)
- **Purpose**: Environment configuration file storing sensitive values such as `PORT=5000` and `MONGODB_URI`.

#### `server/package.json` & `server/package-lock.json`
- **Path**: [server/package.json](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/package.json)
- **Purpose**: Node.js project manifest listing server dependencies (`express`, `mongoose`, `socket.io`, `cors`, `dotenv`, `uuid`) and runtime scripts (`npm start`, `npm run dev`).

---

#### 📦 `server/data/`

##### `server/data/store.js`
- **Path**: [server/data/store.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/data/store.js)
- **Purpose**: Static dataset repository and utility helper functions.
- **Contains**:
  - **Regions (4)**: Delhi NCR (`reg-1`), Maharashtra (`reg-2`), Karnataka (`reg-3`), Rajasthan (`reg-4`).
  - **Services (6)**: Passport, Driving License, Birth Certificate, Property Registration, Income Certificate, Aadhaar Update (with icons and average service durations).
  - **Offices (24)**: 6 offices per state mapped to supported service IDs.
  - **Slot Configuration**: Operating hours (9:00 - 17:00), 30-min duration, default capacity per slot (5).
  - **Helper Functions**:
    - `hashPassword(password)`: SHA-256 password hashing.
    - `generateSessionToken()`: Generates random session token string.
    - `generateToken()`: Generates sequential `GQ-101`, `GQ-102` tokens based on DB document count.
    - `generateTimeSlots(date)`: Builds 30-minute interval objects for standard working hours.
    - `getAvailableSlots(officeId, serviceId, date, tz)`: Queries DB bookings, aggregates slot usage, calculates past slots based on client timezone offset, and returns remaining capacity.
    - `estimateWaitTime(serviceId, tokenPosition)`: Multiplies queue position by service average time.

---

#### 🛡️ `server/middleware/`

##### `server/middleware/adminAuth.js`
- **Path**: [server/middleware/adminAuth.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/middleware/adminAuth.js)
- **Purpose**: Route authorization middleware protecting admin endpoints.
- **Workflow**: Reads `Authorization: Bearer <token>` header, queries MongoDB `Session` collection for matching token where `role === 'admin'`, verifies admin user exists in `Admin` collection, and attaches `admin` object to `req.admin`.

---

#### 🗄️ `server/models/`

##### `server/models/User.js`
- **Path**: [server/models/User.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/models/User.js)
- **Schema**: Citizens database schema storing `name`, `email` (unique lowercase), `phone`, `password` (hashed), `role` ('user'), and timestamps.

##### `server/models/Admin.js`
- **Path**: [server/models/Admin.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/models/Admin.js)
- **Schema**: Admin users database schema storing `name`, `email` (unique lowercase), `password` (hashed), `officeId` (assigned office ID), `role` ('admin'), and timestamps.

##### `server/models/Appointment.js`
- **Path**: [server/models/Appointment.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/models/Appointment.js)
- **Schema**: Appointment bookings schema storing `name`, `phone`, `serviceId`, `officeId`, `date`, `timeSlot`, `token` (unique), `status` (`confirmed`, `checked-in`, `completed`, `cancelled`, `no-show`), `type` (`booked`, `walk-in`), `bookedByUserId`, and timestamps. Indexed on `[officeId, serviceId, date]`, `phone`, and `bookedByUserId`.

##### `server/models/QueueToken.js`
- **Path**: [server/models/QueueToken.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/models/QueueToken.js)
- **Schema**: Real-time queue tracker schema storing `token`, `appointmentId`, `officeId`, `serviceId`, `date`, `timeSlot`, `status` (`waiting`, `called`, `serving`, `completed`, `skipped`, `cancelled`, `no-show`), `type` (`booked`, `walk-in`), `name`, `phone`, `calledAt`, `completedAt`, `checkedInAt`, `noShowAt`, and timestamps. Indexed on `[officeId, status, date]`.

##### `server/models/Session.js`
- **Path**: [server/models/Session.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/models/Session.js)
- **Schema**: User & admin session storage schema with unique index on `token`, storing `userId`, `role`, and timestamps.

##### `server/models/SmsLog.js`
- **Path**: [server/models/SmsLog.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/models/SmsLog.js)
- **Schema**: Audit log schema for SMS messages sent by the system (`phone`, `message`, `type`, `status`, timestamps).

---

#### 🛣️ `server/routes/`

##### `server/routes/auth.js`
- **Path**: [server/routes/auth.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/routes/auth.js)
- **Endpoints**:
  - `POST /api/auth/user/signup`: Registers citizen account, creates session, returns token.
  - `POST /api/auth/user/login`: Validates citizen credentials, creates session.
  - `POST /api/auth/admin/signup`: Registers administrative account.
  - `POST /api/auth/admin/login`: Validates admin credentials.
  - `GET /api/auth/me`: Validates session token in Bearer header and returns account info.
  - `POST /api/auth/logout`: Deletes session token from MongoDB.

##### `server/routes/queue.js`
- **Path**: [server/routes/queue.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/routes/queue.js)
- **Endpoints**:
  - `GET /api/queue/:officeId`: Fetches active queue tokens sorted by status order (`serving` -> `called` -> `waiting`), calculates token positions, and attaches estimated wait times.
  - `GET /api/queue/:officeId/stats`: Computes aggregate statistics (total today, waiting, called, serving, completed, skipped, no-show, walk-ins vs booked).

##### `server/routes/admin.js`
- **Path**: [server/routes/admin.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/routes/admin.js) (Protected by `adminAuth`)
- **Endpoints**:
  - `POST /api/admin/call-next`: Advances queue state (serving -> completed, called -> serving, waiting -> called), triggers mock SMS alerts to current and next citizens, and emits Socket.io events (`queue-updated`, `token-called`).
  - `POST /api/admin/complete`: Marks token and linked appointment as completed.
  - `POST /api/admin/skip`: Marks token as skipped and sends SMS alert.
  - `POST /api/admin/requeue`: Resets skipped token back to waiting status at end of queue.
  - `POST /api/admin/no-show`: Marks token as absent/no-show.
  - `POST /api/admin/walk-in`: Registers walk-in visitor, creates `Appointment` and `QueueToken`, emits Socket.io update.
  - `PUT /api/admin/slot-capacity`: Dynamically updates per-slot capacity limit.
  - `GET /api/admin/sms-log`: Fetches recent SMS audit log history.
  - `GET /api/admin/appointments/all`: Fetches filtered list of appointments with enriched service and office names.

##### `server/routes/appointments.js`
- **Path**: [server/routes/appointments.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/routes/appointments.js)
- **Endpoints**:
  - `POST /api/appointments`: Validates name/phone input format, verifies slot availability, creates `Appointment` & `QueueToken`, sends confirmation SMS, and emits Socket.io event.
  - `GET /api/appointments/:id`: Fetches detailed appointment info with queue position.
  - `GET /api/appointments/by-phone/:phone`: Looks up appointments by phone number.
  - `GET /api/appointments/by-user/:userId`: Looks up appointments booked by a user ID.
  - `GET /api/appointments/by-token/:token`: Looks up appointment details by token string (`GQ-101`).
  - `PUT /api/appointments/:id/reschedule`: Reschedules appointment date & time slot.
  - `PUT /api/appointments/:id/cancel`: Cancels appointment and updates queue token.
  - `PUT /api/appointments/:id/checkin`: Marks citizen as checked in upon arrival.

##### `server/routes/services.js`
- **Path**: [server/routes/services.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/routes/services.js)
- **Endpoints**:
  - `GET /api/regions`: Returns all static region entries.
  - `GET /api/services`: Returns available government service catalog.
  - `GET /api/offices`: Returns list of all 24 office locations.
  - `GET /api/offices/by-service/:serviceId`: Returns offices offering specific service.
  - `GET /api/slots`: Computes available time slots for office, service, date, and timezone.

---

#### 🛠️ `server/utils/`

##### `server/utils/sms.js`
- **Path**: [server/utils/sms.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/server/utils/sms.js)
- **Purpose**: Notification service simulator.
- **Workflow**: Logs SMS contents to system console and asynchronously writes log entries to the `SmsLog` collection in MongoDB. Provides helper wrappers for booking confirmation, appointment reminders, and queue turn alerts.

---

### 3. Client / Frontend Files (`client/`)

#### `client/package.json` & `client/package-lock.json`
- **Path**: [client/package.json](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/package.json)
- **Purpose**: React application dependencies (`react`, `react-router-dom`, `axios`, `socket.io-client`, `leaflet`, `react-leaflet`, `lucide-react`, `react-hot-toast`, `tailwindcss`, `vite`).

#### `client/vite.config.js`
- **Path**: [client/vite.config.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/vite.config.js)
- **Purpose**: Vite build tool configuration with React plugin and development server API proxying.

#### `client/vercel.json`
- **Path**: [client/vercel.json](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/vercel.json)
- **Purpose**: Single Page Application (SPA) route rewrite configuration for deployment on Vercel (`"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]`).

#### `client/index.html`
- **Path**: [client/index.html](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/index.html)
- **Purpose**: Master HTML template importing Google Fonts (Inter) and serving as root mounting target for React.

#### `client/src/main.jsx`
- **Path**: [client/src/main.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/main.jsx)
- **Purpose**: Client entrypoint rendering `<App />` wrapped inside `BrowserRouter` and `AuthProvider`.

#### `client/src/App.jsx`
- **Path**: [client/src/App.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/App.jsx)
- **Purpose**: Main layout component defining client-side route tree (`/`, `/login`, `/signup`, `/admin/login`, `/admin/signup`, `/dashboard`, `/book`, `/confirmation/:id`, `/my-appointments`, `/queue`, `/admin`), `<Navbar />`, and global `<Toaster />` notification container.

#### `client/src/index.css`
- **Path**: [client/src/index.css](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/index.css)
- **Purpose**: Global CSS stylesheet importing Tailwind CSS 4, defining CSS custom properties (`--gov-primary: #1e3a8a`, `--gov-bg: #f8fafc`), and custom keyframe animations (`animate-fade-in-up`, `animate-slide-down`).

#### `client/src/api.js`
- **Path**: [client/src/api.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/api.js)
- **Purpose**: Configured Axios instance with `VITE_API_URL` baseURL, request token injection header, and global `401 Unauthorized` handling.

#### `client/src/socket.js`
- **Path**: [client/src/socket.js](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/socket.js)
- **Purpose**: Singleton Socket.io client instance connected to backend server URL supporting WebSocket and polling transports.

---

#### 🧩 `client/src/context/`

##### `client/src/context/AuthContext.jsx`
- **Path**: [client/src/context/AuthContext.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/context/AuthContext.jsx)
- **Purpose**: Authentication React Context provider maintaining active user state, session validation, login/signup API handlers, local storage syncing, and role verification helpers.

---

#### 🧩 `client/src/components/`

##### `client/src/components/ProtectedRoute.jsx`
- **Path**: [client/src/components/ProtectedRoute.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/components/ProtectedRoute.jsx)
- **Purpose**: Route guard wrapper component ensuring users are logged in and hold required roles (`user` or `admin`) before displaying protected page content.

##### `client/src/components/Navbar.jsx`
- **Path**: [client/src/components/Navbar.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/components/Navbar.jsx)
- **Purpose**: Top navigation bar featuring brand logo, dynamic links based on user authentication state and role, user profile dropdown menu, and responsive mobile drawer navigation.

##### `client/src/components/MapSection.jsx`
- **Path**: [client/src/components/MapSection.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/components/MapSection.jsx)
- **Purpose**: Interactive map component powered by Leaflet and OpenStreetMap rendering markers for Delhi NCR government office locations with popup tooltips.

---

#### 📄 `client/src/pages/`

##### `client/src/pages/Home.jsx`
- **Path**: [client/src/pages/Home.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/Home.jsx)
- **Purpose**: Landing page displaying hero section, key platform metrics, 5-step booking process infographic, government services catalog grid, office location map, citizen reviews, and call-to-action banners.

##### `client/src/pages/UserLogin.jsx` & `client/src/pages/UserSignup.jsx`
- **Paths**: [UserLogin.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/UserLogin.jsx) | [UserSignup.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/UserSignup.jsx)
- **Purpose**: Authentication forms for citizens to create accounts or log in using email, phone number, and password, redirecting to `/dashboard`.

##### `client/src/pages/AdminLogin.jsx` & `client/src/pages/AdminSignup.jsx`
- **Paths**: [AdminLogin.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/AdminLogin.jsx) | [AdminSignup.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/AdminSignup.jsx)
- **Purpose**: Authentication forms for government office administrators, including quick-fill buttons for default super admin credentials (`admin@govqueue.com` / `admin123`).

##### `client/src/pages/UserDashboard.jsx`
- **Path**: [client/src/pages/UserDashboard.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/UserDashboard.jsx)
- **Purpose**: Citizen portal homepage showcasing personalized greeting, profile details, quick navigation cards, appointment status counters, and upcoming booking list.

##### `client/src/pages/BookAppointment.jsx`
- **Path**: [client/src/pages/BookAppointment.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/BookAppointment.jsx)
- **Purpose**: 5-Step interactive appointment booking wizard:
  1. Select Service (Passport, Driving License, etc.)
  2. Select Region/State
  3. Select Government Office Location
  4. Pick Appointment Date & Available Time Slot
  5. Fill / Review Citizen Contact Details & Confirm Booking

##### `client/src/pages/BookingConfirmation.jsx`
- **Path**: [client/src/pages/BookingConfirmation.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/BookingConfirmation.jsx)
- **Purpose**: Confirmation screen displayed after successful booking showing assigned token badge (`GQ-xxx`), booking details summary, estimated queue wait time, office location, and action buttons to track queue or print token.

##### `client/src/pages/MyAppointments.jsx`
- **Path**: [client/src/pages/MyAppointments.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/MyAppointments.jsx)
- **Purpose**: Appointment management tabbed interface allowing citizens to view active/past bookings, check in upon arrival at the office, reschedule time slots, or cancel bookings.

##### `client/src/pages/QueueStatus.jsx`
- **Path**: [client/src/pages/QueueStatus.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/QueueStatus.jsx)
- **Purpose**: Public real-time queue tracking dashboard:
  - Office location selector dropdown
  - Real-time statistics counters (Total Today, Waiting, Now Serving, Completed, No Show)
  - Animated "Now Serving" and "Called" banners
  - Interactive live queue table displaying token numbers, citizen names, services, types (booked vs walk-in), statuses, and calculated estimated wait times.
  - Automatically updates via Socket.io events and 5-second HTTP polling interval.

##### `client/src/pages/AdminDashboard.jsx`
- **Path**: [client/src/pages/AdminDashboard.jsx](file:///c:/Users/Sumitsaini/Desktop/CodequestHakathon/client/src/pages/AdminDashboard.jsx)
- **Purpose**: Comprehensive office administration control panel featuring 4 main tabs:
  1. **Dashboard**: Call Next in queue, complete token, skip token, re-queue token, mark no-show, filter by service/date, view appointments list.
  2. **Time Slots**: Adjust maximum capacity limit per slot.
  3. **Walk-Ins**: Register walk-in visitors on-site and assign time slots.
  4. **SMS Log**: Inspect real-time audit log of system SMS notifications.

---

## 📊 Data Schema & Models

```
   ┌──────────────────┐               ┌──────────────────┐
   │       User       │               │      Admin       │
   ├──────────────────┤               ├──────────────────┤
   │ _id              │               │ _id              │
   │ name             │               │ name             │
   │ email (unique)   │               │ email (unique)   │
   │ phone            │               │ password (hash)  │
   │ password (hash)  │               │ officeId         │
   │ role ('user')    │               │ role ('admin')   │
   └────────┬─────────┘               └────────┬─────────┘
            │                                  │
            │          ┌───────────┐           │
            └─────────►│  Session  │◄──────────┘
                       ├───────────┤
                       │ token     │
                       │ userId    │
                       │ role      │
                       └───────────┘

   ┌─────────────────────────┐        ┌─────────────────────────┐
   │       Appointment       │        │       QueueToken        │
   ├─────────────────────────┤        ├─────────────────────────┤
   │ _id                     │1      1│ _id                     │
   │ name, phone             ├───────►│ token (GQ-xxx)          │
   │ serviceId, officeId     │        │ appointmentId           │
   │ date, timeSlot          │        │ officeId, serviceId     │
   │ token (unique)          │        │ date, timeSlot          │
   │ status (confirmed, ...) │        │ status (waiting, ...)   │
   │ type (booked, walk-in)  │        │ type (booked, walk-in)  │
   │ bookedByUserId          │        │ calledAt, completedAt...│
   └─────────────────────────┘        └─────────────────────────┘
```

---

## 🌐 API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/auth/user/signup` | Register new citizen account | Public |
| `POST` | `/api/auth/user/login` | Login citizen | Public |
| `POST` | `/api/auth/admin/signup` | Register office admin | Public |
| `POST` | `/api/auth/admin/login` | Login office admin | Public |
| `GET`  | `/api/auth/me` | Fetch authenticated session profile | Authenticated |
| `POST` | `/api/auth/logout` | Terminate session | Authenticated |

### Catalog & Slots (`/api`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET`  | `/api/regions` | Get list of all regions | Public |
| `GET`  | `/api/services` | Get list of government services | Public |
| `GET`  | `/api/offices` | Get list of all office locations | Public |
| `GET`  | `/api/offices/by-service/:serviceId` | Get offices supporting a service | Public |
| `GET`  | `/api/slots` | Get calculated available time slots | Public |

### Appointments (`/api/appointments`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/appointments` | Book new appointment | User |
| `GET`  | `/api/appointments/:id` | Get appointment details by ID | User |
| `GET`  | `/api/appointments/by-phone/:phone` | Lookup appointments by phone | User |
| `GET`  | `/api/appointments/by-user/:userId` | Lookup user's appointment history | User |
| `GET`  | `/api/appointments/by-token/:token` | Lookup appointment by token string | User |
| `PUT`  | `/api/appointments/:id/reschedule` | Reschedule appointment date/time | User |
| `PUT`  | `/api/appointments/:id/cancel` | Cancel appointment | User |
| `PUT`  | `/api/appointments/:id/checkin` | Check in at office location | User |

### Queue Tracking (`/api/queue`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `GET`  | `/api/queue/:officeId` | Fetch active live queue for office | Public |
| `GET`  | `/api/queue/:officeId/stats` | Fetch aggregate queue statistics | Public |

### Admin Operations (`/api/admin`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| `POST` | `/api/admin/call-next` | Advance queue to call next citizen | Admin |
| `POST` | `/api/admin/complete` | Mark token as completed | Admin |
| `POST` | `/api/admin/skip` | Skip token in queue | Admin |
| `POST` | `/api/admin/requeue` | Re-queue skipped token | Admin |
| `POST` | `/api/admin/no-show` | Mark token as absent/no-show | Admin |
| `POST` | `/api/admin/walk-in` | Register walk-in visitor | Admin |
| `PUT`  | `/api/admin/slot-capacity` | Update slot capacity limit | Admin |
| `GET`  | `/api/admin/sms-log` | Fetch SMS audit log | Admin |
| `GET`  | `/api/admin/appointments/all` | Fetch office appointments list | Admin |

---

## 🔍 Relevant vs. Non-Relevant / Extra Files Context

To ensure complete clarity on every asset in the repository:

### Core Relevant Files (Essential for Production Execution)
- All `.js` files under `server/` (`server.js`, `models/*`, `routes/*`, `middleware/*`, `utils/*`, `data/*`).
- All `.jsx`, `.js`, and `.css` files under `client/src/` (`App.jsx`, `main.jsx`, `api.js`, `socket.js`, `index.css`, `components/*`, `context/*`, `pages/*`).
- Configuration manifests (`server/package.json`, `client/package.json`, `client/vite.config.js`, `client/vercel.json`, `client/index.html`).

### Operational / Contextual Files
- `.env`: Holds local runtime environment configuration (`PORT`, `MONGODB_URI`). Essential for running locally, but ignored in version control for security.
- `store.js` static data vs MongoDB: Static reference data (regions, service list, office master locations) resides in `store.js` for fast lookup, while dynamic records (Users, Admins, Sessions, Appointments, QueueTokens, SmsLogs) are stored persistently in MongoDB.

### Non-Relevant / Supporting Files
- `full_app_test_1775744319395.webp`: Large binary WebP image artifact recorded during browser subagent automated test sessions. Non-executable, purely used for visual verification.
- `client/dist/` and `client/node_modules/`: Local build output directories and installed package binaries. Excluded via `.gitignore`.

---

## 💻 Installation & Local Setup Guide

Follow these steps to run GovQueue on your local system:

### Prerequisites
- **Node.js** v18+ or v20+
- **MongoDB** running locally on default port `27017` or a MongoDB Atlas URI

### Step 1: Clone Repository
```bash
git clone https://github.com/SuKumar7241/Government-Office-Slot-Booking.git
cd Government-Office-Slot-Booking
```

### Step 2: Set Up Backend Server
```bash
cd server
npm install
```
*(Optional)* Create a `.env` file inside `server/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/govqueue
```
Start backend server:
```bash
npm run dev
# Server runs on http://localhost:5000
```
*Note: A default super admin is automatically seeded on startup:*
- **Email**: `admin@govqueue.com`
- **Password**: `admin123`

### Step 3: Set Up Frontend Client
In a new terminal window:
```bash
cd client
npm install
npm run dev
# React app opens on http://localhost:5173
```

---

<<<<<<< HEAD
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

=======
<div align="center">
  <sub>Developed with ❤️ for CodeQuest Hackathon 2026</sub>
</div>
>>>>>>> b983699 (feat: complete UI/UX redesign and full-width layout updates)
