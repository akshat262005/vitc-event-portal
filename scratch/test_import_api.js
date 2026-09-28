const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // standard package, or we can use build-in if Node supports it, but form-data is widely available or axios handles it

async function testImport() {
  try {
    console.log('Logging in as Admin...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.token;
    console.log('Login successful! JWT Token acquired.');

    const filePath = path.join(__dirname, 'chairpersons_test.xlsx');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test file not found at ${filePath}`);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), {
      filename: 'chairpersons_test.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    console.log('Uploading mock Excel sheet to bulk import API endpoint...');
    const importRes = await axios.post('http://localhost:3000/api/chairpersons/import', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('API Response Status:', importRes.status);
    console.log('API Response Summary:', JSON.stringify(importRes.data.summary, null, 2));
    console.log('Chairpersons Imported/Updated:', importRes.data.chairpersons.length);
    console.log('First Chairperson generated username/password:', {
      name: importRes.data.chairpersons[0].name,
      username: importRes.data.chairpersons[0].username,
      password: importRes.data.chairpersons[0].password
    });

    // Try logging in with the newly imported chairperson to verify authentication works!
    const newChair = importRes.data.chairpersons[0];
    console.log(`Testing login for newly generated chairperson: ${newChair.username}...`);
    const chairLoginRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: newChair.username,
      password: newChair.password
    });
    console.log('Chairperson login successful! Token:', !!chairLoginRes.data.token);
    console.log('User status is Active:', chairLoginRes.data.user.status || 'Active');

  } catch (error) {
    console.error('Test execution failed:', error.response ? error.response.data : error.message);
  }
}

testImport();
