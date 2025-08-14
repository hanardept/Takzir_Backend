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

// CORS configuration - MUST BE FIRST (before any other middleware)
app.use(cors({
   origin: [
    'http://localhost:3001', // Keep for development
    'https:/takzir-95a86.web.app',
    'https://takzir-95a86.firebaseapp.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Body parsing middleware (after CORS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration (before security middleware)
app.use(session({
  secret: process.env.SESSION_SECRET || 'military-maintenance-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Important for cross-origin requests
  },
  name: 'sessionId'
}));

// Security middleware (after session)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:3001"],
    },
  },
}));

// Rate limiting (after security middleware)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'יותר מדי בקשות, נסה שוב מאוחר יותר'
  }
});
app.use('/api/', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: {
    success: false,
    message: 'יותר מדי נסיונות התחברות, נסה שוב מאוחר יותר'
  }
});
app.use('/api/auth/login', authLimiter);

// Route imports
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const commandRoutes = require('./routes/commands');
const importRoutes = require('./routes/import');

// API routes (after all middleware)
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/import', importRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'נתונים לא תקינים',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'נתון כבר קיים במערכת'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'שגיאה כללית במערכת'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'נתיב לא נמצא'
  });
});

module.exports = app;
