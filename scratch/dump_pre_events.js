const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://rdakshin7_db_user:AcfuJPUbuQ27AcM7@cluster0.l15enpm.mongodb.net/?appName=Cluster0';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');
  
  const preEventSchema = new mongoose.Schema({}, { strict: false });
  const MongoosePreEvent = mongoose.models.PreEventOperation || mongoose.model('PreEventOperation', preEventSchema, 'preeventoperations');
  
  const preEvents = await MongoosePreEvent.find().lean();
  console.log('--- PRE-EVENTS DETAILS ---');
  console.log(JSON.stringify(preEvents, null, 2));
  
  await mongoose.disconnect();
}

run().catch(console.error);
