import fs from 'fs';
const c = fs.readFileSync('node_modules/html-to-image/dist/html-to-image.js', 'utf-8');
console.log(c.substring(0, 100));
console.log(c.substring(c.length - 100));
