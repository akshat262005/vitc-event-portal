const fs = require('fs');

const header = `import fs from 'fs';
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

const getJsonPath = (collection) => path.join(DATA_DIR, \`\${collection}.json\`);
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
    console.error(\`Error reading \${collection}.json:\`, err);
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

`;

const src = fs.readFileSync('backend/db.js', 'utf8');
const schemaStart = src.indexOf('// Define Mongoose Schemas');
let body = src.slice(schemaStart);

body = body.replace(
  /if \(isMongo\) \{\s*mongoose\.connect\(MONGO_URI\)[\s\S]*?\.catch\(err => console\.error\('MongoDB connection error:', err\)\);\s*/,
  'if (isMongo) {\n  // Connection handled by connectDB() singleton\n'
);

body = body.replace('module.exports = { db, isMongo };', 'export { db };');

fs.writeFileSync('lib/db.js', header + body);
console.log('Wrote lib/db.js', (header + body).length);
