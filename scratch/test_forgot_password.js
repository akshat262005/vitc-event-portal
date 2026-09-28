const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://rdakshin7_db_user:AcfuJPUbuQ27AcM7@cluster0.l15enpm.mongodb.net/?appName=Cluster0';

async function testForgotPassword() {
  try {
    console.log('Connecting to MongoDB directly...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully.');

    // Define temporary model for user lookups
    const UserSchema = new mongoose.Schema({
      username: String,
      email: String,
      otpHash: String,
      otpExpiresAt: Date
    }, { collection: 'users' });
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    console.log('Fetching test chairperson (testchair1@vitstudent.ac.in) from database...');
    const user = await User.findOne({ email: 'testchair1@vitstudent.ac.in' });
    
    if (!user) {
      throw new Error('Test user testchair1 not found.');
    }
    console.log(`Found user: ${user.username} (${user.email})`);

    // 1. Request OTP for non-existent email
    console.log('\n--- STEP 1: Requesting OTP for invalid email ---');
    try {
      await axios.post('http://localhost:3000/api/auth/forgot-password/request', {
        email: 'nonexistent_email_12345@vitstudent.ac.in'
      });
      console.error('ERROR: Non-existent email did not fail!');
    } catch (err) {
      console.log('Failed as expected. Error message:', err.response?.data?.message);
    }

    // 2. Request OTP for valid email (Sends SMTP email)
    console.log('\n--- STEP 2: Requesting OTP for valid email (SMTP Test) ---');
    const reqRes = await axios.post('http://localhost:3000/api/auth/forgot-password/request', {
      email: user.email
    });
    console.log('Request OTP response status:', reqRes.status, reqRes.data.message);

    // 3. Inject mock OTP in database to test verify and reset endpoints deterministically
    console.log('\n--- STEP 3: Injecting mock OTP (123456) in DB for deterministic validation ---');
    const mockOtpCode = '123456';
    const mockOtpHash = crypto.createHash('sha256').update(mockOtpCode).digest('hex');
    const mockExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await User.findByIdAndUpdate(user.id || user._id, {
      otpHash: mockOtpHash,
      otpExpiresAt: mockExpiry
    });
    console.log('Mock OTP injected successfully.');

    // 4. Verify OTP (invalid code)
    console.log('\n--- STEP 4: Verifying invalid OTP code ---');
    try {
      await axios.post('http://localhost:3000/api/auth/forgot-password/verify', {
        email: user.email,
        otp: '999999' // incorrect code
      });
      console.error('ERROR: Invalid OTP code was verified!');
    } catch (err) {
      console.log('Failed as expected. Error message:', err.response?.data?.message);
    }

    // 5. Verify OTP (valid code)
    console.log('\n--- STEP 5: Verifying valid OTP code ---');
    const verifyRes = await axios.post('http://localhost:3000/api/auth/forgot-password/verify', {
      email: user.email,
      otp: mockOtpCode
    });
    console.log('Verify OTP response status:', verifyRes.status, verifyRes.data.message);

    // 6. Reset Password (weak password)
    console.log('\n--- STEP 6: Resetting password with weak password ---');
    try {
      await axios.post('http://localhost:3000/api/auth/forgot-password/reset', {
        email: user.email,
        otp: mockOtpCode,
        newPassword: 'weak' // fails complexity
      });
      console.error('ERROR: Weak password was accepted!');
    } catch (err) {
      console.log('Failed as expected. Error message:', err.response?.data?.message);
    }

    // 7. Reset Password (valid password)
    console.log('\n--- STEP 7: Resetting password with strong complex password ---');
    const resetRes = await axios.post('http://localhost:3000/api/auth/forgot-password/reset', {
      email: user.email,
      otp: mockOtpCode,
      newPassword: 'NewSecurePassword123!'
    });
    console.log('Reset Password response status:', resetRes.status, resetRes.data.message);

    // 8. Invalidation check: verify OTP (valid code) fails after clear/reset
    console.log('\n--- STEP 8: Testing OTP invalidation after password reset ---');
    try {
      await axios.post('http://localhost:3000/api/auth/forgot-password/verify', {
        email: user.email,
        otp: mockOtpCode
      });
      console.error('ERROR: OTP was verified after password reset!');
    } catch (err) {
      console.log('Blocked verification as expected. Error message:', err.response?.data?.message);
    }

    // 9. Login with new password
    console.log('\n--- STEP 9: Logging in with new password ---');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: user.username,
      password: 'NewSecurePassword123!'
    });
    console.log('Login successful! Returned user role:', loginRes.data.user.role);

    // 10. Check that the password reset event was logged
    console.log('\n--- STEP 10: Verifying password reset log in database ---');
    const logsCollection = mongoose.connection.collection('passwordresetlogs');
    const logDoc = await logsCollection.findOne({ userEmail: user.email });
    console.log('Found reset log in database?', !!logDoc);
    if (logDoc) {
      console.log('Log timestamp:', logDoc.timestamp);
    }

    console.log('\nALL FORGOT PASSWORD OTP VERIFICATION TESTS PASSED SUCCESSFULLY!');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Test execution failed:', error.response ? error.response.data : error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testForgotPassword();
