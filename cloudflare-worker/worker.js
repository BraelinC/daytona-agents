/**
 * Cloudflare Worker - VNC Proxy
 *
 * Proxies requests to Daytona's VNC endpoints
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
        },
      });
    }

    // Get the path after the worker URL
    const pathParts = url.pathname.slice(1); // Remove leading /

    if (!pathParts || pathParts === '') {
      return new Response('VNC Proxy - Usage: /{daytona-host}/{path}?token=xxx', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Extract the Daytona host and path
    const firstSlash = pathParts.indexOf('/');
    let targetHost, targetPath;

    if (firstSlash === -1) {
      targetHost = pathParts;
      targetPath = '/';
    } else {
      targetHost = pathParts.slice(0, firstSlash);
      targetPath = pathParts.slice(firstSlash);
    }

    // If path doesn't contain a Daytona host (e.g., just /websockify),
    // try to extract it from the Referer header
    if (!targetHost.includes('.proxy.daytona.')) {
      const referer = request.headers.get('Referer');
      if (referer) {
        // Extract Daytona host from referer like:
        // https://vnc-proxy.../6080-xxx.proxy.daytona.works/vnc.html
        const refererUrl = new URL(referer);
        const refererPath = refererUrl.pathname.slice(1);
        const refererFirstSlash = refererPath.indexOf('/');
        const refererHost = refererFirstSlash === -1 ? refererPath : refererPath.slice(0, refererFirstSlash);

        if (refererHost.includes('.proxy.daytona.')) {
          console.log(`Extracted Daytona host from Referer: ${refererHost}`);
          targetHost = refererHost;
          targetPath = '/' + pathParts; // Original path becomes the target path
        }
      }
    }

    // Get the token from query params, or from Referer if not present
    let token = url.searchParams.get('token') || '';
    if (!token) {
      const referer = request.headers.get('Referer');
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          token = refererUrl.searchParams.get('token') || '';
        } catch (e) {}
      }
    }

    // Build the target URL using HTTPS (Daytona is behind Cloudflare)
    const targetUrl = `https://${targetHost}${targetPath}${url.search}`;

    console.log(`Proxying: ${request.url} -> ${targetUrl}`);
    console.log(`Token: ${token ? token.slice(0, 8) + '...' : 'none'}`);

    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      console.log('WebSocket upgrade request detected');

      // For WebSocket, proxy the upgrade request with bypass headers
      const wsHeaders = new Headers(request.headers);
      wsHeaders.set('X-Daytona-Skip-Preview-Warning', 'true');
      if (token) {
        wsHeaders.set('x-daytona-preview-token', token);
      }

      return fetch(targetUrl, {
        method: request.method,
        headers: wsHeaders,
      });
    }

    try {
      // Build headers with Daytona bypass
      const headers = {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
        'Accept': request.headers.get('Accept') || '*/*',
        'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
        'X-Daytona-Skip-Preview-Warning': 'true',
      };

      // Add token as header if present
      if (token) {
        headers['x-daytona-preview-token'] = token;
      }

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });

      // Clone response and add CORS headers
      const modifiedResponse = new Response(response.body, response);
      modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
      modifiedResponse.headers.delete('X-Frame-Options');
      modifiedResponse.headers.delete('Content-Security-Policy');

      return modifiedResponse;
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(`Proxy error: ${error.message}`, { status: 500 });
    }
  },
};
