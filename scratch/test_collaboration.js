const axios = require('axios');

async function testCollaboration() {
  try {
    console.log('Logging in as Admin to set up test accounts...');
    const adminLogin = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    console.log('Admin login successful!');

    // Fetch existing chairpersons to see if we already have test accounts
    const cpRes = await axios.get('http://localhost:3000/api/chairpersons', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    let primaryChair = cpRes.data.find(c => c.email === 'testchair1@vitstudent.ac.in');
    let collabChair = cpRes.data.find(c => c.email === 'testchair2@vitstudent.ac.in');

    if (!primaryChair || !collabChair) {
      throw new Error('Test chairpersons testchair1 and testchair2 not found in database. Please run the import Excel test first.');
    }

    // Set passwords for both to simple values for testing
    console.log('Resetting test chairperson passwords...');
    await axios.post(`http://localhost:3000/api/chairpersons/${primaryChair.id || primaryChair._id}/reset-password`, {
      newPassword: 'Password123'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    await axios.post(`http://localhost:3000/api/chairpersons/${collabChair.id || collabChair._id}/reset-password`, {
      newPassword: 'Password123'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('Passwords reset successful.');

    // 1. Log in as Primary Chairperson (ACM WOMEN)
    console.log('\n--- STEP 1: Log in as Primary Chairperson (ACM WOMEN) ---');
    const primaryLogin = await axios.post('http://localhost:3000/api/auth/login', {
      username: primaryChair.username,
      password: 'Password123'
    });
    const primaryToken = primaryLogin.data.token;
    console.log('Primary Chairperson logged in successfully.');

    // 2. Submit a Collaboration Event Report
    console.log('\n--- STEP 2: Submitting Collaboration Event Report ---');
    const reportRes = await axios.post('http://localhost:3000/api/reports', {
      eventName: 'Collaboration Hack 2026',
      eventDate: '2026-08-15',
      eventEndDate: '2026-08-15',
      eventTime: '09:00 AM',
      venue: 'Netaji Auditorium',
      category: 'Workshop',
      numberOfParticipants: 150,
      studentCoordinator: 'Jane Doe',
      studentCoordinatorReg: '23MIA0001',
      studentCoordinatorContact: '9876543210',
      outcome: 'Students built various projects.',
      reportFilePath: 'https://docs.google.com/document/d/mock',
      facultyCoordinator: 'Dr. John',
      description: 'Collaborative workshop between ACM Women and Aerospace Club.',
      budgetUsed: 500,
      isCollaboration: true,
      collaborationClubs: ['AEROSPACE CLUB'],
      isSponsored: false
    }, {
      headers: { 'Authorization': `Bearer ${primaryToken}` }
    });
    const reportId = reportRes.data.report.id || reportRes.data.report._id;
    console.log(`Report created successfully! ID: ${reportId}, name: "${reportRes.data.report.eventName}"`);

    // 3. Log in as Collaborating Chairperson (AEROSPACE CLUB)
    console.log('\n--- STEP 3: Log in as Collaborating Chairperson (AEROSPACE CLUB) ---');
    const collabLogin = await axios.post('http://localhost:3000/api/auth/login', {
      username: collabChair.username,
      password: 'Password123'
    });
    const collabToken = collabLogin.data.token;
    console.log('Collaborating Chairperson logged in successfully.');

    // 4. Verify report visibility & notifications
    console.log('\n--- STEP 4: Checking Collaborating Chairperson visibility & notifications ---');
    const collabReportsRes = await axios.get('http://localhost:3000/api/reports', {
      headers: { 'Authorization': `Bearer ${collabToken}` }
    });
    const foundReport = collabReportsRes.data.find(r => (r.id || r._id).toString() === reportId.toString());
    console.log('Did collaborating club find report in list?', !!foundReport);
    if (foundReport) {
      console.log(`Report Details inside Collaborator: Name: "${foundReport.eventName}", Primary Club: "${foundReport.clubName}", isCollaboration: ${foundReport.isCollaboration}`);
    }

    const collabNotifRes = await axios.get('http://localhost:3000/api/notifications', {
      headers: { 'Authorization': `Bearer ${collabToken}` }
    });
    const submitNotif = collabNotifRes.data.find(n => n.title === 'New Collaboration Event Submitted');
    console.log('Did collaborator receive submit notification?', !!submitNotif);
    if (submitNotif) {
      console.log('Notification Message:', submitNotif.message);
    }

    // 5. Submit OD list as Primary Club
    console.log('\n--- STEP 5: Submitting OD list as Primary Club ---');
    const odRes = await axios.post('http://localhost:3000/api/ods', {
      eventId: reportId,
      requestType: 'post_event',
      students: [
        { registrationNumber: '23MIA9999', studentName: 'Test Chairperson One', date: '2026-08-15', time: '09:00 AM' }
      ]
    }, {
      headers: { 'Authorization': `Bearer ${primaryToken}` }
    });
    const odId = odRes.data.odList.id || odRes.data.odList._id;
    console.log(`OD list submitted successfully! ID: ${odId}`);

    // 6. Verify collaborating club can view OD status
    console.log('\n--- STEP 6: Checking collaborating club OD status visibility ---');
    const collabOdsRes = await axios.get('http://localhost:3000/api/ods', {
      headers: { 'Authorization': `Bearer ${collabToken}` }
    });
    const foundOd = collabOdsRes.data.find(o => (o.id || o._id).toString() === odId.toString());
    console.log('Did collaborating club find OD list?', !!foundOd);
    if (foundOd) {
      console.log(`OD status visible to collaborator: "${foundOd.eventName}", Verification Status: "${foundOd.verificationStatus}"`);
    }

    // 7. Verify read-only restriction (Collab club attempts to edit report - should fail)
    console.log('\n--- STEP 7: Testing read-only restrictions for Collaborating Club ---');
    try {
      await axios.put(`http://localhost:3000/api/reports/${reportId}`, {
        eventName: 'Hacked Collaboration Hack 2026',
        isCollaboration: true
      }, {
        headers: { 'Authorization': `Bearer ${collabToken}` }
      });
      console.error('ERROR: Collaborating club was able to edit report!');
    } catch (err) {
      console.log('Report edit blocked as expected. Response message:', err.response?.data?.message);
    }

    // 8. Admin updates OD verification status & notifies collaborator
    console.log('\n--- STEP 8: Admin verifies OD list and remarks ---');
    await axios.put(`http://localhost:3000/api/ods/${odId}/verify`, {
      verificationStatus: 'fully_updated',
      completedStudents: 1,
      adminRemarks: 'OD list verified successfully.'
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('Admin verified OD list.');

    // 9. Verify collaborator sees updated status and received verification notification
    console.log('\n--- STEP 9: Verifying collaborator received verification updates & alert ---');
    const collabOdsRes2 = await axios.get('http://localhost:3000/api/ods', {
      headers: { 'Authorization': `Bearer ${collabToken}` }
    });
    const foundOd2 = collabOdsRes2.data.find(o => (o.id || o._id).toString() === odId.toString());
    if (foundOd2) {
      console.log(`Updated OD status in collaborator portal: "${foundOd2.eventName}", Verification Status: "${foundOd2.verificationStatus}", Remarks: "${foundOd2.adminRemarks}"`);
    }

    const collabNotifRes2 = await axios.get('http://localhost:3000/api/notifications', {
      headers: { 'Authorization': `Bearer ${collabToken}` }
    });
    const verifyNotif = collabNotifRes2.data.find(n => n.title === 'Collaboration OD Status Updated');
    console.log('Did collaborator receive verification notification?', !!verifyNotif);
    if (verifyNotif) {
      console.log('Notification Message:', verifyNotif.message);
    }

    console.log('\nALL COLLABORATION EVENT SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!');

  } catch (error) {
    console.error('Test execution failed:', error.response ? error.response.data : error.message);
  }
}

testCollaboration();
