import fs from 'fs';
import path from 'path';

const p = path.resolve('node_modules/dom-to-image-more/dist/dom-to-image-more.min.js');
const content = fs.readFileSync(p, 'utf-8');

console.log("Uses window.setTimeout?", content.includes('window.setTimeout'));
console.log("Uses setTimeout?", content.includes('setTimeout'));
console.log("Uses Date.now?", content.includes('Date.now'));
console.log("Uses performance.now?", content.includes('performance.now'));
