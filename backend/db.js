const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Check if MongoDB URI is provided
const MONGO_URI = process.env.MONGODB_URI || '';
const isMongo = !!MONGO_URI;

// Set up JSON File DB paths
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helpers for JSON Database
const getJsonPath = (collection) => path.join(DATA_DIR, `${collection}.json`);
const readJson = (collection) => {
  const filePath = getJsonPath(collection);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${collection}.json:`, err);
    return [];
  }
};
const writeJson = (collection, data) => {
  const filePath = getJsonPath(collection);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Define Mongoose Schemas if using MongoDB
let MongooseUser, MongooseClub, MongooseReport, MongooseOD, MongooseNotification;

if (isMongo) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

  const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    registrationNumber: { type: String, unique: true, sparse: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    clubName: String,
    designation: String,
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Chairperson'], default: 'Chairperson' },
    createdAt: { type: Date, default: Date.now }
  });
  MongooseUser = mongoose.model('User', UserSchema);

  const ClubSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: String,
    createdAt: { type: Date, default: Date.now }
  });
  MongooseClub = mongoose.model('Club', ClubSchema);

  const ReportSchema = new mongoose.Schema({
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    clubName: { type: String, required: true },
    eventName: { type: String, required: true },
    eventDate: { type: String, required: true }, // Format: YYYY-MM-DD (Start Date)
    eventEndDate: { type: String, required: true }, // Format: YYYY-MM-DD (End Date)
    eventTime: { type: String, required: true },
    venue: { type: String, required: true },
    category: { type: String, required: true },
    categoryOthersSpecify: String,
    reportFilePath: { type: String, required: true },
    numberOfParticipants: { type: Number, required: true },
    facultyCoordinator: { type: String, required: true },
    studentCoordinator: { type: String, required: true },
    description: { type: String, required: true },
    outcome: { type: String, required: true },
    budgetUsed: { type: Number, required: true },
    photos: [String],
    status: { type: String, default: 'Submitted Successfully' },
    hasOD: { type: Boolean, default: false },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  });
  MongooseReport = mongoose.model('Report', ReportSchema);

  const ODListSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true, unique: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    clubName: { type: String, required: true },
    eventName: { type: String, required: true },
    eventDate: { type: String, required: true },
    timeSlot: { type: String, required: true }, // FN, AN, Full Day
    students: [{
      registrationNumber: { type: String, required: true },
      studentName: { type: String, required: true },
      date: { type: String, required: true },
      time: { type: String, required: true }
    }],
    uploadedAt: { type: Date, default: Date.now }
  });
  MongooseOD = mongoose.model('ODList', ODListSchema);

  const NotificationSchema = new mongoose.Schema({
    recipientRole: { type: String, required: true }, // 'Admin' or 'Chairperson'
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null if Admin
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  });
  MongooseNotification = mongoose.model('Notification', NotificationSchema);
} else {
  console.log('Running backend with Local JSON Database.');
}

// Helper: check unique constraint in JSON DB
const isUnique = (collection, field, value, excludeId = null) => {
  const items = readJson(collection);
  return !items.some(item => item[field] === value && item.id !== excludeId);
};

// Database wrapper
const db = {
  users: {
    find: async (filter = {}) => {
      if (isMongo) {
        return MongooseUser.find(filter).populate('clubId').lean();
      } else {
        let items = readJson('users');
        return items.filter(item => {
          return Object.keys(filter).every(key => {
            if (key === 'clubId' && filter[key]) return item.clubId === filter[key];
            return item[key] === filter[key];
          });
        });
      }
    },
    findOne: async (filter = {}) => {
      if (isMongo) {
        return MongooseUser.findOne(filter).populate('clubId').lean();
      } else {
        const items = readJson('users');
        const found = items.find(item => {
          return Object.keys(filter).every(key => {
            return item[key] === filter[key];
          });
        });
        return found || null;
      }
    },
    findById: async (id) => {
      if (isMongo) {
        return MongooseUser.findById(id).populate('clubId').lean();
      } else {
        const items = readJson('users');
        const found = items.find(item => item.id === id);
        return found || null;
      }
    },
    create: async (data) => {
      if (isMongo) {
        const user = new MongooseUser(data);
        return (await user.save()).toObject();
      } else {
        const items = readJson('users');
        if (data.email && !isUnique('users', 'email', data.email)) {
          throw new Error('Email already exists');
        }
        if (data.username && !isUnique('users', 'username', data.username)) {
          throw new Error('Username already exists');
        }
        if (data.registrationNumber && !isUnique('users', 'registrationNumber', data.registrationNumber)) {
          throw new Error('Registration number already exists');
        }
        const newUser = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
        items.push(newUser);
        writeJson('users', items);
        return newUser;
      }
    },
    findByIdAndUpdate: async (id, data) => {
      if (isMongo) {
        return MongooseUser.findByIdAndUpdate(id, data, { new: true }).populate('clubId').lean();
      } else {
        const items = readJson('users');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        if (data.email && !isUnique('users', 'email', data.email, id)) {
          throw new Error('Email already exists');
        }
        if (data.username && !isUnique('users', 'username', data.username, id)) {
          throw new Error('Username already exists');
        }
        if (data.registrationNumber && !isUnique('users', 'registrationNumber', data.registrationNumber, id)) {
          throw new Error('Registration number already exists');
        }
        items[index] = { ...items[index], ...data };
        writeJson('users', items);
        return items[index];
      }
    },
    findByIdAndDelete: async (id) => {
      if (isMongo) {
        return MongooseUser.findByIdAndDelete(id).lean();
      } else {
        const items = readJson('users');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        const deleted = items.splice(index, 1)[0];
        writeJson('users', items);
        return deleted;
      }
    }
  },

  clubs: {
    find: async (filter = {}) => {
      if (isMongo) {
        return MongooseClub.find(filter).lean();
      } else {
        const items = readJson('clubs');
        return items.filter(item => {
          return Object.keys(filter).every(key => item[key] === filter[key]);
        });
      }
    },
    findOne: async (filter = {}) => {
      if (isMongo) {
        return MongooseClub.findOne(filter).lean();
      } else {
        const items = readJson('clubs');
        return items.find(item => {
          return Object.keys(filter).every(key => item[key] === filter[key]);
        }) || null;
      }
    },
    findById: async (id) => {
      if (isMongo) {
        return MongooseClub.findById(id).lean();
      } else {
        const items = readJson('clubs');
        return items.find(item => item.id === id) || null;
      }
    },
    create: async (data) => {
      if (isMongo) {
        const club = new MongooseClub(data);
        return (await club.save()).toObject();
      } else {
        const items = readJson('clubs');
        if (data.name && !isUnique('clubs', 'name', data.name)) {
          throw new Error('Club/Chapter name already exists');
        }
        const newClub = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
        items.push(newClub);
        writeJson('clubs', items);
        return newClub;
      }
    },
    findByIdAndUpdate: async (id, data) => {
      if (isMongo) {
        return MongooseClub.findByIdAndUpdate(id, data, { new: true }).lean();
      } else {
        const items = readJson('clubs');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        if (data.name && !isUnique('clubs', 'name', data.name, id)) {
          throw new Error('Club name already exists');
        }
        items[index] = { ...items[index], ...data };
        writeJson('clubs', items);
        return items[index];
      }
    },
    findByIdAndDelete: async (id) => {
      if (isMongo) {
        return MongooseClub.findByIdAndDelete(id).lean();
      } else {
        const items = readJson('clubs');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        const deleted = items.splice(index, 1)[0];
        writeJson('clubs', items);
        return deleted;
      }
    }
  },

  reports: {
    find: async (filter = {}) => {
      if (isMongo) {
        return MongooseReport.find(filter).populate('clubId').populate('submittedBy').sort({ createdAt: -1 }).lean();
      } else {
        const items = readJson('reports');
        const filtered = items.filter(item => {
          return Object.keys(filter).every(key => {
            if (key === 'clubId' && filter[key]) return item.clubId === filter[key];
            if (key === 'submittedBy' && filter[key]) return item.submittedBy === filter[key];
            return item[key] === filter[key];
          });
        });
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    },
    findOne: async (filter = {}) => {
      if (isMongo) {
        return MongooseReport.findOne(filter).populate('clubId').lean();
      } else {
        const items = readJson('reports');
        return items.find(item => {
          return Object.keys(filter).every(key => item[key] === filter[key]);
        }) || null;
      }
    },
    findById: async (id) => {
      if (isMongo) {
        return MongooseReport.findById(id).populate('clubId').lean();
      } else {
        const items = readJson('reports');
        return items.find(item => item.id === id) || null;
      }
    },
    create: async (data) => {
      if (isMongo) {
        const report = new MongooseReport(data);
        return (await report.save()).toObject();
      } else {
        const items = readJson('reports');
        const newReport = {
          id: uuidv4(),
          ...data,
          status: 'Submitted Successfully',
          hasOD: false,
          createdAt: new Date().toISOString()
        };
        items.push(newReport);
        writeJson('reports', items);
        return newReport;
      }
    },
    findByIdAndUpdate: async (id, data) => {
      if (isMongo) {
        return MongooseReport.findByIdAndUpdate(id, data, { new: true }).lean();
      } else {
        const items = readJson('reports');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        items[index] = { ...items[index], ...data };
        writeJson('reports', items);
        return items[index];
      }
    },
    findByIdAndDelete: async (id) => {
      if (isMongo) {
        return MongooseReport.findByIdAndDelete(id).lean();
      } else {
        const items = readJson('reports');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        const deleted = items.splice(index, 1)[0];
        writeJson('reports', items);
        return deleted;
      }
    }
  },

  ods: {
    find: async (filter = {}) => {
      if (isMongo) {
        return MongooseOD.find(filter).populate('eventId').populate('clubId').sort({ uploadedAt: -1 }).lean();
      } else {
        const items = readJson('ods');
        const filtered = items.filter(item => {
          return Object.keys(filter).every(key => {
            if (key === 'clubId' && filter[key]) return item.clubId === filter[key];
            if (key === 'eventId' && filter[key]) return item.eventId === filter[key];
            return item[key] === filter[key];
          });
        });
        return filtered.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      }
    },
    findOne: async (filter = {}) => {
      if (isMongo) {
        return MongooseOD.findOne(filter).lean();
      } else {
        const items = readJson('ods');
        return items.find(item => {
          return Object.keys(filter).every(key => item[key] === filter[key]);
        }) || null;
      }
    },
    findById: async (id) => {
      if (isMongo) {
        return MongooseOD.findById(id).lean();
      } else {
        const items = readJson('ods');
        return items.find(item => item.id === id) || null;
      }
    },
    create: async (data) => {
      if (isMongo) {
        const od = new MongooseOD(data);
        return (await od.save()).toObject();
      } else {
        const items = readJson('ods');
        // Validate unique eventId for OD (to enforce workflow)
        if (items.some(item => item.eventId === data.eventId)) {
          throw new Error('OD list already uploaded for this event');
        }
        const newOD = {
          id: uuidv4(),
          ...data,
          uploadedAt: new Date().toISOString()
        };
        items.push(newOD);
        writeJson('ods', items);
        return newOD;
      }
    },
    findByIdAndUpdate: async (id, data) => {
      if (isMongo) {
        return MongooseOD.findByIdAndUpdate(id, data, { new: true }).lean();
      } else {
        const items = readJson('ods');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        items[index] = { ...items[index], ...data };
        writeJson('ods', items);
        return items[index];
      }
    },
    findByIdAndDelete: async (id) => {
      if (isMongo) {
        return MongooseOD.findByIdAndDelete(id).lean();
      } else {
        const items = readJson('ods');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        const deleted = items.splice(index, 1)[0];
        writeJson('ods', items);
        return deleted;
      }
    }
  },

  notifications: {
    find: async (filter = {}) => {
      if (isMongo) {
        return MongooseNotification.find(filter).sort({ createdAt: -1 }).lean();
      } else {
        const items = readJson('notifications');
        const filtered = items.filter(item => {
          return Object.keys(filter).every(key => {
            if (key === 'recipientId' && filter[key]) return item.recipientId === filter[key];
            return item[key] === filter[key];
          });
        });
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    },
    create: async (data) => {
      if (isMongo) {
        const notif = new MongooseNotification(data);
        return (await notif.save()).toObject();
      } else {
        const items = readJson('notifications');
        const newNotif = {
          id: uuidv4(),
          ...data,
          isRead: false,
          createdAt: new Date().toISOString()
        };
        items.push(newNotif);
        writeJson('notifications', items);
        return newNotif;
      }
    },
    markAllAsRead: async (filter = {}) => {
      if (isMongo) {
        await MongooseNotification.updateMany(filter, { isRead: true });
        return { success: true };
      } else {
        const items = readJson('notifications');
        let updated = false;
        items.forEach(item => {
          const match = Object.keys(filter).every(key => item[key] === filter[key]);
          if (match && !item.isRead) {
            item.isRead = true;
            updated = true;
          }
        });
        if (updated) {
          writeJson('notifications', items);
        }
        return { success: true };
      }
    }
  }
};

module.exports = { db, isMongo };
