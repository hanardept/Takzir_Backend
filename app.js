// app.js (backend)

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');

// Initialize Express app FIRST
const app = express();

// Connect to MongoDB
connectDB();

// -------- Environment helpers --------
const isProd = process.env.NODE_ENV === 'production';

// Frontend origins (adjust if you add a custom domain)
const FRONTEND_URLS = [
  'http://localhost:3001',
  'https://takzir-95a86.web.app',
  'https://takzir-95a86.firebaseapp.com',
  'https://takzir-95a86--development-*.web.app'
];

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow Firebase preview channels
      if (!origin || 
          FRONTEND_URLS.includes(origin) || 
          /^https:\/\/takzir-95a86--[\w-]+\.web\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Your public backend URL on Cloud Run (optional but good for CSP connectSrc)
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || ''; // e.g., https://takzir-backend-xxxxx-europe-west4.run.app

// Explicit preflight
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && FRONTEND_URLS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.sendStatus(200);
});

// -------- Body parsing --------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -------- Sessions (before security middleware) --------
app.set('trust proxy', 1); // Needed for secure cookies behind proxies (Cloud Run)

// backend/app.js
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'military-maintenance-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true,                 // ← keeps session alive while user is active
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600,
    }),
    cookie: {
      secure: isProd,              // true only behind HTTPS
      httpOnly: true,
      maxAge: 500 * 60 * 1000,      // 500 minutes active session
      sameSite: isProd ? 'none' : 'lax',
    },
    name: 'sessionId',
  })
);



// -------- Security (Helmet) --------
const cspConnectSrc = [
  "'self'",
  'http://localhost:3001',
  ...FRONTEND_URLS,
];
if (BACKEND_PUBLIC_URL) cspConnectSrc.push(BACKEND_PUBLIC_URL);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: cspConnectSrc,
      },
    },
  })
);

// -------- Rate limiting --------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'יותר מדי בקשות, נסה שוב מאוחר יותר',
  },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'יותר מדי נסיונות התחברות, נסה שוב מאוחר יותר',
  },
});
app.use('/api/auth/login', authLimiter);

// -------- Static files --------
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// -------- Auth middleware --------
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    // For HTML navigation, redirect to login page
    return res.status(401).redirect('/login.html');
  }
  req.user = req.session.user;
  next();
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).redirect('/dashboard');
    }
    next();
  };
}

// -------- API routes --------
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const commandRoutes = require('./routes/commands');
const importRoutes = require('./routes/import');

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/import', importRoutes);

// -------- Health check --------
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// -------- HTML routes (BEFORE error handlers) --------
// Dashboard
app.get('/new-ticket', requireAuth, (req, res) => {
if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'technician')) {
return res.status(403).redirect('/dashboard');
}
res.sendFile(path.join(__dirname, 'views', 'new-ticket.html'));
});

// New ticket (admin + technician)
app.get('/new-ticket', requireAuth, requireRole(['admin', 'technician']), (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'new-ticket.html'));
});

// Tickets list/management
app.get('/tickets', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'tickets.html'));
});

// Users management (admin only)
app.get('/users', requireAuth, requireRole(['admin']), (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'users.html'));
});

// Root redirect
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login.html');
  }
});

// -------- Route listing (debug) --------
console.log('=== REGISTERED ROUTES ===');
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log('Route:', r.route.path);
  } else if (r.name === 'router') {
    console.log('Router middleware found');
  }
});
console.log('========================');

// Add this temporary test endpoint
app.get('/api/test', (req, res) => {
  console.log('TEST ENDPOINT HIT - Server is responding');
  res.json({ 
    success: true, 
    message: 'Backend is working',
    user: req.session?.user?.username || 'Not authenticated',
    timestamp: new Date().toISOString()
  });
});

// -------- Global error handler --------
app.use((err, req, res, next) => {
  console.error('Global error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'נתונים לא תקינים',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'נתון כבר קיים במערכת',
    });
  }

  res.status(500).json({
    success: false,
    message: 'שגיאה כללית במערכת',
  });
});

// -------- 404 (last) --------
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'נתיב לא נמצא',
  });
});

module.exports = app;
