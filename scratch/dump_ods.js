const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://rdakshin7_db_user:AcfuJPUbuQ27AcM7@cluster0.l15enpm.mongodb.net/?appName=Cluster0';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');
  
  const odSchema = new mongoose.Schema({}, { strict: false });
  const reportSchema = new mongoose.Schema({}, { strict: false });
  const preEventSchema = new mongoose.Schema({}, { strict: false });
  
  const MongooseOD = mongoose.models.ODList || mongoose.model('ODList', odSchema, 'odlists');
  const MongooseReport = mongoose.models.Report || mongoose.model('Report', reportSchema, 'reports');
  const MongoosePreEvent = mongoose.models.PreEventOperation || mongoose.model('PreEventOperation', preEventSchema, 'preeventoperations');
  
  const ods = await MongooseOD.find().lean();
  console.log('--- ODS ---');
  ods.forEach(o => {
    console.log(`ID: ${o._id}, eventId: ${o.eventId}, eventName: ${o.eventName}, verificationStatus: ${o.verificationStatus}, totalStudents: ${o.totalStudents}, remarks: ${o.adminRemarks}`);
  });
  
  const reports = await MongooseReport.find().lean();
  console.log('--- REPORTS ---');
  reports.forEach(r => {
    console.log(`ID: ${r._id}, eventName: ${r.eventName}, hasOD: ${r.hasOD}`);
  });
  
  const preEvents = await MongoosePreEvent.find().lean();
  console.log('--- PRE-EVENTS ---');
  preEvents.forEach(p => {
    console.log(`ID: ${p._id}, eventName: ${p.eventName}, hasOD: ${p.hasOD}`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
