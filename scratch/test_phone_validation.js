const axios = require('axios');

async function testPhoneValidation() {
  try {
    console.log('Logging in as Admin to fetch test accounts...');
    const adminLogin = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;

    const cpRes = await axios.get('http://localhost:3000/api/chairpersons', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    let primaryChair = cpRes.data.find(c => c.email === 'testchair1@vitstudent.ac.in');
    if (!primaryChair) {
      throw new Error('Test chairperson not found.');
    }

    console.log('Logging in as Chairperson...');
    const primaryLogin = await axios.post('http://localhost:3000/api/auth/login', {
      username: primaryChair.username,
      password: 'Password123'
    });
    const primaryToken = primaryLogin.data.token;
    console.log('Chairperson logged in successfully.');

    const testDate = "2026-09-" + String(Math.floor(Math.random() * 20) + 10);
    const eventName = 'Phone Test Event ' + Math.floor(Math.random() * 1000);
    console.log(`Using test event date: ${testDate}, name: ${eventName}`);

    // Test Case 1: Post with invalid phone number (too short)
    console.log('\n--- Test 1: Submitting report with too short contact number ---');
    try {
      await axios.post('http://localhost:3000/api/reports', {
        eventName,
        eventDate: testDate,
        eventEndDate: testDate,
        eventTime: '10:00 AM',
        venue: 'Ambedkar Auditorium',
        category: 'Technical',
        numberOfParticipants: 50,
        studentCoordinator: 'John Doe',
        studentCoordinatorContact: '12345',
        outcome: 'Test outcome',
        reportFilePath: 'https://docs.google.com/document/d/mock-phone-test',
        facultyCoordinator: 'Dr. Sarah',
        isCollaboration: false,
        isSponsored: false
      }, {
        headers: { 'Authorization': `Bearer ${primaryToken}` }
      });
      console.error('FAIL: Report with 5-digit contact number was NOT blocked.');
    } catch (err) {
      console.log('PASS: Blocked successfully. Response:', err.response?.data?.message);
    }

    // Test Case 2: Post with invalid phone number (has country code/non-digits)
    console.log('\n--- Test 2: Submitting report with invalid country-code contact number ---');
    try {
      await axios.post('http://localhost:3000/api/reports', {
        eventName,
        eventDate: testDate,
        eventEndDate: testDate,
        eventTime: '10:00 AM',
        venue: 'Ambedkar Auditorium',
        category: 'Technical',
        numberOfParticipants: 50,
        studentCoordinator: 'John Doe',
        studentCoordinatorContact: '+919876543210',
        outcome: 'Test outcome',
        reportFilePath: 'https://docs.google.com/document/d/mock-phone-test',
        facultyCoordinator: 'Dr. Sarah',
        isCollaboration: false,
        isSponsored: false
      }, {
        headers: { 'Authorization': `Bearer ${primaryToken}` }
      });
      console.error('FAIL: Report with +91... format was NOT blocked.');
    } catch (err) {
      console.log('PASS: Blocked successfully. Response:', err.response?.data?.message);
    }

    // Test Case 3: Post with valid 10-digit number
    console.log('\n--- Test 3: Submitting report with valid 10-digit contact number ---');
    let reportId;
    try {
      const res = await axios.post('http://localhost:3000/api/reports', {
        eventName,
        eventDate: testDate,
        eventEndDate: testDate,
        eventTime: '10:00 AM',
        venue: 'Ambedkar Auditorium',
        category: 'Technical',
        numberOfParticipants: 50,
        studentCoordinator: 'John Doe',
        studentCoordinatorContact: '9876543210',
        outcome: 'Test outcome',
        reportFilePath: 'https://docs.google.com/document/d/mock-phone-test',
        facultyCoordinator: 'Dr. Sarah',
        isCollaboration: false,
        isSponsored: false
      }, {
        headers: { 'Authorization': `Bearer ${primaryToken}` }
      });
      reportId = res.data.report._id || res.data.report.id;
      console.log(`PASS: Submitted successfully! ID: ${reportId}`);
    } catch (err) {
      console.error('FAIL: Valid report was blocked.', err.response?.data?.message || err.message);
      return;
    }

    // Test Case 4: Update report with invalid contact number
    console.log('\n--- Test 4: Updating report with invalid contact number ---');
    try {
      await axios.put(`http://localhost:3000/api/reports/${reportId}`, {
        studentCoordinatorContact: '98765'
      }, {
        headers: { 'Authorization': `Bearer ${primaryToken}` }
      });
      console.error('FAIL: Update with 5-digit number was NOT blocked.');
    } catch (err) {
      console.log('PASS: Update blocked successfully. Response:', err.response?.data?.message);
    }

    // Test Case 5: Update report with valid contact number
    console.log('\n--- Test 5: Updating report with valid 10-digit contact number ---');
    try {
      await axios.put(`http://localhost:3000/api/reports/${reportId}`, {
        studentCoordinatorContact: '9876543219'
      }, {
        headers: { 'Authorization': `Bearer ${primaryToken}` }
      });
      console.log('PASS: Update succeeded.');
    } catch (err) {
      console.error('FAIL: Valid update was blocked.', err.response?.data?.message || err.message);
    }

    // Cleanup: Delete report
    console.log('\nCleaning up created test report...');
    await axios.delete(`http://localhost:3000/api/reports/${reportId}`, {
      headers: { 'Authorization': `Bearer ${primaryToken}` }
    });
    console.log('Cleanup completed.');

  } catch (error) {
    console.error('Unexpected test error:', error);
  }
}

testPhoneValidation();
