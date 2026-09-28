const axios = require('axios');

async function testDeactivation() {
  try {
    console.log('Logging in as Admin...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.token;
    console.log('Admin login successful!');

    console.log('Fetching chairpersons...');
    const listRes = await axios.get('http://localhost:3000/api/chairpersons', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const chair = listRes.data.find(c => c.username === '23mia9999');
    if (!chair) {
      throw new Error('Test chairperson 23mia9999 not found. Run import test first.');
    }
    const chairId = chair.id || chair._id;
    console.log(`Found chairperson ${chair.name} (ID: ${chairId}), current status: ${chair.status}`);

    console.log('Deactivating chairperson account (status = Inactive)...');
    const updateRes = await axios.put(`http://localhost:3000/api/chairpersons/${chairId}`, {
      ...chair,
      clubId: chair.clubId?._id || chair.clubId?.id || chair.clubId || '',
      status: 'Inactive'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status updated successfully. New status in response:', updateRes.data.status);

    console.log('Attempting to log in as deactivated user (expected to fail)...');
    try {
      await axios.post('http://localhost:3000/api/auth/login', {
        username: '23mia9999',
        password: '0Cgx0wXA' // the password from the first import test
      });
      console.error('ERROR: Deactivated user was allowed to log in!');
    } catch (err) {
      console.log('Login blocked as expected. Response message:', err.response?.data?.message);
    }

    console.log('Re-activating chairperson account (status = Active)...');
    const reactivateRes = await axios.put(`http://localhost:3000/api/chairpersons/${chairId}`, {
      ...chair,
      clubId: chair.clubId?._id || chair.clubId?.id || chair.clubId || '',
      status: 'Active'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status updated successfully. New status in response:', reactivateRes.data.status);

    console.log('Attempting to log in as activated user (expected to succeed)...');
    const loginTestRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: '23mia9999',
      password: '0Cgx0wXA'
    });
    console.log('Login successful! Active user can authenticate again. Token:', !!loginTestRes.data.token);

  } catch (error) {
    console.error('Test execution failed:', error.response ? error.response.data : error.message);
  }
}

testDeactivation();
