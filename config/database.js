const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // ← Increase from 5000
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000, // ← Add this
      heartbeatFrequencyMS: 2000, // ← Add this for better connection monitoring
    });

    console.log(`MongoDB Atlas מחובר: ${conn.connection.host}`);
    
    // Add connection error handlers
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    await createIndexes();
  } catch (error) {
    console.error('שגיאה בחיבור למסד הנתונים:', error.message);
    process.exit(1);
  }
};


const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Tickets collection indexes
    await db.collection('tickets').createIndex({ ticketNumber: 1 }, { unique: true });
    await db.collection('tickets').createIndex({ command: 1, unit: 1 });
    await db.collection('tickets').createIndex({ status: 1 });
    await db.collection('tickets').createIndex({ priority: 1 });
    await db.collection('tickets').createIndex({ openDate: -1 });
    await db.collection('tickets').createIndex({ isDeleted: 1 });
    
    // Users collection indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ command: 1, unit: 1 });
    await db.collection('users').createIndex({ isActive: 1 });
    
    // Commands collection indexes
    await db.collection('commands').createIndex({ name: 1 }, { unique: true });
    
    // Units collection indexes
    await db.collection('units').createIndex({ name: 1, commandId: 1 }, { unique: true });
    
    console.log('אינדקסים נוצרו בהצלחה');
  } catch (error) {
    console.error('שגיאה ביצירת אינדקסים:', error.message);
  }
};

module.exports = connectDB;
