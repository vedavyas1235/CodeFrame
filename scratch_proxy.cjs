const fs = require('fs');

const serverFile = 'd:/Sonu/WORKSHOPS/Animate it/src/server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const newProxyBlock = `      // -- PROXY ARCHITECTURE: Intercept Studio Mode API requests at the Edge --
      const isStudioApi = url.pathname.startsWith('/api/render') || 
                          url.pathname.startsWith('/api/status') || 
                          url.pathname.startsWith('/api/download') ||
                          url.pathname.startsWith('/api/cancel');

      if (isStudioApi) {
        let apiKey = (env as any)?.STUDIO_API_KEY || (typeof process !== 'undefined' ? process.env?.STUDIO_API_KEY : undefined);
        
        if (!apiKey && typeof process !== 'undefined') {
          try {
            const fs = await import('fs');
            const envFile = fs.readFileSync('.env', 'utf-8');
            const match = envFile.match(/STUDIO_API_KEY\\s*=\\s*"?([^"\\n]+)"?/);
            if (match) apiKey = match[1];
          } catch (e) {}
        }
        
        if (apiKey) apiKey = apiKey.replace(/^["']|["']$/g, '').trim();
        
        const backendStr = (env as any)?.VITE_STUDIO_BACKEND_URL || (typeof process !== 'undefined' ? process.env?.VITE_STUDIO_BACKEND_URL : undefined) || "https://vedavyas1235-animateit.hf.space";
        
        // Parse the server pool
        const backends = backendStr.split(',').map(s => s.trim()).filter(Boolean);
        
        let targetBackend = backends[0];
        let backendJobId = '';
        
        // If this is a status, download, or cancel request, extract the routing info from the smart ID
        const match = url.pathname.match(/^\\/api\\/(status|download|cancel)\\/(.+)$/);
        if (match) {
          const action = match[1];
          const rawId = match[2];
          
          if (rawId.includes('--')) {
            // Smart ID format: base64Url--backendId
            const parts = rawId.split('--');
            targetBackend = Buffer.from(parts[0], 'base64').toString('utf8');
            backendJobId = parts.slice(1).join('--');
            url.pathname = \`/api/\${action}/\${backendJobId}\`;
          } else {
            // Fallback for old IDs or sync render
            url.pathname = \`/api/\${action}/\${rawId}\`;
          }
        } else if (url.pathname === '/api/render-async' || url.pathname === '/api/render') {
          // New render request: Load balance randomly!
          targetBackend = backends[Math.floor(Math.random() * backends.length)];
        }

        let targetUrlStr = targetBackend.replace(/\\/$/, '') + url.pathname;
        if (url.search) targetUrlStr += url.search;
        const targetUrl = new URL(targetUrlStr);

        const fetchOptions: any = {
          method: request.method,
          headers: {
            'Content-Type': request.headers.get('Content-Type') || 'application/json',
            ...(apiKey ? { 'Authorization': \`Bearer \${apiKey}\` } : {})
          }
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
          // If we need active failover later, we should clone the body.
          // For now, stream it directly to the chosen server.
          fetchOptions.body = request.body;
          fetchOptions.duplex = 'half';
        }

        // Node 18+ undici fetch timeout override
        if (typeof process !== 'undefined') {
          try {
            const { Agent } = await import('undici');
            fetchOptions.dispatcher = new Agent({ headersTimeout: 3600000, bodyTimeout: 3600000 });
          } catch(e) {}
        }

        try {
          const response = await fetch(targetUrl.toString(), fetchOptions);
          
          // Intercept the /api/render-async response to inject our Smart ID
          if (url.pathname === '/api/render-async' && response.status === 200) {
            const data = await response.json();
            if (data.jobId) {
              const b64Host = Buffer.from(targetBackend).toString('base64');
              data.jobId = \`\${b64Host}--\${data.jobId}\`;
            }
            return new Response(JSON.stringify(data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return response;
        } catch (err: any) {
          console.error(\`[Proxy] Failed to reach backend \${targetBackend}:\`, err);
          return new Response(JSON.stringify({ error: 'Backend server unreachable', details: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }`;

const oldBlockStart = code.indexOf(`      // -- PROXY ARCHITECTURE: Intercept Studio Mode API requests at the Edge --`);
const oldBlockEnd = code.indexOf(`      const handler = await getServerEntry();`);

if (oldBlockStart === -1 || oldBlockEnd === -1) {
  console.error("Could not find proxy block to replace");
  process.exit(1);
}

const newCode = code.substring(0, oldBlockStart) + newProxyBlock + "\n\n" + code.substring(oldBlockEnd);
fs.writeFileSync(serverFile, newCode);
console.log("Successfully updated server.ts proxy!");
