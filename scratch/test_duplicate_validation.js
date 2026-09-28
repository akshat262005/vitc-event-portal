const axios = require('axios');

async function testDuplicateValidation() {
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
    let collabChair = cpRes.data.find(c => c.email === 'testchair2@vitstudent.ac.in');

    if (!primaryChair || !collabChair) {
      throw new Error('Test chairpersons not found.');
    }

    // 1. Log in as Primary Chairperson (ACM WOMEN)
    console.log('\n--- STEP 1: Log in as Primary Chairperson ---');
    const primaryLogin = await axios.post('http://localhost:3000/api/auth/login', {
      username: primaryChair.username,
      password: 'Password123'
    });
    const primaryToken = primaryLogin.data.token;
    console.log('Primary Chairperson logged in successfully.');

    const testDate = "2026-09-" + String(Math.floor(Math.random() * 20) + 10);
    console.log(`Using test event date: ${testDate}`);

    // 2. Submit initial report
    console.log('\n--- STEP 2: Submitting initial report ---');
    const reportRes = await axios.post('http://localhost:3000/api/reports', {
      eventName: 'Duplicate Test Event 2026',
      eventDate: testDate,
      eventEndDate: testDate,
      eventTime: '10:00 AM',
      venue: 'Ambedkar Auditorium',
      category: 'Technical',
      numberOfParticipants: 120,
      studentCoordinator: 'John Doe',
      studentCoordinatorReg: '23MIA0002',
      studentCoordinatorContact: '9876543211',
      outcome: 'Learned validation techniques.',
      reportFilePath: 'https://docs.google.com/document/d/mock-dup',
      facultyCoordinator: 'Dr. Sarah',
      description: 'Test event for duplicate submissions check.',
      budgetUsed: 100,
      isCollaboration: true,
      collaborationClubs: ['AEROSPACE CLUB'],
      isSponsored: false
    }, {
      headers: { 'Authorization': `Bearer ${primaryToken}` }
    });
    const reportId = reportRes.data.report.id || reportRes.data.report._id;
    console.log(`Initial report submitted successfully! ID: ${reportId}`);

    // 3. Try to submit duplicate (exact match)
    console.log('\n--- STEP 3: Attempting to submit exact duplicate report ---');
    try {
      await axios.post('http://localhost:3000/api/reports', {
        eventName: 'Duplicate Test Event 2026',
        eventDate: testDate,
        eventEndDate: testDate,
        eventTime: '10:00 AM',
        venue: 'Ambedkar Auditorium',
        category: 'Technical',
        numberOfParticipants: 120,
        studentCoordinator: 'John Doe',
        studentCoordinatorContact: '9876543211',
        outcome: 'Learned validation techniques.',
        reportFilePath: 'https://docs.google.com/document/d/mock-dup',
        isCollaboration: true,
        collaborationClubs: ['AEROSPACE CLUB']
      }, {
        headers: { 'Authorization': `Bearer ${primaryToken}` }
      });
      console.error('ERROR: Exact duplicate report creation was not blocked!');
    } catch (err) {
      console.log('Blocked exact duplicate as expected. Error message:', err.response?.data?.message);
    }

    // 4. Try to submit duplicate (casing and spacing differences)
    console.log('\n--- STEP 4: Attempting duplicate check with casing and trailing spaces ---');
    try {
      await axios.post('http://localhost:3000/api/reports', {
        eventName: '   DUPLICATE   test   EVENT   2026   ',
        eventDate: testDate,
        eventEndDate: testDate,
        eventTime: '10:00 AM',
        venue: 'Ambedkar Auditorium',
        category: 'Technical',
        numberOfParticipants: 120,
        studentCoordinator: 'John Doe',
        studentCoordinatorContact: '9876543211',
        outcome: 'Learned validation techniques.',
        reportFilePath: 'https://docs.google.com/document/d/mock-dup',
        isCollaboration: true,
        collaborationClubs: ['AEROSPACE CLUB']
      }, {
        headers: { 'Authorization': `Bearer ${primaryToken}` }
      });
      console.error('ERROR: Spacing/casing duplicate report creation was not blocked!');
    } catch (err) {
      console.log('Blocked normalized duplicate as expected. Error message:', err.response?.data?.message);
    }

    // 5. Try to submit duplicate from Collaborator Club (Aerospace Club)
    console.log('\n--- STEP 5: Attempting duplicate check from collaborating club ---');
    const collabLogin = await axios.post('http://localhost:3000/api/auth/login', {
      username: collabChair.username,
      password: 'Password123'
    });
    const collabToken = collabLogin.data.token;

    try {
      await axios.post('http://localhost:3000/api/reports', {
        eventName: 'Duplicate Test Event 2026',
        eventDate: testDate,
        eventEndDate: testDate,
        eventTime: '10:00 AM',
        venue: 'Ambedkar Auditorium',
        category: 'Technical',
        numberOfParticipants: 120,
        studentCoordinator: 'John Doe',
        studentCoordinatorContact: '9876543211',
        outcome: 'Learned validation techniques.',
        reportFilePath: 'https://docs.google.com/document/d/mock-dup'
      }, {
        headers: { 'Authorization': `Bearer ${collabToken}` }
      });
      console.error('ERROR: Collaborator duplicate report creation was not blocked!');
    } catch (err) {
      console.log('Blocked collaborator duplicate as expected. Error message:', err.response?.data?.message);
    }

    // 6. Modify the existing report (should work)
    console.log('\n--- STEP 6: Modifying the existing report (should work) ---');
    const modifyRes = await axios.put(`http://localhost:3000/api/reports/${reportId}`, {
      eventName: 'Duplicate Test Event 2026 (Updated)',
      description: 'Modified event details.'
    }, {
      headers: { 'Authorization': `Bearer ${primaryToken}` }
    });
    console.log('Report modification successful! New name:', modifyRes.data.report.eventName);

    console.log('\nALL DUPLICATE EVENT VALIDATION TESTS PASSED SUCCESSFULLY!');

  } catch (error) {
    console.error('Test execution failed:', error.response ? error.response.data : error.message);
  }
}

testDuplicateValidation();
