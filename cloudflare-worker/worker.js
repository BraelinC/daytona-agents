/**
 * Cloudflare Worker - VNC Proxy
 *
 * Proxies HTTP and WebSocket requests from HTTPS to HTTP
 * This allows embedding Daytona's VNC in an HTTPS page
 *
 * URL format: https://your-worker.workers.dev/{daytona-url-without-protocol}
 * Example: https://your-worker.workers.dev/6080-xxx.proxy.daytona.works/vnc.html?token=xxx
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
    // e.g., /6080-xxx.proxy.daytona.works/vnc.html -> 6080-xxx.proxy.daytona.works/vnc.html
    const pathParts = url.pathname.slice(1); // Remove leading /

    if (!pathParts || pathParts === '') {
      return new Response('VNC Proxy - Usage: /{daytona-host}/{path}', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Extract the Daytona host and path
    // pathParts = "6080-xxx.proxy.daytona.works/vnc.html"
    const firstSlash = pathParts.indexOf('/');
    let targetHost, targetPath;

    if (firstSlash === -1) {
      targetHost = pathParts;
      targetPath = '/';
    } else {
      targetHost = pathParts.slice(0, firstSlash);
      targetPath = pathParts.slice(firstSlash);
    }

    // Build the target URL (HTTP, not HTTPS)
    const targetUrl = `http://${targetHost}${targetPath}${url.search}`;

    console.log(`Proxying: ${request.url} -> ${targetUrl}`);

    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      // WebSocket proxy - Cloudflare handles this automatically
      console.log('WebSocket upgrade request detected');

      // For WebSocket, we need to use the fetch API which handles upgrades
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
      });

      return response;
    }

    // Regular HTTP proxy
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });

    const response = await fetch(modifiedRequest);

    // Clone response and add CORS headers
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    modifiedResponse.headers.set('Access-Control-Allow-Headers', '*');

    // Remove X-Frame-Options to allow embedding in iframe
    modifiedResponse.headers.delete('X-Frame-Options');
    modifiedResponse.headers.delete('Content-Security-Policy');

    return modifiedResponse;
  },
};
