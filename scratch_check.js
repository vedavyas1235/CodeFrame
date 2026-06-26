import fs from 'fs';
import path from 'path';

// Read the dom-to-image-more file
const p = path.resolve('node_modules/dom-to-image-more/dist/dom-to-image-more.min.js');
const content = fs.readFileSync(p, 'utf-8');

console.log("Length:", content.length);
console.log("Contains </script>?", content.includes('</script>'));
console.log("Contains <script>?", content.includes('<script>'));
