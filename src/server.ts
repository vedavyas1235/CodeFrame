import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

let globalServerIndex = 0;

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      
      // -- PROXY ARCHITECTURE: Intercept Studio Mode API requests at the Edge --
      const isStudioApi = url.pathname.startsWith('/api/render') || 
                          url.pathname.startsWith('/api/status') || 
                          url.pathname.startsWith('/api/download') ||
                          url.pathname.startsWith('/api/cancel');

      if (isStudioApi) {
        let apiKey = (env as any)?.STUDIO_API_KEY || (typeof process !== 'undefined' ? process.env?.STUDIO_API_KEY : undefined);
        let backendStr = (env as any)?.STUDIO_BACKEND_URL || (typeof process !== 'undefined' ? process.env?.STUDIO_BACKEND_URL : undefined);
        
        if (typeof process !== 'undefined') {
          try {
            const fs = await import('fs');
            const envFile = fs.readFileSync('.env', 'utf-8');
            if (!apiKey) {
              const matchKey = envFile.match(/STUDIO_API_KEY\s*=\s*"?([^"\n]+)"?/);
              if (matchKey) apiKey = matchKey[1];
            }
            if (!backendStr) {
              const matchUrl = envFile.match(/STUDIO_BACKEND_URL\s*=\s*"?([^"\n]+)"?/);
              if (matchUrl) backendStr = matchUrl[1];
            }
          } catch (e) {}
        }
        
        if (apiKey) apiKey = apiKey.replace(/^["']|["']$/g, '').trim();
        if (!backendStr) {
          return new Response(JSON.stringify({ error: "Server Configuration Error: STUDIO_BACKEND_URL is not set." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Parse the server pool
        const backends = backendStr.split(',').map(s => s.trim()).filter(Boolean);
        
        let targetBackend = backends[0];
        let backendJobId = '';
        
        // If this is a status, download, or cancel request, extract the routing info from the smart ID
        const match = url.pathname.match(/^\/api\/(status|download|cancel)\/(.+)$/);
        if (match) {
          const action = match[1];
          const rawId = match[2];
          
          if (rawId.includes('--')) {
            // Smart ID format: base64Url--backendId
            const parts = rawId.split('--');
            targetBackend = atob(parts[0]);
            backendJobId = parts.slice(1).join('--');
            url.pathname = `/api/${action}/${backendJobId}`;
          } else {
            // Fallback for old IDs or sync render
            url.pathname = `/api/${action}/${rawId}`;
          }
        } else if (url.pathname === '/api/render-async' || url.pathname === '/api/render') {
          // New render request: Load balance strictly round-robin
          globalServerIndex = (globalServerIndex + 1) % backends.length;
          targetBackend = backends[globalServerIndex];
        }

        let targetUrlStr = targetBackend.replace(/\/$/, '') + url.pathname;
        if (url.search) targetUrlStr += url.search;
        const targetUrl = new URL(targetUrlStr);

        const fetchOptions: any = {
          method: request.method,
          headers: {
            'Content-Type': request.headers.get('Content-Type') || 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
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
              const b64Host = btoa(targetBackend);
              data.jobId = `${b64Host}--${data.jobId}`;
            }
            return new Response(JSON.stringify(data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return response;
        } catch (err: any) {
          console.error(`[Proxy] Failed to reach backend ${targetBackend}:`, err);
          return new Response(JSON.stringify({ error: 'Backend server unreachable', details: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error: any) {
      console.error(error);
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: "Backend error or timeout: " + (error.message || String(error)) }), {
          status: 502,
          headers: { "content-type": "application/json" }
        });
      }
      return brandedErrorResponse();
    }
  },
};
