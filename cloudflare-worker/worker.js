/**
 * Cloudflare Worker - VNC Proxy
 *
 * Proxies requests to Daytona's VNC endpoints
 * URL format: https://your-worker.workers.dev/{daytona-host}/{path}
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
      return new Response('VNC Proxy - Usage: /{daytona-host}/{path}', {
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

    // Build the target URL using HTTPS (Daytona is behind Cloudflare)
    const targetUrl = `https://${targetHost}${targetPath}${url.search}`;

    console.log(`Proxying: ${request.url} -> ${targetUrl}`);

    try {
      // Simple fetch - let Cloudflare handle headers automatically
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0',
          'Accept': request.headers.get('Accept') || '*/*',
          'Accept-Language': request.headers.get('Accept-Language') || 'en-US,en;q=0.9',
          'Cookie': 'daytona_preview_accepted=true',
        },
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
