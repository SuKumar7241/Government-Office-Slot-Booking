// ============================================
// MAIN SERVER – Express + Socket.io
// ============================================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const servicesRouter = require('./routes/services');
const appointmentsRouter = require('./routes/appointments');
const queueRouter = require('./routes/queue');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

// Middleware
app.use(cors());
app.use(express.json());

// Attach io to app so routes can access it
app.set('io', io);

// Routes
app.use('/api', servicesRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join-office', (officeId) => {
    socket.join(`office-${officeId}`);
    console.log(`📍 ${socket.id} joined office-${officeId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🏛️  GovQueue Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready\n`);
});
