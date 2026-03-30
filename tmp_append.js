const fs = require('fs');
fs.appendFileSync('style.css', '\n' + fs.readFileSync('tmp_override.css', 'utf8'));
console.log('Appended successfully');
