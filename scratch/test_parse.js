import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8'); 
const match = envFile.match(/STUDIO_API_KEY\s*=\s*"?([^"\n]+)"?/); 
let apiKey = match ? match[1] : null; 
if(apiKey) apiKey = apiKey.replace(/^["']|["']$/g, '').trim(); 
console.log('Parsed API Key: [' + apiKey + ']');
