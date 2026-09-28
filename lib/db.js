import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URI = process.env.MONGODB_URI || '';
const OD_MONGO_URI = process.env.OD_MONGODB_URI || '';
export const isMongo = !!MONGO_URI;

// Global singleton for serverless (Vercel) — prevents connection exhaustion
const globalForMongoose = globalThis;

// Establish separate connection object for OD lists if configured
let odConnection = mongoose;
if (isMongo && OD_MONGO_URI) {
  if (!globalForMongoose.__mongooseODConnObj) {
    globalForMongoose.__mongooseODConnObj = mongoose.createConnection(OD_MONGO_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
    globalForMongoose.__mongooseODConnObj.on('connected', () => {
      console.log('Connected to OD MongoDB database successfully.');
    });
    globalForMongoose.__mongooseODConnObj.on('error', (err) => {
      console.error('OD MongoDB connection error:', err);
    });
  }
  odConnection = globalForMongoose.__mongooseODConnObj;
}

export async function connectDB() {
  if (!isMongo) return null;
  if (globalForMongoose.__mongooseConn) {
    return globalForMongoose.__mongooseConn;
  }
  if (!globalForMongoose.__mongoosePromise) {
    const promises = [
      mongoose.connect(MONGO_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
      })
    ];
    if (OD_MONGO_URI && globalForMongoose.__mongooseODConnObj) {
      promises.push(globalForMongoose.__mongooseODConnObj.asPromise());
    }

    globalForMongoose.__mongoosePromise = Promise.all(promises)
      .then(([conn]) => {
        console.log('Connected to both Reports and OD databases successfully.');
        globalForMongoose.__mongooseConn = conn;
        return conn;
      })
      .catch((err) => {
        console.error('Database connection error:', err);
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
let MongooseUser, MongooseClub, MongooseReport, MongooseOD, MongooseODRegistry, MongooseNotification, MongoosePreEventOperation, MongoosePasswordResetLog;

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
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    lastLogin: { type: Date },
    importedFromExcel: { type: Boolean, default: false },
    otpHash: String,
    otpExpiresAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  if (mongoose.models.User) {
    delete mongoose.models.User;
  }
  MongooseUser = mongoose.model('User', UserSchema);

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
    normalizedEventName: { type: String, lowercase: true, trim: true, required: true },
    eventDate: { type: String, required: true }, // Format: YYYY-MM-DD (Start Date)
    eventEndDate: { type: String, required: true }, // Format: YYYY-MM-DD (End Date)
    eventTime: { type: String, required: true },
    eventLocationType: { type: String, enum: ['VIT Chennai', 'Outside VIT Chennai'], default: 'VIT Chennai', required: true },
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
    isSponsored: { type: Boolean, default: false },
    sponsorName: String,
    sponsorAmount: Number,
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportUploadsCount: { type: Number, default: 1 },
    odUploadsCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  });
  ReportSchema.index({ clubId: 1, normalizedEventName: 1, eventDate: 1 }, { unique: true });
  ReportSchema.index({ eventDate: 1 });
  ReportSchema.index({ eventEndDate: 1 });
  ReportSchema.index({ clubId: 1 });
  ReportSchema.index({ createdAt: -1 });

  if (mongoose.models.Report) {
    delete mongoose.models.Report;
  }
  MongooseReport = mongoose.model('Report', ReportSchema);

  // Run migration on startup if MongoDB is connected
  if (isMongo) {
    mongoose.connection.on('connected', async () => {
      try {
        const reports = await MongooseReport.find({ normalizedEventName: { $exists: false } });
        if (reports.length > 0) {
          console.log(`[db] Migrating ${reports.length} reports to set normalizedEventName...`);
          for (const report of reports) {
            report.normalizedEventName = report.eventName.trim().toLowerCase().replace(/\s+/g, ' ');
            await report.save();
          }
          console.log('[db] Migration complete.');
        }
      } catch (err) {
        console.error('[db] Error running report migration:', err);
      }
    });
  }

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
    verificationStatus: { type: String, enum: ['pending', 'fully_updated', 'partially_updated', 'missed_od_added'], default: 'pending' },
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
  ODListSchema.index({ eventDate: 1 });
  ODListSchema.index({ clubId: 1 });
  ODListSchema.index({ uploadedAt: -1 });
  ODListSchema.index({ verificationStatus: 1 });

  if (odConnection.models.ODList) {
    delete odConnection.models.ODList;
  }
  MongooseOD = odConnection.model('ODList', ODListSchema);

  const ODRegistrySchema = new mongoose.Schema({
    registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    studentName: { type: String, default: '' },
    eventName: { type: String, required: true },
    eventCategory: { type: String, default: 'N/A' },
    clubName: { type: String, default: '' },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    date: { type: String, required: true },
    time: { type: String, default: '' },
    status: { type: String, default: 'pending' },
    verificationStatus: { type: String, default: 'pending' },
    remarks: { type: String, default: '' },
    specificRemark: { type: String, default: '' },
    generalRemarks: { type: String, default: '' },
    isMatchedInRemarks: { type: Boolean, default: false },
    eventsCount: { type: Number, default: 1 },
    allEvents: [String],
    history: [{
      eventName: String,
      date: String,
      time: String,
      status: String,
      remarks: String
    }],
    updatedAt: { type: Date, default: Date.now }
  });
  ODRegistrySchema.index({ registrationNumber: 1 });
  ODRegistrySchema.index({ date: 1 });
  ODRegistrySchema.index({ clubId: 1 });
  ODRegistrySchema.index({ verificationStatus: 1 });

  if (odConnection.models.ODRegistry) {
    delete odConnection.models.ODRegistry;
  }
  MongooseODRegistry = odConnection.model('ODRegistry', ODRegistrySchema);

  const NotificationSchema = new mongoose.Schema({
    recipientRole: { type: String, required: true }, // 'Admin' or 'Chairperson'
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null if Admin
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  });
  NotificationSchema.index({ recipientRole: 1, recipientId: 1, createdAt: -1 });
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
  PreEventOperationSchema.index({ clubId: 1, status: 1 });
  MongoosePreEventOperation = mongoose.models.PreEventOperation || mongoose.model('PreEventOperation', PreEventOperationSchema);

  const PasswordResetLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  });
  MongoosePasswordResetLog = mongoose.models.PasswordResetLog || mongoose.model('PasswordResetLog', PasswordResetLogSchema);
}

// Helper: check unique constraint in JSON DB
const isUnique = (collection, field, value, excludeId = null) => {
  const items = readJson(collection);
  return !items.some(item => item[field] === value && item.id !== excludeId);
};

// Helper: match flexible conditions for JSON DB (supports $or, $gte, $lte, etc.)
const matchField = (val, condition) => {
  if (condition === undefined || condition === null) return val === condition;
  if (typeof condition === 'object' && !Array.isArray(condition)) {
    if (condition.$gte !== undefined && val < condition.$gte) return false;
    if (condition.$lte !== undefined && val > condition.$lte) return false;
    if (condition.$gt !== undefined && val <= condition.$gt) return false;
    if (condition.$lt !== undefined && val >= condition.$lt) return false;
    if (condition.$in !== undefined && !condition.$in.includes(val)) return false;
    if (condition.$ne !== undefined && val === condition.$ne) return false;
    return true;
  }
  const valStr = val?._id ? val._id.toString() : (val !== null && val !== undefined ? val.toString() : '');
  const condStr = condition?._id ? condition._id.toString() : (condition !== null && condition !== undefined ? condition.toString() : '');
  if (valStr && condStr) return valStr === condStr;
  return val === condition;
};

const filterJsonItems = (items, filter = {}) => {
  if (!filter || Object.keys(filter).length === 0) return items;
  return items.filter(item => {
    if (filter.$or && Array.isArray(filter.$or)) {
      return filter.$or.some(subFilter => {
        return Object.keys(subFilter).every(key => matchField(item[key], subFilter[key]));
      });
    }
    return Object.keys(filter).every(key => {
      if (key === '$or') return true;
      return matchField(item[key], filter[key]);
    });
  });
};

// Database wrapper
const db = {
  users: {
    count: async (filter = {}) => {
      if (isMongo) {
        return MongooseUser.countDocuments(filter);
      } else {
        return filterJsonItems(readJson('users'), filter).length;
      }
    },
    find: async (filter = {}) => {
      if (isMongo) {
        return MongooseUser.find(filter).lean();
      } else {
        return filterJsonItems(readJson('users'), filter);
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
    count: async (filter = {}) => {
      if (isMongo) {
        return MongooseClub.countDocuments(filter);
      } else {
        return filterJsonItems(readJson('clubs'), filter).length;
      }
    },
    find: async (filter = {}) => {
      if (isMongo) {
        return MongooseClub.find(filter).lean();
      } else {
        return filterJsonItems(readJson('clubs'), filter);
      }
    },
    findOne: async (filter = {}) => {
      if (isMongo) {
        return MongooseClub.findOne(filter).lean();
      } else {
        const items = filterJsonItems(readJson('clubs'), filter);
        return items[0] || null;
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
    count: async (filter = {}) => {
      if (isMongo) {
        return MongooseReport.countDocuments(filter);
      } else {
        return filterJsonItems(readJson('reports'), filter).length;
      }
    },
    find: async (filter = {}, projection = null) => {
      if (isMongo) {
        let q = MongooseReport.find(filter, projection);
        const shouldPopulate = !projection || Object.keys(projection).length === 0;
        if (shouldPopulate) {
          q = q.populate('clubId').populate('submittedBy');
        }
        return q.sort({ createdAt: -1 }).lean();
      } else {
        const items = filterJsonItems(readJson('reports'), filter);
        return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    },
    findOne: async (filter = {}) => {
      if (isMongo) {
        return MongooseReport.findOne(filter).populate('clubId').lean();
      } else {
        const items = filterJsonItems(readJson('reports'), filter);
        return items[0] || null;
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
        const report = new MongooseReport({
          ...data,
          normalizedEventName: data.eventName ? data.eventName.trim().toLowerCase().replace(/\s+/g, ' ') : ''
        });
        return (await report.save()).toObject();
      } else {
        const items = readJson('reports');
        const newReport = {
          id: uuidv4(),
          ...data,
          normalizedEventName: data.eventName ? data.eventName.trim().toLowerCase().replace(/\s+/g, ' ') : '',
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
        const updateData = { ...data };
        if (data.eventName) {
          updateData.normalizedEventName = data.eventName.trim().toLowerCase().replace(/\s+/g, ' ');
        }
        return MongooseReport.findByIdAndUpdate(id, updateData, { new: true }).lean();
      } else {
        const items = readJson('reports');
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        const normalizedUpdate = { ...data };
        if (data.eventName) {
          normalizedUpdate.normalizedEventName = data.eventName.trim().toLowerCase().replace(/\s+/g, ' ');
        }
        items[index] = { ...items[index], ...normalizedUpdate };
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
    count: async (filter = {}) => {
      if (isMongo) {
        return MongooseOD.countDocuments(filter);
      } else {
        return filterJsonItems(readJson('ods'), filter).length;
      }
    },
    find: async (filter = {}, projection = null) => {
      if (isMongo) {
        let q = MongooseOD.find(filter, projection);
        const shouldPopulate = !projection || Object.keys(projection).length === 0;
        if (shouldPopulate) {
          q = q.populate({ path: 'clubId', model: MongooseClub });
        }
        return q.sort({ uploadedAt: -1 }).lean();
      } else {
        const items = filterJsonItems(readJson('ods'), filter);
        return items.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      }
    },
    findOne: async (filter = {}) => {
      if (isMongo) {
        return MongooseOD.findOne(filter).lean();
      } else {
        const items = filterJsonItems(readJson('ods'), filter);
        return items[0] || null;
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

  odRegistries: {
    find: async (filter = {}) => {
      if (isMongo) {
        return MongooseODRegistry.find(filter).sort({ registrationNumber: 1 }).lean();
      } else {
        const items = filterJsonItems(readJson('odRegistries'), filter);
        return items.sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber));
      }
    },
    findOne: async (filter = {}) => {
      if (isMongo) {
        return MongooseODRegistry.findOne(filter).lean();
      } else {
        const items = filterJsonItems(readJson('odRegistries'), filter);
        return items[0] || null;
      }
    },
    upsertStudent: async (regNo, data) => {
      const cleanReg = String(regNo).trim().toUpperCase();
      if (isMongo) {
        return MongooseODRegistry.findOneAndUpdate(
          { registrationNumber: cleanReg },
          { $set: { ...data, registrationNumber: cleanReg, updatedAt: new Date() } },
          { upsert: true, new: true }
        ).lean();
      } else {
        const items = readJson('odRegistries');
        const index = items.findIndex(item => item.registrationNumber === cleanReg);
        if (index === -1) {
          const newItem = {
            id: uuidv4(),
            registrationNumber: cleanReg,
            ...data,
            updatedAt: new Date().toISOString()
          };
          items.push(newItem);
          writeJson('odRegistries', items);
          return newItem;
        } else {
          items[index] = {
            ...items[index],
            ...data,
            registrationNumber: cleanReg,
            updatedAt: new Date().toISOString()
          };
          writeJson('odRegistries', items);
          return items[index];
        }
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
  },

  resetLogs: {
    create: async (data) => {
      if (isMongo) {
        const log = new MongoosePasswordResetLog(data);
        return (await log.save()).toObject();
      } else {
        const items = readJson('resetLogs');
        const newLog = {
          id: uuidv4(),
          ...data,
          timestamp: new Date().toISOString()
        };
        items.push(newLog);
        writeJson('resetLogs', items);
        return newLog;
      }
    }
  }
};

export { db };
