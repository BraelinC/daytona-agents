# VNC Proxy Setup Guide

This guide explains how to embed Daytona VNC streams in a web application using a Cloudflare Worker proxy.

## The Problem

When embedding VNC from Daytona sandboxes into an HTTPS web app, you face several challenges:

1. **Mixed Content Blocking**: Browsers block HTTP content inside HTTPS pages
2. **CORS Restrictions**: Cross-origin requests are blocked by default
3. **Daytona Preview Warning**: Daytona shows an interstitial page for unauthenticated requests
4. **Cross-Origin Authentication**: Cookies don't work in cross-origin iframes (third-party cookie blocking)
5. **WebSocket Authentication**: WebSocket connections need tokens but browsers strip query params from cross-origin Referer headers

## The Solution: Cloudflare Worker Proxy

A Cloudflare Worker acts as an HTTPS-to-HTTPS proxy that:
- Serves content over HTTPS (no mixed content)
- Adds CORS headers
- Bypasses Daytona's preview warning with special headers
- Rewrites HTML/JS/CSS to inject auth tokens into all resource URLs
- Proxies WebSocket connections with proper authentication

## Architecture

```
Browser (HTTPS)
    │
    ▼
Vercel App (Next.js)
    │
    ▼ (iframe)
Cloudflare Worker (HTTPS proxy)
    │
    ▼
Daytona VNC (HTTPS)
```

## Setup Instructions

### 1. Create the Cloudflare Worker

Create `cloudflare-worker/worker.js`:

```javascript
/**
 * Cloudflare Worker - VNC Proxy
 * URL format: https://your-worker.workers.dev/{daytona-host}/{path}?token=xxx
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }

    // Extract Daytona host and path from URL
    const pathParts = url.pathname.slice(1);
    if (!pathParts) {
      return new Response('VNC Proxy - Usage: /{daytona-host}/{path}?token=xxx');
    }

    const firstSlash = pathParts.indexOf('/');
    let targetHost = firstSlash === -1 ? pathParts : pathParts.slice(0, firstSlash);
    let targetPath = firstSlash === -1 ? '/' : pathParts.slice(firstSlash);

    // If path doesn't contain Daytona host, extract from Referer
    if (!targetHost.includes('.proxy.daytona.')) {
      const referer = request.headers.get('Referer');
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          const refererPath = refererUrl.pathname.slice(1);
          const refererFirstSlash = refererPath.indexOf('/');
          const refererHost = refererFirstSlash === -1 ? refererPath : refererPath.slice(0, refererFirstSlash);
          if (refererHost.includes('.proxy.daytona.')) {
            targetHost = refererHost;
            targetPath = '/' + pathParts;
          }
        } catch (e) {}
      }
    }

    // Get token from URL query params or Referer
    let token = url.searchParams.get('token') || '';
    if (!token) {
      const referer = request.headers.get('Referer');
      if (referer) {
        try {
          token = new URL(referer).searchParams.get('token') || '';
        } catch (e) {}
      }
    }

    // Build target URL with token
    let targetSearch = url.search;
    if (token && !url.searchParams.has('token')) {
      targetSearch = targetSearch ? `${targetSearch}&token=${token}` : `?token=${token}`;
    }
    const targetUrl = `https://${targetHost}${targetPath}${targetSearch}`;

    // Handle WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader?.toLowerCase() === 'websocket') {
      const wsHeaders = new Headers();
      wsHeaders.set('Host', targetHost);
      wsHeaders.set('Upgrade', 'websocket');
      wsHeaders.set('Connection', 'Upgrade');
      wsHeaders.set('X-Daytona-Skip-Preview-Warning', 'true');

      // Copy WebSocket headers
      ['Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Protocol'].forEach(h => {
        const v = request.headers.get(h);
        if (v) wsHeaders.set(h, v);
      });

      if (token) wsHeaders.set('x-daytona-preview-token', token);

      return fetch(targetUrl, { headers: wsHeaders });
    }

    // Regular HTTP request
    const headers = {
      'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
      'Accept': request.headers.get('Accept') || '*/*',
      'X-Daytona-Skip-Preview-Warning': 'true',
    };
    if (token) headers['x-daytona-preview-token'] = token;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    });

    // Check content type for rewriting
    const contentType = response.headers.get('Content-Type') || '';
    const isHtml = contentType.includes('text/html');
    const isJs = contentType.includes('javascript') || targetPath.endsWith('.js');
    const isCss = contentType.includes('text/css') || targetPath.endsWith('.css');

    // Rewrite HTML/JS/CSS to inject token into all resource URLs
    if (token && (isHtml || isJs || isCss)) {
      let content = await response.text();

      if (isHtml) {
        // Add token to src/href attributes
        content = content.replace(
          /((?:src|href)=["'])(?!(?:https?:|data:|\/\/|#))([^"']+)(["'])/gi,
          (match, prefix, path, suffix) => {
            const sep = path.includes('?') ? '&' : '?';
            return `${prefix}${path}${sep}token=${token}${suffix}`;
          }
        );
      }

      if (isHtml || isCss) {
        // Handle CSS url() patterns
        content = content.replace(
          /(url\(["']?)(?!(?:https?:|data:|#))([^)"']+)(["']?\))/gi,
          (match, prefix, path, suffix) => {
            const sep = path.includes('?') ? '&' : '?';
            return `${prefix}${path}${sep}token=${token}${suffix}`;
          }
        );
      }

      if (isJs) {
        // Handle ES6 imports
        content = content.replace(
          /(from\s+["'])(?!(?:https?:|data:))([^"']+)(["'])/gi,
          (match, prefix, path, suffix) => {
            const sep = path.includes('?') ? '&' : '?';
            return `${prefix}${path}${sep}token=${token}${suffix}`;
          }
        );
      }

      const modifiedResponse = new Response(content, response);
      modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
      modifiedResponse.headers.delete('X-Frame-Options');
      modifiedResponse.headers.delete('Content-Security-Policy');
      return modifiedResponse;
    }

    // Pass through other responses
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.delete('X-Frame-Options');
    modifiedResponse.headers.delete('Content-Security-Policy');
    return modifiedResponse;
  },
};
```

Create `cloudflare-worker/wrangler.toml`:

```toml
name = "vnc-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"
```

### 2. Deploy the Worker

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

Note the deployed URL (e.g., `https://vnc-proxy.your-account.workers.dev`)

### 3. Configure Environment Variables

Add to `.env.local`:

```
NEXT_PUBLIC_VNC_PROXY_URL=https://vnc-proxy.your-account.workers.dev
```

### 4. Build the Proxied VNC URL

In your frontend code:

```typescript
const VNC_PROXY_URL = process.env.NEXT_PUBLIC_VNC_PROXY_URL || "";

function getProxiedVncUrl(vncUrl: string, token?: string | null): string {
  const host = vncUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const params = new URLSearchParams();

  if (token) params.set("token", token);
  params.set("autoconnect", "true");
  params.set("resize", "scale");

  // CRITICAL: Include token in WebSocket path for cross-origin auth
  const wsPath = token
    ? `${host}/websockify?token=${token}`
    : `${host}/websockify`;
  params.set("path", wsPath);

  return `${VNC_PROXY_URL}/${host}/vnc.html?${params.toString()}`;
}
```

### 5. Embed in iframe

```tsx
<iframe
  src={getProxiedVncUrl(sandbox.vncUrl, sandbox.vncToken)}
  className="w-full h-[400px] border-0"
  allow="clipboard-read; clipboard-write; fullscreen"
/>
```

## Key Technical Details

### Daytona Authentication Headers

Daytona requires these headers to bypass the preview warning:
- `X-Daytona-Skip-Preview-Warning: true`
- `x-daytona-preview-token: <token>` (for authenticated access)

Reference: https://daytona.io/docs/en/preview-and-authentication

### Why Token Must Be in WebSocket Path

The noVNC client uses a `path` query parameter to determine the WebSocket endpoint. When connecting from a cross-origin iframe:
- Cookies are blocked (third-party cookie restrictions)
- Referer headers may have query params stripped
- The ONLY reliable way to pass the token is in the WebSocket URL itself

By setting `path=host/websockify?token=xxx`, noVNC connects to:
```
wss://vnc-proxy.../host/websockify?token=xxx
```

The worker extracts the token from the URL and authenticates with Daytona.

### URL Rewriting

The worker rewrites HTML/JS/CSS to inject tokens into:
- `src="..."` and `href="..."` attributes in HTML
- `url(...)` references in CSS
- `import ... from "..."` statements in JavaScript

This ensures ALL resources (scripts, styles, images, fonts) include the auth token.

## Troubleshooting

### 400 Bad Request on resources
Token not being passed. Check that HTML rewriting is working.

### WebSocket connection closed (1006)
Token not in WebSocket URL. Verify the `path` parameter includes `?token=xxx`.

### Preview warning page appears
Missing `X-Daytona-Skip-Preview-Warning` header or invalid token.

### Mixed content errors
Make sure you're using HTTPS URLs for both the worker and Daytona.

## Files Reference

- `cloudflare-worker/worker.js` - The proxy worker
- `cloudflare-worker/wrangler.toml` - Wrangler config
- `src/app/vnc/page.tsx` - VNC viewer page
- `src/app/page.tsx` - Main page with embedded iframes
