const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const socketHandler = require('./sockets/socket.handler');
const { errorHandler, notFound } = require('./middleware/error.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const farmerRoutes = require('./routes/farmer.routes');
const centreRoutes = require('./routes/centre.routes');
const bookingRoutes = require('./routes/booking.routes');
const queueRoutes = require('./routes/queue.routes');
const procurementRoutes = require('./routes/procurement.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const officerRoutes = require('./routes/officer.routes');
const adminRoutes = require('./routes/admin.routes');
const cropRoutes = require('./routes/crop.routes');
const staffRoutes = require('./routes/staff.routes');
const aiRoutes = require('./routes/ai.routes');
const stateProposalRoutes = require('./routes/stateProposal.routes');

const app = express();
const server = http.createServer(app);
const envClientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const staticAllowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://kisanconnect.ankur007.me',
  'https://kisanconnectserver.vercel.app',
  'https://sih-omega-three.vercel.app',
  'https://sih-duw3.vercel.app',
  ...envClientUrls,
]);

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);

  const cleanOrigin = origin.replace(/\/$/, '');

  if (
    staticAllowedOrigins.has(cleanOrigin) ||
    cleanOrigin.endsWith('.ankur007.me') ||
    cleanOrigin.endsWith('.vercel.app')
  ) {
    return callback(null, true);
  }

  console.warn(`[CORS Blocked] Origin: ${origin}`);
  return callback(null, false);
};

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible in routes
app.set('io', io);

// Connect DB
connectDB();

// Explicit CORS header middleware for Vercel serverless / edge compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (staticAllowedOrigins.has(origin.replace(/\/$/, '')) ||
      origin.endsWith('.ankur007.me') ||
      origin.endsWith('.vercel.app'))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, Accept'
    );
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);
app.options('*', cors());

// Parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (minimal in production)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    name: 'Kisan Procurement Connect API Server',
    webAppUrl: 'http://localhost:5173',
    message: 'Frontend Web App is running on http://localhost:5173. API endpoints are located under /api',
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Kisan Procurement Connect API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/centres', centreRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/procurements', procurementRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/state-proposals', stateProposalRoutes);

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

// Initialize Socket.IO handler
socketHandler(io);

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`\n🚀 Kisan Procurement Connect Server`);
    console.log(`   Running on: http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API Docs: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = process.env.VERCEL ? app : { app, server };
