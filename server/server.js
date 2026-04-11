// ============================================
// MAIN SERVER – Express + Socket.io + MongoDB
// ============================================
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

// Global Mongoose config: always include virtual 'id' and strip __v
mongoose.set('toJSON', { virtuals: true, versionKey: false });
mongoose.set('toObject', { virtuals: true, versionKey: false });

const servicesRouter = require('./routes/services');
const appointmentsRouter = require('./routes/appointments');
const queueRouter = require('./routes/queue');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');

// Seed helper
const Admin = require('./models/Admin');
const store = require('./data/store');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

// Middleware
// NOTE: After deploying to Vercel, replace '*' with your actual Vercel URL
// e.g. cors({ origin: ['http://localhost:3000', 'https://your-app.vercel.app'] })
app.use(cors({ origin: '*' }));
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

// ---------- SEED DEFAULT ADMIN ----------
async function seedDefaultAdmin() {
  const existing = await Admin.findOne({ email: 'admin@govqueue.com' });
  if (!existing) {
    await Admin.create({
      name: 'Super Admin',
      email: 'admin@govqueue.com',
      password: store.hashPassword('admin123'),
      officeId: 'off-1',
      role: 'admin',
    });
    console.log('🌱 Default admin seeded (admin@govqueue.com / admin123)');
  }
}

// ---------- CONNECT TO MONGODB & START ----------
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/govqueue';
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await seedDefaultAdmin();
    server.listen(PORT, () => {
      console.log(`\n🏛️  GovQueue Backend running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready\n`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
