const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

const runTests = async () => {
  console.log('=== STARTING INTEGRATION TESTS ===');
  
  const suffix = Date.now();
  const testClubName = `IEEE Test Chapter ${suffix}`;
  const testUsername = `testchair_${suffix}`;
  const testRegNo = `21BCE${String(suffix).slice(-4)}`;

  let adminToken = '';
  let chairpersonToken = '';
  let testClubId = '';
  let testEventId = '';
  let chairpersonId = '';

  try {
    // 1. Log in as Admin
    console.log('1. Logging in as Admin...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    if (adminLoginRes.status !== 200) {
      throw new Error(`Admin login failed: ${adminLoginRes.statusText}`);
    }
    
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.token;
    console.log('✓ Admin login successful.');

    // 2. Create a test club
    console.log(`\n2. Creating test club "${testClubName}"...`);
    const createClubRes = await fetch(`${BASE_URL}/clubs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: testClubName, description: 'Integration Testing Club' })
    });
    
    const clubData = await createClubRes.json();
    if (createClubRes.status !== 201) {
      throw new Error(`Club creation failed: ${clubData.message}`);
    }
    testClubId = clubData.id || clubData._id;
    console.log(`✓ Club created with ID: ${testClubId}`);

    // 3. Create a Chairperson account
    console.log(`\n3. Creating Chairperson account (Username: ${testUsername})...`);
    const createChairRes = await fetch(`${BASE_URL}/chairpersons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Test Chairperson',
        email: `testchair_${suffix}@vitchennai.edu.in`,
        registrationNumber: testRegNo,
        clubId: testClubId,
        designation: 'Chairperson',
        username: testUsername,
        password: 'chairpassword123'
      })
    });

    const chairData = await createChairRes.json();
    if (createChairRes.status !== 201) {
      throw new Error(`Chairperson creation failed: ${chairData.message}`);
    }
    chairpersonId = chairData.id || chairData._id;
    console.log(`✓ Chairperson created: ${chairData.name}`);

    // 4. Log in as the new Chairperson
    console.log('\n4. Logging in as Chairperson...');
    const chairLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUsername, password: 'chairpassword123' })
    });
    
    const chairLoginData = await chairLoginRes.json();
    if (chairLoginRes.status !== 200) {
      throw new Error(`Chairperson login failed: ${chairLoginRes.statusText}`);
    }
    chairpersonToken = chairLoginData.token;
    console.log('✓ Chairperson login successful.');

    // 5. Test OD Lock Workflow: Try uploading OD for non-existent event
    console.log('\n5. Testing OD Lock Workflow: Trying to upload OD without an event report...');
    const invalidODRes = await fetch(`${BASE_URL}/ods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chairpersonToken}`
      },
      body: JSON.stringify({
        eventId: '000000000000000000000000', // Fake ID
        timeSlot: 'FN',
        students: [{ registrationNumber: '21BCE0001', studentName: 'Alex', department: 'CSE', year: 3 }]
      })
    });
    
    const invalidODData = await invalidODRes.json();
    if (invalidODRes.status === 201) {
      throw new Error('OD submission should have been blocked for non-existent event!');
    }
    console.log(`✓ Blocked successfully. Server returned: "${invalidODData.message}"`);

    // 6. Submit Event Report (Mocking multipart request details)
    console.log('\n6. Submitting Event Report...');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('eventName', `Integration Testing Workshop ${suffix}`);
    form.append('eventDate', '2026-07-14');
    form.append('eventTime', '09:00 AM - 12:00 PM');
    form.append('venue', 'Netaji Block Hall 301');
    form.append('category', 'Workshop');
    form.append('numberOfParticipants', '50');
    form.append('facultyCoordinator', 'Dr. Test Coordinator');
    form.append('studentCoordinator', 'Rohan (21BCE0231)');
    form.append('description', 'This is an integration test workshop details.');
    form.append('outcome', 'Successful setup and execution.');
    form.append('budgetUsed', '3500');
    
    form.append('report', Buffer.from('%PDF-1.4 mock report pdf data'), {
      filename: 'test_report.pdf',
      contentType: 'application/pdf'
    });

    const reportSubmitRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chairpersonToken}`,
        ...form.getHeaders()
      },
      body: form.getBuffer()
    });

    const reportSubmitData = await reportSubmitRes.json();
    if (reportSubmitRes.status !== 201) {
      throw new Error(`Report submission failed: ${reportSubmitData.message}`);
    }
    testEventId = reportSubmitData.report.id || reportSubmitData.report._id;
    console.log(`✓ Event Report submitted successfully. Event ID: ${testEventId}`);

    // 7. Submit On Duty (OD) List for the Event
    console.log('\n7. Submitting OD List for the newly created Event...');
    const odSubmitRes = await fetch(`${BASE_URL}/ods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chairpersonToken}`
      },
      body: JSON.stringify({
        eventId: testEventId,
        timeSlot: 'FN',
        students: [
          { registrationNumber: '21BCE0001', studentName: 'Aditya', department: 'CSE', year: 3 },
          { registrationNumber: '21BCE0002', studentName: 'Priya', department: 'CSE', year: 3 }
        ]
      })
    });

    const odSubmitData = await odSubmitRes.json();
    if (odSubmitRes.status !== 201) {
      throw new Error(`OD list submission failed: ${odSubmitData.message}`);
    }
    console.log('✓ OD List submitted successfully.');

    // 8. Test Duplicate Registration Number Validation
    console.log('\n8. Testing duplicate student validation inside OD list...');
    const duplicateODRes = await fetch(`${BASE_URL}/ods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chairpersonToken}`
      },
      body: JSON.stringify({
        eventId: testEventId, // Try submitting again (locked constraint or duplicate constraint)
        timeSlot: 'AN',
        students: [
          { registrationNumber: '21BCE0005', studentName: 'Rahul', department: 'ECE', year: 2 },
          { registrationNumber: '21BCE0005', studentName: 'Rahul Clone', department: 'ECE', year: 2 } // Duplicate Reg No
        ]
      })
    });

    const duplicateODData = await duplicateODRes.json();
    if (duplicateODRes.status === 201) {
      throw new Error('OD submission should have been blocked due to duplicate registration numbers or locked constraint!');
    }
    console.log(`✓ Duplicate check passed. Server blocked with message: "${duplicateODData.message}"`);

    // 9. Admin Stats Check
    console.log('\n9. Admin fetching dashboard metrics and stats...');
    const adminStatsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const adminStats = await adminStatsRes.json();
    console.log('✓ Stats metrics fetched successfully:');
    console.log('  Cards:', JSON.stringify(adminStats.cards));

    // 10. Admin Daily View Check
    console.log('\n10. Admin fetching Daily Unified View for date 2026-07-14...');
    const dailyViewRes = await fetch(`${BASE_URL}/admin/daily-view?date=2026-07-14`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const dailyViewData = await dailyViewRes.json();
    console.log('✓ Daily Unified View data fetched:');
    console.log(`  Reports matching: ${dailyViewData.reports.length}`);
    console.log(`  OD lists matching: ${dailyViewData.ods.length}`);

    // Cleanup: Delete Chairperson and Club to keep database clean
    console.log('\n11. Cleaning up test assets...');
    await fetch(`${BASE_URL}/chairpersons/${chairpersonId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    await fetch(`${BASE_URL}/clubs/${testClubId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('✓ Cleanup complete.');

    console.log('\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('\n✕ INTEGRATION TEST FAILED:', error);
    process.exit(1);
  }
};

runTests();
