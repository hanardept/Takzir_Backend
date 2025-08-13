const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models - you'll need to adjust paths based on your actual model locations
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Command = require('../models/Command');
const Unit = require('../models/Unit');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Sample data
const commands = [
  { name: 'פקמ"ז', description: 'פיקוד המחוז' },
  { name: 'פקע"א', description: 'פיקוד עורף אזרחי' },
  { name: 'צה"ל', description: 'צבא הגנה לישראל' },
  { name: 'משטרה', description: 'משטרת ישראל' },
  { name: 'כב"ה', description: 'כבאות והצלה' }
];

const units = [
  { name: 'מרפ"א 8282', commandName: 'פקמ"ז', description: 'מרכז רפואי' },
  { name: 'יחש"ם 650 ג\'וליס', commandName: 'פקמ"ז', description: 'יחידת חשמל' },
  { name: 'יחזק"א 441', commandName: 'פקמ"ז', description: 'יחידת חזקה' },
  { name: 'מג"ד 331', commandName: 'פקע"א', description: 'מגד עורף' },
  { name: 'חטיבת גולני', commandName: 'צה"ל', description: 'חטיבת חי"ר' },
  { name: 'תחנת ירושלים', commandName: 'משטרה', description: 'תחנת משטרה' },
  { name: 'תחנה מרכז', commandName: 'כב"ה', description: 'תחנת כיבוי' }
];

const users = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    command: 'פקמ"ז',
    unit: 'מרפ"א 8282'
  },
  {
    username: 'technician1',
    password: 'tech123',
    role: 'technician',
    command: 'פקמ"ז',
    unit: 'יחש"ם 650 ג\'וליס'
  },
  {
    username: 'technician2',
    password: 'tech123',
    role: 'technician',
    command: 'פקע"א',
    unit: 'מג"ד 331'
  },
  {
    username: 'viewer1',
    password: 'view123',
    role: 'viewer',
    command: 'צה"ל',
    unit: 'חטיבת גולני'
  }
];

const sampleTickets = [
  {
    ticketNumber: 5335,
    command: 'פקמ"ז',
    unit: 'מרפ"א 8282',
    priority: 'דחופה',
    status: 'בטיפול',
    isRecurring: false,
    description: 'תקלה במערכת המיזוג במבנה A - הטמפרטורה עולה מעל 30 מעלות',
    openDate: new Date('2025-01-15T08:30:00'),
    createdBy: 'technician1',
    assignedTechnician: 'technician1'
  },
  {
    ticketNumber: 5334,
    command: 'פקמ"ז',
    unit: 'יחש"ם 650 ג\'וליס',
    priority: 'מבצעית',
    status: 'פתוח',
    isRecurring: true,
    description: 'הפסקת חשמל חוזרת בקו הראשי - נדרשת בדיקה מיידית של הטרנספורמטור',
    openDate: new Date('2025-01-14T14:15:00'),
    createdBy: 'technician1'
  },
  {
    ticketNumber: 5333,
    command: 'פקע"א',
    unit: 'מג"ד 331',
    priority: 'רגילה',
    status: 'תוקן',
    isRecurring: false,
    description: 'החלפת נורות שרופות במסדרון הראשי',
    openDate: new Date('2025-01-13T11:20:00'),
    closeDate: new Date('2025-01-13T15:45:00'),
    createdBy: 'technician2',
    assignedTechnician: 'technician2'
  }
];

// Seed functions
async function seedCommands() {
  try {
    await Command.deleteMany({});
    console.log('Cleared existing commands');
    
    const createdCommands = await Command.insertMany(commands);
    console.log(`Created ${createdCommands.length} commands`);
    
    return createdCommands;
  } catch (error) {
    console.error('Error seeding commands:', error);
  }
}

async function seedUnits(createdCommands) {
  try {
    await Unit.deleteMany({});
    console.log('Cleared existing units');
    
    const unitsWithIds = units.map(unit => {
      const command = createdCommands.find(c => c.name === unit.commandName);
      return {
        ...unit,
        commandId: command._id
      };
    });
    
    const createdUnits = await Unit.insertMany(unitsWithIds);
    console.log(`Created ${createdUnits.length} units`);
    
    return createdUnits;
  } catch (error) {
    console.error('Error seeding units:', error);
  }
}

async function seedUsers() {
  try {
    await User.deleteMany({});
    console.log('Cleared existing users');
    
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 12);
        return {
          ...user,
          password: hashedPassword
        };
      })
    );
    
    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`Created ${createdUsers.length} users`);
    
    return createdUsers;
  } catch (error) {
    console.error('Error seeding users:', error);
  }
}

async function seedTickets() {
  try {
    await Ticket.deleteMany({});
    console.log('Cleared existing tickets');
    
    const createdTickets = await Ticket.insertMany(sampleTickets);
    console.log(`Created ${createdTickets.length} tickets`);
    
    return createdTickets;
  } catch (error) {
    console.error('Error seeding tickets:', error);
  }
}

// Main seed function
async function seedDatabase() {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seeding...');
    
    const createdCommands = await seedCommands();
    const createdUnits = await seedUnits(createdCommands);
    const createdUsers = await seedUsers();
    const createdTickets = await seedTickets();
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`Commands: ${createdCommands.length}`);
    console.log(`Units: ${createdUnits.length}`);
    console.log(`Users: ${createdUsers.length}`);
    console.log(`Tickets: ${createdTickets.length}`);
    
    console.log('\n👤 Default users created:');
    console.log('Admin: admin / admin123');
    console.log('Technician 1: technician1 / tech123');
    console.log('Technician 2: technician2 / tech123');
    console.log('Viewer: viewer1 / view123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
