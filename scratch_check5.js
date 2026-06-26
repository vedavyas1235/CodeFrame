import fs from 'fs';
const c = fs.readFileSync('node_modules/html-to-image/dist/html-to-image.js', 'utf-8');
console.log("Uses window.setTimeout?", c.includes('window.setTimeout'));
console.log("Uses setTimeout?", c.includes('setTimeout'));
console.log("Uses requestAnimationFrame?", c.includes('requestAnimationFrame'));
console.log("Uses window.requestAnimationFrame?", c.includes('window.requestAnimationFrame'));
