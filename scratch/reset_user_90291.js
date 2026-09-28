const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://rdakshin7_db_user:25jZAff8AcvrVsHB@cluster0.gkhy73c.mongodb.net/?appName=Cluster0';

async function reset() {
  try {
    await mongoose.connect(MONGO_URI);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('vit@90291', salt);
    
    const result = await mongoose.connection.db.collection('users').updateOne(
      { username: '90291' },
      { $set: { passwordHash } }
    );
    
    console.log('Update result:', result);
    console.log('Password successfully reset to vit@90291!');
  } catch (err) {
    console.error('Reset failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

reset();
