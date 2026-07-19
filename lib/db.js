import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URI = process.env.MONGODB_URI || '';
export const isMongo = !!MONGO_URI;

// Global singleton for serverless (Vercel) — prevents connection exhaustion
const globalForMongoose = globalThis;

export async function connectDB() {
  if (!isMongo) return null;
  if (globalForMongoose.__mongooseConn) {
    return globalForMongoose.__mongooseConn;
  }
  if (!globalForMongoose.__mongoosePromise) {
    globalForMongoose.__mongoosePromise = mongoose
      .connect(MONGO_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
      })
      .then((conn) => {
        console.log('Connected to MongoDB successfully.');
        globalForMongoose.__mongooseConn = conn;
        return conn;
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err);
        globalForMongoose.__mongoosePromise = null;
        throw err;
      });
  }
  return globalForMongoose.__mongoosePromise;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!isMongo) {
  console.warn(
    '[db] Running with Local JSON Database. On Vercel, set MONGODB_URI — JSON writes are not durable on serverless.'
  );
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (e) {
    console.warn('[db] Could not create local data dirs:', e.message);
  }
}

const getJsonPath = (collection) => path.join(DATA_DIR, `${collection}.json`);
const readJson = (collection) => {
  const filePath = getJsonPath(collection);
  if (!fs.existsSync(filePath)) {
    try {
      // TODO: Move durable storage to MongoDB / Vercel Blob — local FS is ephemeral on serverless
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    } catch (e) {
      console.warn('[db] Cannot create', collection, e.message);
      return [];
    }
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
  try {
    // NOTE: Local FS writes are not durable on Vercel serverless. Use MONGODB_URI in production.
    // TODO: Move file uploads / durable storage to Vercel Blob or S3 when needed.
    console.log('[db] writeJson placeholder/local write for collection:', collection);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[db] writeJson failed (use MongoDB on Vercel):', err.message);
    throw new Error('Database write failed. Configure MONGODB_URI for production.');
  }
};

// Define Mongoose Schemas if using MongoDB
let MongooseUser, MongooseClub, MongooseReport, MongooseOD, MongooseNotification, MongoosePreEventOperation;

if (isMongo) {
  // Connection handled by connectDB() singleton
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
  MongooseUser = mongoose.models.User || mongoose.model('User', UserSchema);

  const ClubSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: String,
    createdAt: { type: Date, default: Date.now }
  });
  MongooseClub = mongoose.models.Club || mongoose.model('Club', ClubSchema);

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
    facultyCoordinator: String,
    studentCoordinator: { type: String, required: true },
    studentCoordinatorReg: String,
    studentCoordinatorContact: { type: String, required: true },
    description: String,
    outcome: { type: String, required: true },
    budgetUsed: Number,
    photos: [String],
    status: { type: String, default: 'Submitted Successfully' },
    hasOD: { type: Boolean, default: false },
    isCollaboration: { type: Boolean, default: false },
    collaborationClubs: [String],
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportUploadsCount: { type: Number, default: 1 },
    odUploadsCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  });
  MongooseReport = mongoose.models.Report || mongoose.model('Report', ReportSchema);

  const ODListSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true, unique: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    clubName: { type: String, required: true },
    eventName: { type: String, required: true },
    eventDate: { type: String, required: true },
    timeSlot: String, // Deprecated
    students: [{
      registrationNumber: { type: String, required: true },
      studentName: { type: String, required: true },
      date: { type: String, required: true },
      time: { type: String, required: true }
    }],
    verificationStatus: { type: String, enum: ['pending', 'fully_updated', 'partially_updated'], default: 'pending' },
    requestType: { type: String, enum: ['pre_event', 'post_event'], default: 'post_event' },
    totalStudents: { type: Number, required: true },
    completedStudents: { type: Number, default: 0 },
    remainingStudents: { type: Number, default: 0 },
    adminRemarks: { type: String, default: '' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    resubmissionCount: { type: Number, default: 0 },
    currentVersion: { type: Number, default: 1 },
    versions: [{
      version: Number,
      students: [{
        registrationNumber: String,
        studentName: String,
        date: String,
        time: String
      }],
      uploadedAt: { type: Date, default: Date.now }
    }],
    remarks: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now }
  });
  MongooseOD = mongoose.models.ODList || mongoose.model('ODList', ODListSchema);

  const NotificationSchema = new mongoose.Schema({
    recipientRole: { type: String, required: true }, // 'Admin' or 'Chairperson'
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null if Admin
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  });
  MongooseNotification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

  const PreEventOperationSchema = new mongoose.Schema({
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    clubName: { type: String, required: true },
    eventName: { type: String, required: true },
    eventDate: { type: String, required: true },
    odRequiredDate: { type: String, required: true },
    eventCategory: { type: String, required: true },
    eventCategoryOthersSpecify: String,
    facultyCoordinator: { type: String, required: true },
    studentCoordinator: { type: String, required: true },
    studentCoordinatorContact: { type: String, required: true },
    purpose: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    hasOD: { type: Boolean, default: false },
    odUploadsCount: { type: Number, default: 0 },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  MongoosePreEventOperation = mongoose.models.PreEventOperation || mongoose.model('PreEventOperation', PreEventOperationSchema);
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
        return MongooseUser.find(filter).lean();
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
        return MongooseUser.findOne(filter).lean();
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
        return MongooseUser.findById(id).lean();
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
        return MongooseUser.findByIdAndUpdate(id, data, { new: true }).lean();
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
  },

  preEventOperations: {
    find: async (filter = {}) => {
      if (isMongo) {
        return MongoosePreEventOperation.find(filter).lean();
      } else {
        const items = readJson('preEventOperations');
        return items.filter(item => {
          return Object.keys(filter).every(key => {
            if (key === 'clubId' && filter[key]) return item.clubId === filter[key];
            if (key === 'submittedBy' && filter[key]) return item.submittedBy === filter[key];
            return item[key] === filter[key];
          });
        });
      }
    },
    findOne: async (filter = {}) => {
      if (isMongo) {
        return MongoosePreEventOperation.findOne(filter).lean();
      } else {
        const items = readJson('preEventOperations');
        return items.find(item => {
          return Object.keys(filter).every(key => item[key] === filter[key]);
        }) || null;
      }
    },
    findById: async (id) => {
      if (isMongo) {
        return MongoosePreEventOperation.findById(id).lean();
      } else {
        const items = readJson('preEventOperations');
        return items.find(item => item.id === id) || null;
      }
    },
    create: async (data) => {
      if (isMongo) {
        const op = new MongoosePreEventOperation(data);
        return (await op.save()).toObject();
      } else {
        const items = readJson('preEventOperations');
        const newOp = {
          id: uuidv4(),
          ...data,
          status: data.status || 'Pending',
          hasOD: false,
          odUploadsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        items.push(newOp);
        writeJson('preEventOperations', items);
        return newOp;
      }
    },
    findByIdAndUpdate: async (id, data) => {
      if (isMongo) {
        return MongoosePreEventOperation.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true }).lean();
      } else {
        const items = readJson('preEventOperations');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
        writeJson('preEventOperations', items);
        return items[index];
      }
    },
    findByIdAndDelete: async (id) => {
      if (isMongo) {
        return MongoosePreEventOperation.findByIdAndDelete(id).lean();
      } else {
        const items = readJson('preEventOperations');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        const deleted = items.splice(index, 1)[0];
        writeJson('preEventOperations', items);
        return deleted;
      }
    }
  }
};

export { db };
