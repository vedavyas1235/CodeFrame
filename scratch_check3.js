import fs from 'fs';
import path from 'path';

const p = path.resolve('node_modules/dom-to-image-more/dist/dom-to-image-more.min.js');
const content = fs.readFileSync(p, 'utf-8');

console.log(content.substring(0, 500));
