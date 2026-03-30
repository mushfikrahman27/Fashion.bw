const fs = require('fs');
function processFile(filename, enc) {
    try {
        const text = fs.readFileSync(filename, enc);
        const lines = text.split(/\r?\n/);
        lines.forEach((line, i) => {
            if (line.toLowerCase().includes('z-index')) {
                console.log(`${filename}:${i+1}: ${line.trim()}`);
            }
        });
    } catch(e) {}
}

processFile('style.css', 'utf8');
processFile('style.css', 'utf16le');
processFile('index.html', 'utf8');
processFile('index.html', 'utf16le');
