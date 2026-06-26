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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      
      // -- PROXY ARCHITECTURE: Intercept Studio Mode API requests at the Edge --
      if ((url.pathname === '/api/render' || url.pathname.startsWith('/api/cancel')) && request.method === 'POST') {
        let apiKey = (env as any)?.STUDIO_API_KEY || (typeof process !== 'undefined' ? process.env?.STUDIO_API_KEY : undefined);
        
        // Local Dev Fallback: If Vite didn't inject it, read it directly from .env (only works in local Node.js environment)
        if (!apiKey && typeof process !== 'undefined') {
          try {
            const fs = await import('fs');
            const envFile = fs.readFileSync('.env', 'utf-8');
            const match = envFile.match(/STUDIO_API_KEY\s*=\s*"?([^"\n]+)"?/);
            if (match) apiKey = match[1];
          } catch (e) {
            // Ignore if in production edge environment where fs doesn't exist
          }
        }
        
        // Aggressively strip any surrounding quotes and whitespace/carriage returns
        if (apiKey) {
          apiKey = apiKey.replace(/^["']|["']$/g, '').trim();
        }
        
        console.log(`[Proxy] Final API Key to send: [${apiKey}]`);
        const backendStr = (env as any)?.VITE_STUDIO_BACKEND_URL || (typeof process !== 'undefined' ? process.env?.VITE_STUDIO_BACKEND_URL : undefined);
        
        const backendBase = backendStr || "https://vedavyas1235-animateit.hf.space";
        const targetUrl = new URL(url.pathname, backendBase.replace(/\/api\/(render|cancel)$/, ''));

        const fetchOptions: any = {
          method: 'POST',
          headers: {
            'Content-Type': request.headers.get('Content-Type') || 'application/json',
            ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
          },
          body: request.body, // Stream the body directly
          // @ts-ignore - duplex is needed in some node-fetch environments for streaming bodies
          duplex: 'half'
        };

        // Node 18+ undici fetch has a default 5-minute headersTimeout which kills long CPU renders.
        // We dynamically import undici to override it to 1 hour (3600000 ms)
        if (typeof process !== 'undefined') {
          try {
            const { Agent } = await import('undici');
            fetchOptions.dispatcher = new Agent({ headersTimeout: 3600000, bodyTimeout: 3600000 });
          } catch(e) {
            console.warn("Could not load undici to override fetch timeout");
          }
        }

        // Forward the request
        return await fetch(targetUrl.toString(), fetchOptions);
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
