require('dotenv').config();

module.exports = {
  sessionSecret: process.env.SESSION_SECRET || 'military-maintenance-secret-key-change-in-production',
  sessionConfig: {
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sessionId'
  },
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // limit each IP to 5 login attempts per windowMs
    }
  }
};
