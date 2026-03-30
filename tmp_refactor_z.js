const fs = require('fs');

function refactorZIndex(filename) {
    let raw;
    let encUsed = 'utf8';
    try {
        raw = fs.readFileSync(filename, 'utf8');
        // If it starts with null bytes or looks funny, maybe it's utf16le but utf8 usually doesn't throw, it just mangles.
        // Actually, let's just use utf8. If it fails to find "z-index", try utf16le.
        if (!raw.includes('z-index') && !raw.includes('Z-INDEX')) {
            raw = fs.readFileSync(filename, 'utf16le');
        }
    } catch(e) { return; }

    let updated = raw;

    // 1. Remove all z-index above 1000
    // regex to match z-index: \d{4,}
    // wait, > 1000 means 4 digits where first is > 1? Actually the user said "values like 99999999 - remove them all"
    // So z-index: \s*[0-9]{4,}\s*;?
    updated = updated.replace(/z-index\s*:\s*[0-9]{4,}(?:\s*!important)?\s*;?/gi, '');
    
    // 2. Remove !important from any z-index
    updated = updated.replace(/(z-index\s*:\s*[-0-9a-z()-\s]+?)\s*!important/gi, '$1');

    fs.writeFileSync(filename, updated, 'utf8');
}

const htmlFile = 'index.html';
const cssFile = 'style.css';

// 3. Remove inline z-index from HTML
let html = fs.readFileSync(htmlFile, 'utf8');
if (!html.includes('z-index')) html = fs.readFileSync(htmlFile, 'utf16le');
html = html.replace(/\s*z-index\s*:\s*[0-9]+;?/gi, '');
fs.writeFileSync(htmlFile, html, 'utf8');

refactorZIndex(cssFile);

console.log("Global z-index refactor complete.");
