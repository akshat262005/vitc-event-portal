const xlsx = require('xlsx');
const path = require('path');

const data = [
  {
    "Which Club or Chapter are you representing?": "ACM WOMEN",
    "1.Chairperson (Final Year)": "Test Chairperson One",
    "Registration Number": "23MIA9999",
    "Email Id": "testchair1@vitstudent.ac.in"
  },
  {
    "Which Club or Chapter are you representing?": "AEROSPACE CLUB",
    "1.Chairperson (Final Year)": "Test Chairperson Two",
    "Registration Number": "NA",
    "Email Id": "testchair2@vitstudent.ac.in"
  },
  {
    "Which Club or Chapter are you representing?": "ANDROID CLUB",
    "1.Chairperson (Final Year)": "NA",
    "Registration Number": "NA",
    "Email Id": "NA"
  }
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(data);
xlsx.utils.book_append_sheet(wb, ws, "Chairpersons");

const destPath = path.join(__dirname, 'chairpersons_test.xlsx');
xlsx.writeFile(wb, destPath);
console.log('Mock Excel file created at:', destPath);
