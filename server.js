const app = require('./app');
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('🔄 Initializing server...');
   
    // Wait for database connection to be established
    // Your app.js contains the DB connection logic
    await waitForDatabaseConnection();
   
    // Only start the HTTP server AFTER DB is ready
    const server = app.listen(PORT, (err) => {
      if (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
      }
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    });

    // Add server error handling
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        console.log('✅ HTTP server closed');
       
        // Close database connection
        const mongoose = require('mongoose');
        try {
          await mongoose.connection.close();
          console.log('✅ Database connection closed');
          console.log('✅ Process terminated');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error closing database connection:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

async function waitForDatabaseConnection() {
  const mongoose = require('mongoose');
 
  return new Promise((resolve, reject) => {
    // If already connected, resolve immediately
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Database already connected');
      return resolve();
    }
   
    // Wait for connection to be established
    mongoose.connection.once('open', () => {
      console.log('✅ Database connection established');
      resolve();
    });
   
    mongoose.connection.once('error', (err) => {
      console.error('❌ Database connection error:', err);
      reject(err);
    });
   
    // Timeout after 15 seconds
    setTimeout(() => {
      reject(new Error('❌ Database connection timeout (15s)'));
    }, 15000);
  });
}

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
module.exports = { startServer };