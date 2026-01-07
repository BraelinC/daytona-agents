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
          'Access-Control-Allow-Credentials': 'true',
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
        try {
          const refererUrl = new URL(referer);
          const refererPath = refererUrl.pathname.slice(1);
          const refererFirstSlash = refererPath.indexOf('/');
          const refererHost = refererFirstSlash === -1 ? refererPath : refererPath.slice(0, refererFirstSlash);

          if (refererHost.includes('.proxy.daytona.')) {
            console.log(`Extracted Daytona host from Referer: ${refererHost}`);
            targetHost = refererHost;
            targetPath = '/' + pathParts;
          }
        } catch (e) {}
      }
    }

    // Get token from multiple sources (priority order):
    // 1. URL query param
    // 2. Cookie (for cross-origin requests where Referer is stripped)
    // 3. Referer URL query param
    let token = url.searchParams.get('token') || '';
    let tokenFromCookie = false;

    if (!token) {
      // Try to get from cookie
      const cookies = request.headers.get('Cookie') || '';
      const tokenMatch = cookies.match(/daytona_token_([^=]+)=([^;]+)/);
      if (tokenMatch && tokenMatch[1] === targetHost.split('.')[0]) {
        token = tokenMatch[2];
        tokenFromCookie = true;
        console.log(`Token from cookie: ${token.slice(0, 8)}...`);
      }
    }

    if (!token) {
      // Try Referer (may be stripped by cross-origin policy)
      const referer = request.headers.get('Referer');
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          token = refererUrl.searchParams.get('token') || '';
        } catch (e) {}
      }
    }

    // Build the target URL using HTTPS
    // Always append token to URL (Daytona requires it for all requests)
    let targetSearch = url.search;
    if (token && !url.searchParams.has('token')) {
      targetSearch = targetSearch ? `${targetSearch}&token=${token}` : `?token=${token}`;
    }
    const targetUrl = `https://${targetHost}${targetPath}${targetSearch}`;

    console.log(`Proxying: ${request.url} -> ${targetUrl}`);
    console.log(`Token: ${token ? token.slice(0, 8) + '...' : 'none'} (from ${tokenFromCookie ? 'cookie' : 'url/referer'})`);

    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      console.log('WebSocket upgrade request detected');
      console.log(`WebSocket target: ${targetUrl}`);
      console.log(`WebSocket token: ${token ? token.slice(0, 8) + '...' : 'NONE'}`);

      try {
        const wsHeaders = new Headers();
        // Copy essential headers for WebSocket
        wsHeaders.set('Host', targetHost);
        wsHeaders.set('Upgrade', 'websocket');
        wsHeaders.set('Connection', 'Upgrade');
        wsHeaders.set('X-Daytona-Skip-Preview-Warning', 'true');

        // Copy WebSocket-specific headers
        const wsKey = request.headers.get('Sec-WebSocket-Key');
        const wsVersion = request.headers.get('Sec-WebSocket-Version');
        const wsProtocol = request.headers.get('Sec-WebSocket-Protocol');
        if (wsKey) wsHeaders.set('Sec-WebSocket-Key', wsKey);
        if (wsVersion) wsHeaders.set('Sec-WebSocket-Version', wsVersion);
        if (wsProtocol) wsHeaders.set('Sec-WebSocket-Protocol', wsProtocol);

        if (token) {
          wsHeaders.set('x-daytona-preview-token', token);
        }

        const wsResponse = await fetch(targetUrl, {
          headers: wsHeaders,
        });

        console.log(`WebSocket response status: ${wsResponse.status}`);

        if (wsResponse.status === 101) {
          console.log('WebSocket upgrade successful');
        } else {
          console.log(`WebSocket upgrade failed: ${await wsResponse.text()}`);
        }

        return wsResponse;
      } catch (err) {
        console.error('WebSocket proxy error:', err.message);
        return new Response(`WebSocket proxy error: ${err.message}`, { status: 500 });
      }
    }

    try {
      const headers = {
        'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
        'Accept': request.headers.get('Accept') || '*/*',
        'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
        'X-Daytona-Skip-Preview-Warning': 'true',
      };

      if (token) {
        headers['x-daytona-preview-token'] = token;
      }

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });

      // Check content type for rewriting
      const contentType = response.headers.get('Content-Type') || '';
      const isHtml = contentType.includes('text/html');
      const isJs = contentType.includes('javascript') || targetPath.endsWith('.js');
      const isCss = contentType.includes('text/css') || targetPath.endsWith('.css');

      // Rewrite HTML, JS, and CSS to inject token into resource URLs
      if (token && (isHtml || isJs || isCss)) {
        let content = await response.text();

        if (isHtml) {
          // Add token to relative script/link/img URLs
          content = content.replace(
            /((?:src|href)=["'])(?!(?:https?:|data:|\/\/|#))([^"']+)(["'])/gi,
            (match, prefix, path, suffix) => {
              const separator = path.includes('?') ? '&' : '?';
              return `${prefix}${path}${separator}token=${token}${suffix}`;
            }
          );
        }

        if (isHtml || isCss) {
          // Handle CSS url() patterns
          content = content.replace(
            /(url\(["']?)(?!(?:https?:|data:))([^)"']+)(["']?\))/gi,
            (match, prefix, path, suffix) => {
              if (path.startsWith('#')) return match; // Skip SVG references
              const separator = path.includes('?') ? '&' : '?';
              return `${prefix}${path}${separator}token=${token}${suffix}`;
            }
          );
        }

        if (isJs) {
          // Handle ES6 imports: import ... from './path.js' and import('./path.js')
          content = content.replace(
            /((?:from|import)\s*\(\s*["'])(?!(?:https?:|data:))([^"']+)(["'])/gi,
            (match, prefix, path, suffix) => {
              const separator = path.includes('?') ? '&' : '?';
              return `${prefix}${path}${separator}token=${token}${suffix}`;
            }
          );
          // Handle: from "./path.js"
          content = content.replace(
            /(from\s+["'])(?!(?:https?:|data:))([^"']+)(["'])/gi,
            (match, prefix, path, suffix) => {
              const separator = path.includes('?') ? '&' : '?';
              return `${prefix}${path}${separator}token=${token}${suffix}`;
            }
          );
        }

        console.log(`Rewrote ${isHtml ? 'HTML' : isJs ? 'JS' : 'CSS'} to inject token`);

        const modifiedResponse = new Response(content, {
          status: response.status,
          headers: response.headers,
        });
        modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
        modifiedResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        modifiedResponse.headers.delete('X-Frame-Options');
        modifiedResponse.headers.delete('Content-Security-Policy');
        return modifiedResponse;
      }

      // For non-HTML responses, just pass through
      const modifiedResponse = new Response(response.body, response);
      modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
      modifiedResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      modifiedResponse.headers.delete('X-Frame-Options');
      modifiedResponse.headers.delete('Content-Security-Policy');

      return modifiedResponse;
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(`Proxy error: ${error.message}`, { status: 500 });
    }
  },
};
